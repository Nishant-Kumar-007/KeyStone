from typing import Optional, Any
from pydantic import BaseModel, Field


class GraphSchemaOutput(BaseModel):
    node_labels: list[str]
    relationship_types: list[str]
    total_nodes: int
    total_edges: int
    indexes: list[str]


class IngestSourceInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace ID for graph isolation")
    source_type: str = Field(..., description="Type of source: 'purl' or 'cyclonedx'")
    payload: str = Field(..., description="Package URL or CycloneDX JSON string")
    project_name: Optional[str] = Field(None, description="Optional override name for project")


class IngestSourceOutput(BaseModel):
    workspace_id: str
    project_id: str
    project_name: str
    components_count: int
    direct_dependencies_count: int
    vulnerabilities_count: int


class ListFindingsInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace ID")
    severity: Optional[str] = Field(None, description="Filter by severity: CRITICAL, HIGH, MEDIUM, LOW")
    kev_only: bool = Field(False, description="Filter only known-exploited vulnerabilities")
    limit: int = Field(50, description="Max results")


class ExplainFindingInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace ID")
    finding_id: str = Field(..., description="Vulnerability CVE or GHSA ID")


class BlastRadiusInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace ID")
    finding_id: Optional[str] = Field(None, description="Vulnerability ID to check blast radius")
    component_purl: Optional[str] = Field(None, description="Component purl to check blast radius")


class KeystoneComponentsInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace ID")
    limit: int = Field(10, description="Top N keystone libraries")


class PlanRemediationInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace ID")


class SimulateUpgradeInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace ID")
    current_purl: str = Field(..., description="Current vulnerable component purl")
    target_version: str = Field(..., description="Target upgrade version")


class ProposeActionInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace ID")
    recommendation_id: str = Field(..., description="ID of recommended batch (e.g. batch_1)")
    action_type: str = Field("CREATE_ISSUE", description="CREATE_ISSUE or DRAFT_PR")
    target_purl: str = Field(..., description="PURL being patched")
    recommended_version: str = Field(..., description="Target version to update to")


class RecordDecisionInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace ID")
    vulnerability_id: str = Field(..., description="CVE or GHSA ID")
    decision_type: str = Field(..., description="ACCEPTED_RISK or FALSE_POSITIVE")
    reason: str = Field(..., description="Human justification for triage decision")
    created_by: str = Field("security-engineer", description="User or role creating decision")


class RunReadOnlyCypherInput(BaseModel):
    workspace_id: str = Field(..., description="Workspace ID")
    query: str = Field(..., description="Parameterised read-only Cypher query")
    parameters: Optional[dict[str, Any]] = Field(default_factory=dict, description="Query parameters")
