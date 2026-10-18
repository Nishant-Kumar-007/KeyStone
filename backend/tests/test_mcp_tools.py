import pytest
from backend.app.ingest.cyclonedx import cyclonedx_ingester
from backend.app.ingest.cache import disk_cache
from backend.app.graph.client import db_manager
from backend.app.mcp_server.tools import mcp_tool_registry
from backend.app.mcp_server.models import (
    IngestSourceInput,
    ListFindingsInput,
    ExplainFindingInput,
    BlastRadiusInput,
    KeystoneComponentsInput,
    PlanRemediationInput,
    SimulateUpgradeInput,
    ProposeActionInput,
    RecordDecisionInput,
    RunReadOnlyCypherInput
)


@pytest.fixture(scope="module")
def seeded_mcp_workspace():
    workspace_id = "test_mcp_tools_ws"
    data = disk_cache.load_fixture("log4j_cyclonedx.json")
    import asyncio
    asyncio.run(cyclonedx_ingester.ingest_sbom(workspace_id, data))
    yield workspace_id
    db_manager.delete_graph(workspace_id)


def test_mcp_graph_schema(seeded_mcp_workspace):
    schema = mcp_tool_registry.graph_schema(seeded_mcp_workspace)
    assert "Component" in schema["node_labels"]
    assert "Vulnerability" in schema["node_labels"]
    assert schema["total_nodes"] >= 5


def test_mcp_explain_finding(seeded_mcp_workspace):
    res = mcp_tool_registry.explain_finding(
        ExplainFindingInput(workspace_id=seeded_mcp_workspace, finding_id="CVE-2021-44228")
    )
    assert res["finding_id"] == "CVE-2021-44228"
    assert len(res["paths"]) >= 1


def test_mcp_propose_action_requires_human_approval(seeded_mcp_workspace):
    res = mcp_tool_registry.propose_action(
        ProposeActionInput(
            workspace_id=seeded_mcp_workspace,
            recommendation_id="batch_1",
            target_purl="pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1",
            recommended_version="2.17.1"
        )
    )
    assert res["status"] == "PROPOSED"
    assert res["requires_human_approval"] is True
    assert "KEYSTONE Security Fix" in res["preview_markdown"]


def test_mcp_record_decision(seeded_mcp_workspace):
    res = mcp_tool_registry.record_decision(
        RecordDecisionInput(
            workspace_id=seeded_mcp_workspace,
            vulnerability_id="CVE-2021-44228",
            decision_type="ACCEPTED_RISK",
            reason="WAF rule active in production"
        )
    )
    assert res["status"] == "RECORDED"
    assert res["decision_type"] == "ACCEPTED_RISK"


def test_mcp_run_readonly_cypher_security(seeded_mcp_workspace):
    # Allowed read-only query
    res = mcp_tool_registry.run_readonly_cypher(
        RunReadOnlyCypherInput(
            workspace_id=seeded_mcp_workspace,
            query="MATCH (c:Component) RETURN c.name, c.version LIMIT 3"
        )
    )
    assert "error" not in res
    assert len(res["rows"]) <= 3

    # Disallowed write query
    res_bad = mcp_tool_registry.run_readonly_cypher(
        RunReadOnlyCypherInput(
            workspace_id=seeded_mcp_workspace,
            query="CREATE (n:HackedNode)"
        )
    )
    assert "Disallowed write keyword" in res_bad.get("error", "")
