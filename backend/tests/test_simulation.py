import pytest
from backend.app.ingest.cyclonedx import cyclonedx_ingester
from backend.app.ingest.cache import disk_cache
from backend.app.graph.client import db_manager
from backend.app.graph.simulation import whatif_simulator


@pytest.mark.asyncio
async def test_whatif_simulation_log4j():
    workspace_id = "test_sim_ws"
    data = disk_cache.load_fixture("log4j_cyclonedx.json")
    await cyclonedx_ingester.ingest_sbom(workspace_id, data)
    
    # Simulate upgrade of log4j-core to 2.17.1
    current_purl = "pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1"
    target_version = "2.17.1"
    
    sim_res = await whatif_simulator.simulate_upgrade(
        workspace_id=workspace_id,
        current_purl=current_purl,
        target_version=target_version
    )
    
    assert sim_res["verified"] is True
    assert "CVE-2021-44228" in sim_res["resolved_vulnerabilities"]
    assert "CVE-2021-45046" in sim_res["resolved_vulnerabilities"]
    assert len(sim_res["newly_introduced_vulnerabilities"]) == 0
    assert sim_res["net_risk_reduction_pct"] == 100.0
    assert "PROCEED" in sim_res["recommendation_verdict"]
    
    # Verify original workspace graph was not modified
    graph = db_manager.select_graph(workspace_id)
    orig_res = graph.ro_query("MATCH (c:Component {name: 'log4j-core'}) RETURN c.version")
    assert orig_res.result_set[0][0] == "2.14.1"
    
    db_manager.delete_graph(workspace_id)
