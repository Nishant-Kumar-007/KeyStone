import logging
from backend.app.graph.queries import graph_queries
from backend.app.graph.simulation import whatif_simulator

logger = logging.getLogger(__name__)


class AutoTriageEngine:
    """Runs a fully deterministic, graph-native triage and remediation pipeline

    without requiring any LLM calls. Produces the exact same structured report.
    """

    async def run_auto_triage(self, workspace_id: str) -> dict:
        # 1. Summary & Findings
        summary = graph_queries.get_workspace_summary(workspace_id)
        findings = graph_queries.list_findings(workspace_id, limit=20)
        
        # 2. Keystone Centrality Analysis
        keystones = graph_queries.keystone_components(workspace_id, limit=5)
        
        # 3. Greedy Set Cover Remediation Plan
        plan = graph_queries.plan_remediation(workspace_id)
        batches = plan.get("recommended_batches", [])

        # 4. Run what-if simulation on top recommendation
        top_simulation = None
        if batches:
            top_batch = batches[0]
            top_simulation = await whatif_simulator.simulate_upgrade(
                workspace_id=workspace_id,
                current_purl=top_batch["component_purl"],
                target_version=top_batch["recommended_version"]
            )

        # 5. Build structured evidence trail
        evidence = []
        for b in batches[:3]:
            evidence.append({
                "claim": f"Direct upgrade of {b['package_name']} to {b['recommended_version']} resolves {b['resolved_count']} CVE(s).",
                "node_ids": [b["component_purl"]] + b["resolved_vulnerability_ids"],
                "query": "plan_remediation greedy set cover",
                "source": "FalkorDB"
            })

        if top_simulation:
            evidence.extend(top_simulation.get("evidence", []))

        return {
            "mode": "AUTO_TRIAGE_DETERMINISTIC",
            "workspace_id": workspace_id,
            "headline": summary["compression_headline"],
            "total_vulnerabilities": summary["total_vulnerabilities"],
            "kev_count": summary["kev_vulnerabilities_count"],
            "findings_preview": findings[:5],
            "keystones": keystones,
            "remediation_plan": plan,
            "top_verified_simulation": top_simulation,
            "evidence": evidence
        }


auto_triage_engine = AutoTriageEngine()
