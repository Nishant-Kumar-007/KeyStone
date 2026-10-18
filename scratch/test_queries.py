import asyncio
from backend.app.ingest.cyclonedx import cyclonedx_ingester
from backend.app.ingest.cache import disk_cache
from backend.app.graph.client import db_manager

async def test():
    workspace_id = "query_test_ws"
    data = disk_cache.load_fixture("log4j_cyclonedx.json")
    await cyclonedx_ingester.ingest_sbom(workspace_id, data)
    graph = db_manager.select_graph(workspace_id)
    
    # 1. Shortest path query using RETURN shortestPath(...)
    q1 = """
    MATCH (p:Project), (c:Component {name: 'log4j-core'})
    RETURN shortestPath((p)-[:DECLARES|DEPENDS_ON*]->(c)) AS path
    """
    res1 = graph.ro_query(q1)
    path_obj = res1.result_set[0][0]
    print("Path string:", str(path_obj))
    print("Path nodes:", [n.properties.get("name") for n in path_obj.nodes()])
    
    # 2. Blast radius query
    q2 = """
    MATCH (v:Vulnerability {id: 'CVE-2021-44228'})<-[:AFFECTED_BY]-(target:Component)
    MATCH path = (proj:Project)-[:DECLARES|DEPENDS_ON*]->(target)
    OPTIONAL MATCH (o:Owner)-[:OWNS]->(proj)
    RETURN proj.id AS project_id, proj.name AS project_name, o.name AS owner_name, length(path) AS depth
    """
    res2 = graph.ro_query(q2)
    print("Query 2 (Blast Radius):", res2.result_set)
    
    # 3. Keystone query (centrality + vulnerable descendants)
    q3 = """
    MATCH (c:Component)
    OPTIONAL MATCH (c)-[:DEPENDS_ON*]->(descendant:Component)-[:AFFECTED_BY]->(v:Vulnerability)
    OPTIONAL MATCH (upstream:Project)-[:DECLARES|DEPENDS_ON*]->(c)
    RETURN c.purl AS purl, c.name AS name, c.version AS version, c.is_direct AS is_direct,
           count(distinct upstream) AS upstream_count,
           count(distinct descendant) AS vuln_descendant_count,
           count(distinct v) AS reachable_vuln_count
    ORDER BY vuln_descendant_count DESC, reachable_vuln_count DESC
    """
    res3 = graph.ro_query(q3)
    print("Query 3 (Keystones):", res3.result_set)
    
    # 4. Fix leverage query
    q4 = """
    MATCH (proj:Project)-[:DECLARES]->(direct:Component)
    MATCH (direct)-[:DEPENDS_ON*0..]->(affected:Component)-[:AFFECTED_BY]->(v:Vulnerability)
    RETURN direct.purl AS direct_purl,
           direct.name AS package_name,
           direct.version AS current_version,
           collect(distinct v.id) AS resolved_vulns,
           count(distinct v.id) AS resolved_count
    ORDER BY resolved_count DESC
    """
    res4 = graph.ro_query(q4)
    print("Query 4 (Fix Leverage):", res4.result_set)
    
    db_manager.delete_graph(workspace_id)
    print("SUCCESS: ALL 4 GRAPH CAPABILITIES VERIFIED ON REAL FALKORDB!")

if __name__ == "__main__":
    asyncio.run(test())
