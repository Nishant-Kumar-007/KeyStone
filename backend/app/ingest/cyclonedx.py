import json
import logging
from typing import Optional, Union
from falkordb import Graph
from backend.app.graph.client import db_manager
from backend.app.graph.schema import init_graph_schema
from backend.app.ingest.advisories import advisory_enricher
from backend.app.ingest.purl_resolver import PurlInfo

logger = logging.getLogger(__name__)


class CycloneDXIngester:
    async def ingest_sbom(
        self,
        workspace_id: str,
        sbom_data: Union[str, dict],
        project_override_name: Optional[str] = None
    ) -> dict:
        if isinstance(sbom_data, str):
            sbom_data = json.loads(sbom_data)

        graph = db_manager.select_graph(workspace_id)
        init_graph_schema(graph)

        # 1. Extract Project Metadata
        metadata = sbom_data.get("metadata", {})
        root_component = metadata.get("component", {})
        project_id = root_component.get("purl") or root_component.get("bom-ref") or f"project_{workspace_id}"
        project_name = project_override_name or root_component.get("name") or workspace_id
        project_version = root_component.get("version", "1.0.0")
        
        info = PurlInfo(project_id)
        project_ecosystem = info.ecosystem.capitalize()

        # Merge Project node
        graph.query(
            """
            MERGE (p:Project {id: $proj_id})
            SET p.name = $name,
                p.version = $version,
                p.ecosystem = $ecosystem,
                p.workspace_id = $workspace_id
            """,
            {
                "proj_id": project_id,
                "name": project_name,
                "version": project_version,
                "ecosystem": project_ecosystem,
                "workspace_id": workspace_id
            }
        )

        # Merge Default Owner
        owner_id = f"owner_{project_name.lower().replace(' ', '_').replace('-', '_')}"
        graph.query(
            """
            MATCH (p:Project {id: $proj_id})
            MERGE (o:Owner {id: $owner_id})
            ON CREATE SET o.name = $owner_name,
                          o.email = $owner_email,
                          o.team = 'Core Engineering'
            MERGE (o)-[:OWNS]->(p)
            """,
            {
                "proj_id": project_id,
                "owner_id": owner_id,
                "owner_name": f"{project_name} Maintainers",
                "owner_email": f"security@{project_name.lower().replace(' ', '')}.acme.corp"
            }
        )

        # 2. Extract and Ingest Components
        components = sbom_data.get("components", [])
        component_purls = set()
        
        for c in components:
            purl = c.get("purl") or c.get("bom-ref")
            if not purl:
                continue
            component_purls.add(purl)
            c_info = PurlInfo(purl)
            c_name = c.get("name") or c_info.name
            c_version = c.get("version") or c_info.version
            c_eco = c_info.ecosystem.capitalize()

            graph.query(
                """
                MERGE (c:Component {purl: $purl})
                SET c.name = $name,
                    c.version = $version,
                    c.ecosystem = $ecosystem,
                    c.is_direct = false
                """,
                {
                    "purl": purl,
                    "name": c_name,
                    "version": c_version,
                    "ecosystem": c_eco
                }
            )

        # 3. Extract and Ingest Dependencies
        dependencies = sbom_data.get("dependencies", [])
        direct_purls = set()

        for dep in dependencies:
            parent_ref = dep.get("ref")
            depends_on = dep.get("dependsOn", [])
            
            # Check if parent is the root project
            is_root_parent = (parent_ref == project_id or parent_ref == root_component.get("bom-ref"))

            for child_purl in depends_on:
                if is_root_parent:
                    direct_purls.add(child_purl)
                    graph.query(
                        """
                        MATCH (p:Project {id: $proj_id})
                        MERGE (c:Component {purl: $child_purl})
                        SET c.is_direct = true
                        MERGE (p)-[r:DECLARES]->(c)
                        """,
                        {
                            "proj_id": project_id,
                            "child_purl": child_purl
                        }
                    )
                else:
                    graph.query(
                        """
                        MERGE (parent:Component {purl: $parent_purl})
                        MERGE (child:Component {purl: $child_purl})
                        MERGE (parent)-[r:DEPENDS_ON]->(child)
                        """,
                        {
                            "parent_purl": parent_ref,
                            "child_purl": child_purl
                        }
                    )

        # 4. Enrich with Vulnerabilities (OSV + CISA KEV + EPSS)
        vulnerabilities_ingested = 0
        for c in components:
            purl = c.get("purl") or c.get("bom-ref")
            if not purl:
                continue
            c_info = PurlInfo(purl)
            vulns = await advisory_enricher.find_vulnerabilities_for_package(
                name=c_info.name,
                version=c_info.version,
                ecosystem=c_info.ecosystem
            )
            for v in vulns:
                v_id = v["id"]
                graph.query(
                    """
                    MATCH (c:Component {purl: $purl})
                    MERGE (vuln:Vulnerability {id: $v_id})
                    SET vuln.summary = $summary,
                        vuln.severity = $severity,
                        vuln.cvss_score = $cvss,
                        vuln.kev = $kev,
                        vuln.epss = $epss,
                        vuln.fixed_in = $fixed_in,
                        vuln.published = $published
                    MERGE (c)-[:AFFECTED_BY]->(vuln)
                    """,
                    {
                        "purl": purl,
                        "v_id": v_id,
                        "summary": v.get("summary", ""),
                        "severity": v.get("severity", "MEDIUM"),
                        "cvss": float(v.get("cvss_score", 5.0)),
                        "kev": bool(v.get("kev", False)),
                        "epss": float(v.get("epss", 0.05)),
                        "fixed_in": v.get("fixed_in", []),
                        "published": v.get("published", "")
                    }
                )
                vulnerabilities_ingested += 1

        return {
            "workspace_id": workspace_id,
            "project_id": project_id,
            "project_name": project_name,
            "components_count": len(component_purls),
            "direct_dependencies_count": len(direct_purls),
            "vulnerabilities_count": vulnerabilities_ingested
        }


cyclonedx_ingester = CycloneDXIngester()
