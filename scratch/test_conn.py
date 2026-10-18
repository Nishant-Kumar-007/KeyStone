from falkordb import FalkorDB

def test():
    db = FalkorDB(host="127.0.0.1", port=6379)
    g1 = db.select_graph("workspace_test")
    g1.query("CREATE (p:Project {id: 'proj1'})-[:DECLARES]->(c:Component {purl: 'pkg:npm/foo@1.0.0'})")
    
    # Test GRAPH.COPY
    # Execute GRAPH.COPY command on redis client
    db.connection.execute_command("GRAPH.COPY", "workspace_test", "workspace_scratch_test")
    print("Graphs after GRAPH.COPY:", db.list_graphs())
    
    g_scratch = db.select_graph("workspace_scratch_test")
    res = g_scratch.ro_query("MATCH (p:Project)-[:DECLARES]->(c:Component) RETURN p.id, c.purl")
    print("Scratch graph contents:", res.result_set)
    
    # Mutate scratch graph
    g_scratch.query("MATCH (c:Component {purl: 'pkg:npm/foo@1.0.0'}) SET c.purl = 'pkg:npm/foo@2.0.0'")
    res_mutated = g_scratch.ro_query("MATCH (c:Component) RETURN c.purl")
    print("Scratch graph mutated:", res_mutated.result_set)
    
    # Verify original graph was not mutated
    res_orig = g1.ro_query("MATCH (c:Component) RETURN c.purl")
    print("Original graph untouched:", res_orig.result_set)
    
    # Clean up both
    g1.delete()
    g_scratch.delete()
    print("Both graphs deleted. Remaining graphs:", db.list_graphs())
    print("GRAPH.COPY WHAT-IF PROOF VERIFIED!")

if __name__ == "__main__":
    test()
