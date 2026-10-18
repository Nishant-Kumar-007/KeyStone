import json
from fastapi import FastAPI, HTTPException, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from backend.app.config import settings
from backend.app.graph.client import db_manager
from backend.app.graph.queries import graph_queries
from backend.app.graph.simulation import whatif_simulator
from backend.app.ingest.cyclonedx import cyclonedx_ingester
from backend.app.ingest.purl_resolver import purl_resolver
from backend.app.agent.loop import agent_loop
from backend.app.agent.auto_triage import auto_triage_engine
from backend.app.mcp_server.tools import mcp_tool_registry
from backend.app.mcp_server.models import ProposeActionInput, RecordDecisionInput

app = FastAPI(
    title="KEYSTONE Graph Agent Backend",
    description="Graph-Native Software Vulnerability Remediation Agent powered by FalkorDB",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def healthcheck():
    is_healthy = db_manager.is_healthy()
    if not is_healthy:
        raise HTTPException(status_code=503, detail="FalkorDB is unreachable.")
    return {"status": "ok", "graph_database": "FalkorDB", "healthy": True}


@app.post("/api/ingest")
async def ingest_source(payload: dict = Body(...)):
    workspace_id = payload.get("workspace_id", settings.workspace_default_id)
    source_type = payload.get("source_type", "purl")
    data = payload.get("payload", "")
    project_name = payload.get("project_name")

    if source_type == "purl":
        sbom = await purl_resolver.resolve_purl(data)
    else:
        sbom = data

    result = await cyclonedx_ingester.ingest_sbom(
        workspace_id=workspace_id,
        sbom_data=sbom,
        project_override_name=project_name
    )
    return result


@app.post("/api/demo/load")
async def load_demo_fixture(payload: dict = Body(...)):
    fixture_key = payload.get("fixture", "log4j")
    workspace_id = payload.get("workspace_id", settings.workspace_default_id)
    mapping = {
        "log4j": "log4j_cyclonedx.json",
        "spring4shell": "spring4shell_cyclonedx.json",
        "axios": "axios_cyclonedx.json",
        "clean": "clean_project_cyclonedx.json",
    }
    filename = mapping.get(fixture_key, "log4j_cyclonedx.json")
    path = settings.fixtures_dir / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Fixture {filename} not found")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    result = await cyclonedx_ingester.ingest_sbom(
        workspace_id=workspace_id,
        sbom_data=data
    )
    return {"status": "ok", "fixture": fixture_key, "workspace_id": workspace_id, "ingested": result}


@app.post("/api/workspace/{workspace_id}/reset")
def reset_workspace(workspace_id: str):
    db_manager.delete_graph(workspace_id)
    return {"status": "ok", "message": f"Workspace {workspace_id} reset successfully"}


@app.get("/api/workspace/{workspace_id}/summary")
def get_summary(workspace_id: str):
    return graph_queries.get_workspace_summary(workspace_id)


@app.get("/api/workspace/{workspace_id}/findings")
def list_findings(workspace_id: str, severity: str = None, kev_only: bool = False, limit: int = 50):
    return graph_queries.list_findings(workspace_id, severity=severity, kev_only=kev_only, limit=limit)


@app.get("/api/workspace/{workspace_id}/findings/{finding_id}")
def explain_finding(workspace_id: str, finding_id: str):
    return graph_queries.explain_finding(workspace_id, finding_id)


@app.get("/api/workspace/{workspace_id}/blast-radius")
def blast_radius(workspace_id: str, finding_id: str = None, purl: str = None):
    return graph_queries.blast_radius(workspace_id, finding_id=finding_id, purl=purl)


@app.get("/api/workspace/{workspace_id}/keystones")
def keystone_components(workspace_id: str, limit: int = 10):
    return graph_queries.keystone_components(workspace_id, limit=limit)


@app.get("/api/workspace/{workspace_id}/remediation")
def plan_remediation(workspace_id: str):
    return graph_queries.plan_remediation(workspace_id)


