import asyncio
import uuid
from backend.app.ingest.cyclonedx import cyclonedx_ingester
from backend.app.ingest.cache import disk_cache
from backend.app.graph.client import db_manager
from backend.app.graph.queries import graph_queries

async def test():
    workspace_id = f"sim_test_{uuid.uuid4().hex[:6]}"
    data = disk_cache.load_fixture("log4j_cyclonedx.json")
    await cyclonedx_ingester.ingest_sbom(workspace_id, data)
    
    # Check baseline findings
    before_findings = graph_queries.list_findings(workspace_id)
    before_cves = set(f["id"] for f in before_findings)
    print("Baseline CVEs:", before_cves)
    
    # 1. Create scratch graph via GRAPH.COPY
    scratch_id = f"scratch_{workspace_id}"
    db_manager.copy_graph(workspace_id, scratch_id)
    
    g_scratch = db_manager.select_graph(scratch_id)
    
    # 2. Simulate upgrading log4j-core from 2.14.1 to 2.17.1
    old_purl = "pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1"
    new_purl = "pkg:maven/org.apache.logging.log4j/log4j-core@2.17.1"
    
    # In scratch graph, replace old component edges
    g_scratch.query(
        """
        MATCH (old:Component {purl: $old_purl})
        OPTIONAL MATCH (parent)-[r1:DEPENDS_ON]->(old)
        OPTIONAL MATCH (proj:Project)-[r2:DECLARES]->(old)
        OPTIONAL MATCH (old)-[r3:AFFECTED_BY]->(v:Vulnerability)
        DELETE r1, r2, r3
        MERGE (new_c:Component {purl: $new_purl})
        ON CREATE SET new_c.name = 'log4j-core', new_c.version = '2.17.1', new_c.ecosystem = 'Maven'
        WITH parent, proj, new_c
        FOREACH (p in CASE WHEN parent IS NOT NULL THEN [parent] ELSE [] END |
            MERGE (p)-[:DEPENDS_ON]->(new_c)
        )
        FOREACH (pr in CASE WHEN proj IS NOT NULL THEN [proj] ELSE [] END |
            MERGE (pr)-[:DECLARES]->(new_c)
        )
        """,
        {"old_purl": old_purl, "new_purl": new_purl}
    )
    
    # Check post-simulation reachable vulnerabilities in scratch graph
    res_after = g_scratch.ro_query(
        """
        MATCH (p:Project)-[:DECLARES|DEPENDS_ON*]->(c:Component)-[:AFFECTED_BY]->(v:Vulnerability)
        RETURN count(distinct v) AS remaining_count, collect(distinct v.id) AS remaining_cves
        """
    )
    remaining_cnt = res_after.result_set[0][0] if res_after.result_set else 0
    remaining_cves = set(res_after.result_set[0][1] if res_after.result_set else [])
    print("Post-upgrade reachable CVEs:", remaining_cves)
    
    resolved = before_cves - remaining_cves
    print("Resolved CVEs:", resolved)
    assert len(resolved) == 2, f"Expected 2 resolved CVEs, got {len(resolved)}"
    
    # 3. Clean up scratch and test workspace
    db_manager.delete_graph(scratch_id)
    db_manager.delete_graph(workspace_id)
    print("SIMULATION ENGINE VERIFIED ON REAL FALKORDB!")

if __name__ == "__main__":
    asyncio.run(test())
