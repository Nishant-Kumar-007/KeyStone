from falkordb import FalkorDB

def test():
    db = FalkorDB(host="127.0.0.1", port=6379)
    g = db.select_graph("schema_test3")
    
    indexes = [
        "CREATE INDEX FOR (p:Project) ON (p.id)",
        "CREATE INDEX FOR (c:Component) ON (c.purl)",
        "CREATE INDEX FOR (c:Component) ON (c.name)",
        "CREATE INDEX FOR (v:Vulnerability) ON (v.id)",
        "CREATE INDEX FOR (v:Vulnerability) ON (v.severity)",
        "CREATE INDEX FOR (a:Action) ON (a.id)",
        "CREATE INDEX FOR (d:Decision) ON (d.id)"
    ]
    for idx in indexes:
        try:
            g.query(idx)
            print("Successfully created index:", idx)
        except Exception as e:
            print("Failed:", idx, "->", e)
            
    # Test MERGE uniqueness
    g.query("MERGE (c:Component {purl: 'pkg:npm/foo@1.0.0'}) ON CREATE SET c.name = 'foo'")
    g.query("MERGE (c:Component {purl: 'pkg:npm/foo@1.0.0'}) ON MATCH SET c.updated = true")
    
    count_res = g.ro_query("MATCH (c:Component) RETURN count(c)")
    print("Component count after 2 merges (should be 1):", count_res.result_set[0][0])
    
    g.delete()
    print("Test passed!")

if __name__ == "__main__":
    test()