@app.post("/api/workspace/{workspace_id}/simulate")
async def simulate_upgrade(workspace_id: str, payload: dict = Body(...)):
    current_purl = payload.get("current_purl")
    target_version = payload.get("target_version")
    if not current_purl or not target_version:
        raise HTTPException(status_code=400, detail="current_purl and target_version are required")
    return await whatif_simulator.simulate_upgrade(workspace_id, current_purl, target_version)


@app.post("/api/workspace/{workspace_id}/actions/propose")
def propose_action(workspace_id: str, payload: dict = Body(...)):
    input_data = ProposeActionInput(
        workspace_id=workspace_id,
        recommendation_id=payload.get("recommendation_id", "batch_1"),
        action_type=payload.get("action_type", "CREATE_ISSUE"),
        target_purl=payload.get("target_purl"),
        recommended_version=payload.get("recommended_version")
    )
    return mcp_tool_registry.propose_action(input_data)


@app.get("/api/workspace/{workspace_id}/actions")
def list_actions(workspace_id: str):
    graph = db_manager.select_graph(workspace_id)
    res = graph.ro_query(
        """
        MATCH (a:Action)
        RETURN a.id, a.type, a.status, a.target_purl, a.recommended_version, a.preview_markdown, a.created_at
        ORDER BY a.created_at DESC
        """
    )
    actions = []
    for r in res.result_set:
        actions.append({
            "id": r[0],
            "type": r[1],
            "status": r[2],
            "target_purl": r[3],
            "recommended_version": r[4],
            "preview_markdown": r[5],
            "created_at": r[6]
        })
    return actions


@app.post("/api/workspace/{workspace_id}/actions/{action_id}/approve")
def approve_action(workspace_id: str, action_id: str):
    import datetime
    approved_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
    graph = db_manager.select_graph(workspace_id)
    res = graph.query(
        """
        MATCH (a:Action {id: $action_id})
        SET a.status = 'APPROVED', a.approved_at = $approved_at
        RETURN a.id, a.type, a.target_purl, a.recommended_version
        """,
        {"action_id": action_id, "approved_at": approved_at}
    )
    if not res.result_set:
        raise HTTPException(status_code=404, detail="Action not found")
    
    row = res.result_set[0]
    return {
        "status": "APPROVED",
        "action_id": row[0],
        "message": f"Action approved. Patch drafted for {row[2]} -> {row[3]}."
    }


@app.post("/api/workspace/{workspace_id}/actions/{action_id}/reject")
def reject_action(workspace_id: str, action_id: str):
    graph = db_manager.select_graph(workspace_id)
    res = graph.query(
        """
        MATCH (a:Action {id: $action_id})
        SET a.status = 'REJECTED'
        RETURN a.id
        """,
        {"action_id": action_id}
    )
    if not res.result_set:
        raise HTTPException(status_code=404, detail="Action not found")
    return {"status": "REJECTED", "action_id": action_id}


@app.post("/api/workspace/{workspace_id}/decisions")
def record_decision(workspace_id: str, payload: dict = Body(...)):
    input_data = RecordDecisionInput(
        workspace_id=workspace_id,
        vulnerability_id=payload.get("vulnerability_id"),
        decision_type=payload.get("decision_type", "ACCEPTED_RISK"),
        reason=payload.get("reason", "Accepted by security team"),
        created_by=payload.get("created_by", "security-engineer")
    )
    return mcp_tool_registry.record_decision(input_data)


@app.get("/api/workspace/{workspace_id}/auto-triage")
async def run_auto_triage(workspace_id: str):
    return await auto_triage_engine.run_auto_triage(workspace_id)


@app.get("/api/workspace/{workspace_id}/investigate")
async def investigate_stream(workspace_id: str, question: str):
    """Server-Sent Events (SSE) streaming endpoint for live agent tool timeline and answers."""
    async def event_generator():
        async for event in agent_loop.execute_question_stream(workspace_id, question):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
