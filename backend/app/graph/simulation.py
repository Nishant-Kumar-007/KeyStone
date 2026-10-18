import uuid
import logging
from typing import Optional
from backend.app.graph.client import db_manager
from backend.app.ingest.purl_resolver import PurlInfo
from backend.app.ingest.advisories import advisory_enricher
from backend.app.scoring.engine import scoring_engine

logger = logging.getLogger(__name__)


class WhatIfSimulator:
    """Executes verified what-if upgrade simulations via FalkorDB GRAPH.COPY cloning."""

    async def simulate_upgrade(
        self,
        workspace_id: str,
        current_purl: str,
        target_version: str
    ) -> dict:
        info = PurlInfo(current_purl)
        # Format target purl with new version
        new_purl = f"pkg:{info.ecosystem}/{info.name}@{target_version}"

        # 1. Baseline analysis on active graph
        g_active = db_manager.select_graph(workspace_id)
        before_res = g_active.ro_query(
            """
            MATCH (proj:Project)-[:DECLARES|DEPENDS_ON*]->(c:Component)-[:AFFECTED_BY]->(v:Vulnerability)
            RETURN collect(distinct v.id) AS cves, count(distinct v) AS count
            """
        )
        before_cves = set(before_res.result_set[0][0] if before_res.result_set else [])
        before_count = len(before_cves)

        # 2. Ephemeral Scratch Graph via GRAPH.COPY
        scratch_id = f"scratch_{uuid.uuid4().hex[:8]}"
        db_manager.copy_graph(workspace_id, scratch_id)
        g_scratch = db_manager.select_graph(scratch_id)

        try:
            # 3. Mutate scratch graph: disconnect old version, merge new version
            g_scratch.query(
                """
                MATCH (old:Component {purl: $old_purl})
                OPTIONAL MATCH (parent)-[r1:DEPENDS_ON]->(old)
                OPTIONAL MATCH (proj:Project)-[r2:DECLARES]->(old)
                OPTIONAL MATCH (old)-[r3:AFFECTED_BY]->(v:Vulnerability)
                DELETE r1, r2, r3
                MERGE (new_c:Component {purl: $new_purl})
                ON CREATE SET new_c.name = $name, new_c.version = $new_version, new_c.ecosystem = $eco
                WITH parent, proj, new_c
                FOREACH (p in CASE WHEN parent IS NOT NULL THEN [parent] ELSE [] END |
                    MERGE (p)-[:DEPENDS_ON]->(new_c)
                )
                FOREACH (pr in CASE WHEN proj IS NOT NULL THEN [proj] ELSE [] END |
                    MERGE (pr)-[:DECLARES]->(new_c)
                )
                """,
                {
                    "old_purl": current_purl,
                    "new_purl": new_purl,
                    "name": info.name,
                    "new_version": target_version,
                    "eco": info.ecosystem.capitalize()
                }
            )

            # 4. Check if target version introduces any new vulnerabilities
            new_vulns = await advisory_enricher.find_vulnerabilities_for_package(
                name=info.name,
                version=target_version,
                ecosystem=info.ecosystem
            )
            for nv in new_vulns:
                g_scratch.query(
                    """
                    MATCH (c:Component {purl: $purl})
                    MERGE (v:Vulnerability {id: $v_id})
                    ON CREATE SET v.summary = $summary, v.severity = $severity, v.cvss_score = $cvss, v.kev = $kev
                    MERGE (c)-[:AFFECTED_BY]->(v)
                    """,
                    {
                        "purl": new_purl,
                        "v_id": nv["id"],
                        "summary": nv.get("summary", ""),
                        "severity": nv.get("severity", "MEDIUM"),
                        "cvss": float(nv.get("cvss_score", 5.0)),
                        "kev": bool(nv.get("kev", False))
                    }
                )

            # 5. Compute reachable vulnerabilities on scratch graph
            after_res = g_scratch.ro_query(
                """
                MATCH (proj:Project)-[:DECLARES|DEPENDS_ON*]->(c:Component)-[:AFFECTED_BY]->(v:Vulnerability)
                RETURN collect(distinct v.id) AS cves, count(distinct v) AS count
                """
            )
            after_cves = set(after_res.result_set[0][0] if after_res.result_set else [])
            after_count = len(after_cves)

            # 6. Compute before-and-after diff
            resolved_cves = sorted(list(before_cves - after_cves))
            remaining_cves = sorted(list(before_cves & after_cves))
            newly_introduced_cves = sorted(list(after_cves - before_cves))

            # Risk reduction verification
            is_verified = (len(resolved_cves) > 0 and len(newly_introduced_cves) == 0)
            net_risk_reduction = (before_count - after_count) / max(before_count, 1) * 100.0

            return {
                "workspace_id": workspace_id,
                "current_purl": current_purl,
                "target_version": target_version,
                "target_purl": new_purl,
                "verified": is_verified,
                "simulation_engine": "FalkorDB GRAPH.COPY",
                "before_vulnerability_count": before_count,
                "after_vulnerability_count": after_count,
                "resolved_vulnerabilities": resolved_cves,
                "remaining_vulnerabilities": remaining_cves,
                "newly_introduced_vulnerabilities": newly_introduced_cves,
                "net_risk_reduction_pct": round(net_risk_reduction, 1),
                "recommendation_verdict": (
                    "PROCEED: Upgrade verifiably eliminates vulnerability risk without introducing new CVEs."
                    if is_verified
                    else "CAUTION: Simulation indicates unresolved dependencies or newly introduced CVEs."
                ),
                "evidence": [
                    {
                        "claim": (
                            f"Simulated upgrade of {info.name} from {info.version} to {target_version} "
                            f"resolves {len(resolved_cves)} CVE(s) in scratch graph {scratch_id}."
                        ),
                        "node_ids": [current_purl, new_purl] + resolved_cves,
                        "query": "GRAPH.COPY workspace_* scratch_*; MATCH ... DELETE ... MERGE ...",
                        "source": "FalkorDB Simulation"
                    }
                ]
            }

        finally:
            # Drop scratch graph in all circumstances to ensure zero storage leak
            db_manager.delete_graph(scratch_id)


whatif_simulator = WhatIfSimulator()
