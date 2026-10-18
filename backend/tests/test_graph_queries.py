import pytest
from backend.app.ingest.cyclonedx import cyclonedx_ingester
from backend.app.ingest.cache import disk_cache
from backend.app.graph.client import db_manager
from backend.app.graph.queries import graph_queries


@pytest.fixture(scope="module")
def setup_workspace():
    workspace_id = "test_queries_suite"
    data = disk_cache.load_fixture("log4j_cyclonedx.json")
    import asyncio
    asyncio.run(cyclonedx_ingester.ingest_sbom(workspace_id, data))
    yield workspace_id
    db_manager.delete_graph(workspace_id)


def test_explain_finding(setup_workspace):
    res = graph_queries.explain_finding(setup_workspace, "CVE-2021-44228")
    assert "error" not in res
    assert res["finding_id"] == "CVE-2021-44228"
    assert len(res["paths"]) >= 1
    assert res["paths"][0]["depth"] == 4
    
    # Path node names
    names = [n["name"] for n in res["paths"][0]["nodes"]]
    assert "enterprise-order-service" in names
    assert "log4j-core" in names
    
    # Risk breakdown
    risk = res["risk_assessment"]
    assert risk["tier"] in ("CRITICAL", "HIGH")
    assert risk["breakdown"]["is_kev"] is True
    assert "call-graph reachability" in risk["disclaimer"]


def test_blast_radius(setup_workspace):
    res = graph_queries.blast_radius(setup_workspace, finding_id="CVE-2021-44228")
    assert res["total_exposed_projects"] >= 1
    assert len(res["affected_owners"]) >= 1
    assert res["exposed_projects"][0]["project_name"] == "enterprise-order-service"


def test_keystone_components(setup_workspace):
    keystones = graph_queries.keystone_components(setup_workspace, limit=5)
    assert len(keystones) >= 1
    names = [k["name"] for k in keystones]
    assert "spring-boot-starter-logging" in names or "spring-boot-starter-web" in names


def test_plan_remediation(setup_workspace):
    plan = graph_queries.plan_remediation(setup_workspace)
    assert plan["total_vulnerabilities"] >= 1
    assert plan["batches_count"] >= 1
    assert plan["potential_risk_reduction_pct"] > 50.0


def test_list_findings(setup_workspace):
    findings = graph_queries.list_findings(setup_workspace)
    assert len(findings) >= 2
    cve_ids = [f["id"] for f in findings]
    assert "CVE-2021-44228" in cve_ids
    assert "CVE-2021-45046" in cve_ids
    assert findings[0]["kev"] is True


def test_workspace_summary(setup_workspace):
    summary = graph_queries.get_workspace_summary(setup_workspace)
    assert summary["total_projects"] == 1
    assert summary["total_components"] == 5
    assert summary["total_vulnerabilities"] == 2
    assert summary["kev_vulnerabilities_count"] == 2
