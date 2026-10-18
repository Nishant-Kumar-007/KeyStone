import json
import pytest
from pathlib import Path
from backend.app.agent.loop import agent_loop
from backend.app.ingest.cyclonedx import cyclonedx_ingester
from backend.app.ingest.cache import disk_cache
from backend.app.graph.client import db_manager


@pytest.fixture(scope="module")
def eval_workspace():
    workspace_id = "evals_golden_workspace"
    # Seed workspace with Log4j and Axios findings
    log4j_data = disk_cache.load_fixture("log4j_cyclonedx.json")
    axios_data = disk_cache.load_fixture("axios_cyclonedx.json")
    
    import asyncio
    asyncio.run(cyclonedx_ingester.ingest_sbom(workspace_id, log4j_data))
    asyncio.run(cyclonedx_ingester.ingest_sbom(workspace_id, axios_data))
    
    yield workspace_id
    db_manager.delete_graph(workspace_id)


def load_golden_evals():
    evals_path = Path(__file__).resolve().parent / "golden_evals.json"
    with open(evals_path, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.mark.asyncio
@pytest.mark.parametrize("eval_case", load_golden_evals(), ids=lambda c: c["id"])
async def test_golden_eval_case(eval_workspace, eval_case):
    question = eval_case["question"]
    
    events = []
    final_answer = ""
    tools_called = set()
    
    async for event in agent_loop.execute_question_stream(eval_workspace, question):
        events.append(event)
        if event["type"] == "tool_start":
            tools_called.add(event["tool"])
        elif event["type"] == "answer":
            final_answer = event["answer"]
            
    # Verify expected tool was called or planned
    if "expected_tool" in eval_case:
        assert eval_case["expected_tool"] in tools_called, f"Expected {eval_case['expected_tool']} in {tools_called}"
        
    # Verify negative assertions (e.g. prompt injection guards)
    for forbidden in eval_case.get("must_not_contain", []):
        assert forbidden.lower() not in final_answer.lower(), f"Forbidden string '{forbidden}' found in answer: {final_answer}"
