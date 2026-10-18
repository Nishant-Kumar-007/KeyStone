from mcp.server.fastmcp import FastMCP
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

# Initialize official FastMCP server
mcp = FastMCP("keystone-graph-agent")


@mcp.tool()
def graph_schema(workspace_id: str = "demo_workspace") -> dict:
    """Inspects the current FalkorDB graph schema, node labels, and relationship types."""
    return mcp_tool_registry.graph_schema(workspace_id)


@mcp.tool()
async def ingest_source(
    workspace_id: str,
    source_type: str,
    payload: str,
    project_name: str = None
) -> dict:
    """Ingests a Package URL (purl) or CycloneDX SBOM JSON string into the workspace graph."""
    params = IngestSourceInput(
        workspace_id=workspace_id,
        source_type=source_type,
        payload=payload,
        project_name=project_name
    )
    return await mcp_tool_registry.ingest_source(params)


@mcp.tool()
def list_findings(
    workspace_id: str = "demo_workspace",
    severity: str = None,
    kev_only: bool = False,
    limit: int = 50
) -> list[dict]:
    """Queries vulnerability findings grouped by severity and CISA KEV exploitation status."""
    params = ListFindingsInput(
        workspace_id=workspace_id,
        severity=severity,
        kev_only=kev_only,
        limit=limit
    )
    return mcp_tool_registry.list_findings(params)


@mcp.tool()
def explain_finding(workspace_id: str, finding_id: str) -> dict:
    """Computes the shortest path from project root to the vulnerable package with risk breakdown."""
    params = ExplainFindingInput(
        workspace_id=workspace_id,
        finding_id=finding_id
    )
    return mcp_tool_registry.explain_finding(params)


@mcp.tool()
def blast_radius(
    workspace_id: str,
    finding_id: str = None,
    component_purl: str = None
) -> dict:
    """Analyzes cross-project blast radius and accountable owners for a component or CVE."""
    params = BlastRadiusInput(
        workspace_id=workspace_id,
        finding_id=finding_id,
        component_purl=component_purl
    )
    return mcp_tool_registry.blast_radius(params)


@mcp.tool()
def keystone_components(workspace_id: str, limit: int = 10) -> list[dict]:
    """Ranks critical dependency bottlenecks by upstream reach and vulnerable descendant count."""
    params = KeystoneComponentsInput(
        workspace_id=workspace_id,
        limit=limit
    )
    return mcp_tool_registry.keystone_components(params)


@mcp.tool()
def plan_remediation(workspace_id: str) -> dict:
    """Calculates fix leverage via greedy set cover to find minimal direct upgrades covering maximum risk."""
    params = PlanRemediationInput(
        workspace_id=workspace_id
    )
    return mcp_tool_registry.plan_remediation(params)


@mcp.tool()
async def simulate_upgrade(
    workspace_id: str,
    current_purl: str,
    target_version: str
) -> dict:
    """Runs a what-if upgrade test using FalkorDB GRAPH.COPY cloning to prove risk reduction."""
    params = SimulateUpgradeInput(
        workspace_id=workspace_id,
        current_purl=current_purl,
        target_version=target_version
    )
    return await mcp_tool_registry.simulate_upgrade(params)


@mcp.tool()
def propose_action(
    workspace_id: str,
    recommendation_id: str,
    target_purl: str,
    recommended_version: str,
    action_type: str = "CREATE_ISSUE"
) -> dict:
    """Creates a PROPOSED remediation ticket. The model cannot approve; human approval is required."""
    params = ProposeActionInput(
        workspace_id=workspace_id,
        recommendation_id=recommendation_id,
        action_type=action_type,
        target_purl=target_purl,
        recommended_version=recommended_version
    )
    return mcp_tool_registry.propose_action(params)


@mcp.tool()
def record_decision(
    workspace_id: str,
    vulnerability_id: str,
    decision_type: str,
    reason: str,
    created_by: str = "security-engineer"
) -> dict:
    """Persists an accepted-risk or false-positive decision to suppress or contextualize alerts."""
    params = RecordDecisionInput(
        workspace_id=workspace_id,
        vulnerability_id=vulnerability_id,
        decision_type=decision_type,
        reason=reason,
        created_by=created_by
    )
    return mcp_tool_registry.record_decision(params)


@mcp.tool()
def run_readonly_cypher(
    workspace_id: str,
    query: str,
    parameters: dict = None
) -> dict:
    """Executes safe, parameterised read-only OpenCypher queries against FalkorDB."""
    params = RunReadOnlyCypherInput(
        workspace_id=workspace_id,
        query=query,
        parameters=parameters or {}
    )
    return mcp_tool_registry.run_readonly_cypher(params)


if __name__ == "__main__":
    mcp.run()
