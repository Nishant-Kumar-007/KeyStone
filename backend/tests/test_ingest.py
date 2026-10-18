import pytest
from backend.app.ingest.cyclonedx import cyclonedx_ingester
from backend.app.ingest.cache import disk_cache
from backend.app.graph.client import db_manager


@pytest.mark.asyncio
async def test_ingest_log4j_sbom():
    workspace_id = "test_ingest_log4j"
    data = disk_cache.load_fixture("log4j_cyclonedx.json")
    result = await cyclonedx_ingester.ingest_sbom(workspace_id, data)
    
    assert result["components_count"] == 5
    assert result["vulnerabilities_count"] >= 1
    assert result["project_name"] == "enterprise-order-service"
    
    # Verify nodes in FalkorDB
    graph = db_manager.select_graph(workspace_id)
    res = graph.ro_query("MATCH (c:Component {name: 'log4j-core'})-[:AFFECTED_BY]->(v:Vulnerability) RETURN v.id")
    cve_ids = [row[0] for row in res.result_set]
    assert "CVE-2021-44228" in cve_ids
    
    db_manager.delete_graph(workspace_id)


@pytest.mark.asyncio
async def test_ingest_clean_sbom():
    workspace_id = "test_ingest_clean"
    data = disk_cache.load_fixture("clean_project_cyclonedx.json")
    result = await cyclonedx_ingester.ingest_sbom(workspace_id, data)
    
    assert result["components_count"] == 1
    assert result["vulnerabilities_count"] == 0
    
    graph = db_manager.select_graph(workspace_id)
    res = graph.ro_query("MATCH (v:Vulnerability) RETURN count(v)")
    assert res.result_set[0][0] == 0
    
    db_manager.delete_graph(workspace_id)
