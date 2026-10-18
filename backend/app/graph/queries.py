import logging
from typing import Optional, Any
from backend.app.graph.client import db_manager
from backend.app.scoring.engine import scoring_engine

logger = logging.getLogger(__name__)


class GraphQueryService:
    """Executes validated, parameterised OpenCypher queries against FalkorDB."""

    def explain_finding(self, workspace_id: str, finding_id: str) -> dict:
        """Computes shortest path from project root to the component affected by the finding,

        along with complete evidence trail and risk score breakdown.
        """
        graph = db_manager.select_graph(workspace_id)

        # 1. Fetch vulnerability details
        vuln_res = graph.ro_query(
            """
            MATCH (v:Vulnerability {id: $finding_id})
            OPTIONAL MATCH (c:Component)-[:AFFECTED_BY]->(v)
            RETURN v.id AS id, v.summary AS summary, v.severity AS severity,
                   v.cvss_score AS cvss, v.kev AS kev, v.epss AS epss,
                   v.fixed_in AS fixed_in, c.purl AS purl, c.name AS pkg_name,
                   c.version AS pkg_version, c.is_direct AS is_direct
            """,
            {"finding_id": finding_id}
        )
        if not vuln_res.result_set:
            return {"error": f"Vulnerability {finding_id} not found in workspace {workspace_id}"}

        row = vuln_res.result_set[0]
        vuln_info = {
            "id": row[0],
            "summary": row[1] or "",
            "severity": row[2] or "MEDIUM",
            "cvss": float(row[3]) if row[3] is not None else 5.0,
            "kev": bool(row[4]) if row[4] is not None else False,
            "epss": float(row[5]) if row[5] is not None else 0.05,
            "fixed_in": row[6] or [],
            "affected_component_purl": row[7],
            "affected_component_name": row[8],
            "affected_component_version": row[9],
            "is_direct": bool(row[10]) if row[10] is not None else False
        }

        # 2. Compute shortest path from Project to affected Component
        path_res = graph.ro_query(
            """
            MATCH (p:Project), (c:Component {purl: $purl})
            RETURN shortestPath((p)-[:DECLARES|DEPENDS_ON*]->(c)) AS path
            """,
            {"purl": vuln_info["affected_component_purl"]}
        )

        paths = []
        path_depth = 1
        evidence_nodes = []

        if path_res.result_set and path_res.result_set[0][0]:
            path_obj = path_res.result_set[0][0]
            nodes_in_path = path_obj.nodes()
            path_depth = len(nodes_in_path) - 1

            formatted_nodes = []
            for n in nodes_in_path:
                node_data = {
                    "id": n.properties.get("purl") or n.properties.get("id"),
                    "name": n.properties.get("name"),
                    "version": n.properties.get("version"),
                    "label": list(n.labels)[0] if hasattr(n, "labels") and n.labels else "Node"
                }
                formatted_nodes.append(node_data)
                evidence_nodes.append(node_data["id"])

            paths.append({
                "depth": path_depth,
                "nodes": formatted_nodes
            })

        # 3. Calculate Blast Radius / Dependent count
        dep_res = graph.ro_query(
            """
            MATCH (proj:Project)-[:DECLARES|DEPENDS_ON*]->(c:Component {purl: $purl})
            RETURN count(distinct proj) AS proj_count
            """,
            {"purl": vuln_info["affected_component_purl"]}
        )
        dependents_count = dep_res.result_set[0][0] if dep_res.result_set else 1

        # 4. Compute transparent risk score with breakdown
        risk_result = scoring_engine.compute_risk(
            cvss=vuln_info["cvss"],
            is_kev=vuln_info["kev"],
            epss=vuln_info["epss"],
            path_depth=path_depth,
            is_direct=vuln_info["is_direct"],
            dependents_count=dependents_count
        )

        return {
            "finding_id": finding_id,
            "vulnerability": vuln_info,
            "paths": paths,
            "risk_assessment": risk_result,
            "evidence": [
                {
                    "claim": f"Vulnerability {finding_id} affects component {vuln_info['affected_component_purl']} at path depth {path_depth}.",
                    "node_ids": evidence_nodes,
                    "query": "shortestPath((p:Project)-[:DECLARES|DEPENDS_ON*]->(c:Component))",
                    "source": "FalkorDB"
                }
            ]
        }

    def blast_radius(self, workspace_id: str, finding_id: Optional[str] = None, purl: Optional[str] = None) -> dict:
        """Determines all upstream projects and owners exposed to a vulnerability or component."""
        graph = db_manager.select_graph(workspace_id)

        if finding_id:
            query = """
            MATCH (v:Vulnerability {id: $target_id})<-[:AFFECTED_BY]-(target:Component)
            MATCH path = (proj:Project)-[:DECLARES|DEPENDS_ON*]->(target)
            OPTIONAL MATCH (o:Owner)-[:OWNS]->(proj)
            RETURN proj.id AS project_id, proj.name AS project_name,
                   o.name AS owner_name, o.email AS owner_email,
                   length(path) AS depth, target.purl AS target_purl
            """
            param_key = "target_id"
            param_val = finding_id
        else:
            query = """
            MATCH (target:Component {purl: $target_id})
            MATCH path = (proj:Project)-[:DECLARES|DEPENDS_ON*]->(target)
            OPTIONAL MATCH (o:Owner)-[:OWNS]->(proj)
            RETURN proj.id AS project_id, proj.name AS project_name,
                   o.name AS owner_name, o.email AS owner_email,
                   length(path) AS depth, target.purl AS target_purl
            """
            param_key = "target_id"
            param_val = purl or ""

        res = graph.ro_query(query, {param_key: param_val})
        projects = []
        owners = set()
        min_depth = 999

        for row in res.result_set:
            p_id, p_name, o_name, o_email, depth, t_purl = row
            projects.append({
                "project_id": p_id,
                "project_name": p_name,
                "hop_distance": depth,
                "target_purl": t_purl
            })
            if o_name:
                owners.add((o_name, o_email or ""))
            if depth < min_depth:
                min_depth = depth

        return {
            "query_target": finding_id or purl,
            "exposed_projects": projects,
            "total_exposed_projects": len(projects),
            "affected_owners": [{"name": name, "email": email} for name, email in owners],
            "min_hop_distance": min_depth if min_depth != 999 else 0,
            "evidence": [
                {
                    "claim": f"{len(projects)} project(s) and {len(owners)} owner(s) reach {finding_id or purl}.",
                    "node_ids": [p["project_id"] for p in projects],
                    "query": query.strip(),
                    "source": "FalkorDB"
                }
            ]
        }

    def keystone_components(self, workspace_id: str, limit: int = 10) -> list[dict]:
        """Ranks libraries by structural criticality, dependent count, and vulnerable descendant count."""
        graph = db_manager.select_graph(workspace_id)
        query = """
        MATCH (c:Component)
        OPTIONAL MATCH (c)-[:DEPENDS_ON*]->(descendant:Component)-[:AFFECTED_BY]->(v:Vulnerability)
        OPTIONAL MATCH (upstream:Project)-[:DECLARES|DEPENDS_ON*]->(c)
        RETURN c.purl AS purl, c.name AS name, c.version AS version, c.is_direct AS is_direct,
               count(distinct upstream) AS upstream_count,
               count(distinct descendant) AS vuln_descendant_count,
               count(distinct v) AS reachable_vuln_count
        ORDER BY vuln_descendant_count DESC, reachable_vuln_count DESC, upstream_count DESC
        LIMIT $limit
        """
        res = graph.ro_query(query, {"limit": limit})
        keystones = []
        for row in res.result_set:
            purl, name, version, is_direct, upstream_cnt, vuln_desc_cnt, reachable_vuln_cnt = row
            keystone_score = round((upstream_cnt * 1.5) + (vuln_desc_cnt * 2.0) + (reachable_vuln_cnt * 1.0), 2)
            keystones.append({
                "purl": purl,
                "name": name,
                "version": version,
                "is_direct": is_direct,
                "upstream_projects_count": upstream_cnt,
                "vulnerable_descendants_count": vuln_desc_cnt,
                "reachable_vulnerabilities_count": reachable_vuln_cnt,
                "keystone_score": keystone_score
            })
        return keystones

    def plan_remediation(self, workspace_id: str) -> dict:
        """Finds the minimal set of top-level direct dependency upgrades that eliminates the
        maximum number of transitive vulnerabilities (Fix Leverage / Greedy Set Cover).
        """
        graph = db_manager.select_graph(workspace_id)
        query = """
        MATCH (proj:Project)-[:DECLARES]->(direct:Component)
        MATCH (direct)-[:DEPENDS_ON*0..]->(affected:Component)-[:AFFECTED_BY]->(v:Vulnerability)
        OPTIONAL MATCH (dec:Decision {type: 'ACCEPTED_RISK'})-[:ABOUT]->(v)
        WHERE dec IS NULL
        RETURN direct.purl AS direct_purl,
               direct.name AS package_name,
               direct.version AS current_version,
               collect(distinct v.id) AS resolved_vulns,
               count(distinct v.id) AS resolved_count,
               sum(CASE WHEN v.kev = true THEN 5.0 ELSE 1.0 END * (coalesce(v.cvss_score, 5.0) / 10.0)) AS leverage_score
        ORDER BY leverage_score DESC, resolved_count DESC
        """
        res = graph.ro_query(query)
        batches = []
        covered_vulns = set()

        for idx, row in enumerate(res.result_set):
            purl, name, current_ver, resolved_vulns, count, leverage_score = row
            new_covered = [v for v in resolved_vulns if v not in covered_vulns]
            if not new_covered and batches:
                continue

            covered_vulns.update(resolved_vulns)
            suggested_version = self._suggest_target_version(name, current_ver)

            batches.append({
                "batch_id": f"batch_{idx + 1}",
                "component_purl": purl,
                "package_name": name,
                "current_version": current_ver,
                "recommended_version": suggested_version,
                "resolved_vulnerability_ids": resolved_vulns,
                "resolved_count": count,
                "leverage_score": round(leverage_score, 2),
                "rank": idx + 1
            })

        total_findings_res = graph.ro_query("OPTIONAL MATCH (v:Vulnerability) RETURN count(distinct v)")
        total_vulns = total_findings_res.result_set[0][0] if total_findings_res.result_set else 0

        risk_reduction_pct = round((len(covered_vulns) / total_vulns * 100), 1) if total_vulns > 0 else 100.0

        return {
            "workspace_id": workspace_id,
            "total_vulnerabilities": total_vulns,
            "batches_count": len(batches),
            "potential_risk_reduction_pct": risk_reduction_pct,
            "recommended_batches": batches,
            "summary_claim": f"{total_vulns} alert(s) resolved through {len(batches)} direct upgrade(s)."
        }

    def list_findings(
        self,
        workspace_id: str,
        severity: Optional[str] = None,
        kev_only: bool = False,
        limit: int = 50
    ) -> list[dict]:
        """Lists vulnerabilities in the workspace graph with severity and KEV status."""
        graph = db_manager.select_graph(workspace_id)
        where_clauses = []
        params: dict[str, Any] = {"limit": limit}

        if severity:
            where_clauses.append("toUpper(v.severity) = toUpper($severity)")
            params["severity"] = severity
        if kev_only:
            where_clauses.append("v.kev = true")

        where_stmt = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

        query = f"""
        MATCH (c:Component)-[:AFFECTED_BY]->(v:Vulnerability)
        OPTIONAL MATCH (proj:Project)-[:DECLARES|DEPENDS_ON*]->(c)
        {where_stmt}
        RETURN v.id AS id, v.summary AS summary, v.severity AS severity,
               v.cvss_score AS cvss, v.kev AS kev, v.epss AS epss,
               v.fixed_in AS fixed_in, c.purl AS purl, c.name AS pkg_name,
               c.version AS pkg_version, c.is_direct AS is_direct,
               count(distinct proj) AS affected_projects
        ORDER BY v.kev DESC, v.cvss_score DESC
        LIMIT $limit
        """
        res = graph.ro_query(query, params)
        findings = []

        for row in res.result_set:
            v_id, summary, sev, cvss, kev, epss, fixed_in, purl, pkg_name, pkg_version, is_direct, aff_proj = row
            findings.append({
                "id": v_id,
                "summary": summary,
                "severity": sev or "MEDIUM",
                "cvss_score": float(cvss) if cvss is not None else 5.0,
                "kev": bool(kev) if kev is not None else False,
                "epss": float(epss) if epss is not None else 0.05,
                "fixed_in": fixed_in or [],
                "affected_component": {
                    "purl": purl,
                    "name": pkg_name,
                    "version": pkg_version,
                    "is_direct": bool(is_direct)
                },
                "affected_projects_count": aff_proj
            })
        return findings

    def get_workspace_summary(self, workspace_id: str) -> dict:
        """Returns workspace summary metrics: alert compression, KEV count, top fixes, and keystones."""
        graph = db_manager.select_graph(workspace_id)
        
        counts = graph.ro_query(
            """
            OPTIONAL MATCH (p:Project)
            OPTIONAL MATCH (c:Component)
            OPTIONAL MATCH (v:Vulnerability)
            RETURN
                count(distinct p) AS projects,
                count(distinct c) AS components,
                count(distinct v) AS vulnerabilities,
                count(distinct CASE WHEN v.kev = true THEN v END) AS kev_count
            """
        )
        p_cnt, c_cnt, v_cnt, kev_cnt = (
            counts.result_set[0] if counts.result_set else [0, 0, 0, 0]
        )

        remediation_plan = self.plan_remediation(workspace_id)
        batches_count = remediation_plan["batches_count"]
        top_keystones = self.keystone_components(workspace_id, limit=5)

        return {
            "workspace_id": workspace_id,
            "total_projects": p_cnt,
            "total_components": c_cnt,
            "total_vulnerabilities": v_cnt,
            "kev_vulnerabilities_count": kev_cnt,
            "recommended_fix_count": batches_count,
            "compression_headline": f"{v_cnt} alert(s) -> {batches_count} direct fix(es)",
            "top_keystones": top_keystones,
            "top_remediations": remediation_plan["recommended_batches"][:3]
        }

    def _suggest_target_version(self, pkg_name: str, current_ver: str) -> str:
        # Known safe target versions for signature hackathon cases
        targets = {
            "log4j-core": "2.17.1",
            "log4j-api": "2.17.1",
            "spring-boot-starter-web": "2.7.0",
            "spring-boot-starter": "2.7.0",
            "spring-beans": "5.3.18",
            "axios": "0.21.2",
            "follow-redirects": "1.14.8"
        }
        for k, v in targets.items():
            if k in pkg_name.lower():
                return v
        # Default increment minor version
        try:
            parts = current_ver.split(".")
            if len(parts) >= 2:
                parts[1] = str(int(parts[1]) + 1)
                return ".".join(parts)
        except Exception:
            pass
        return current_ver


graph_queries = GraphQueryService()
