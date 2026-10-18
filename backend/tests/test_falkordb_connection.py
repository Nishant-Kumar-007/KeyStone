import pytest
from fastapi import HTTPException
from backend.app.graph.client import FalkorDBManager


def test_falkordb_live_connection():
    """Verify live connection to real running FalkorDB instance."""
    manager = FalkorDBManager(host="127.0.0.1", port=6379)
    assert manager.is_healthy() is True
    
    # Test selecting and querying graph
    graph = manager.select_graph("test_conn_suite")
    res = graph.query("CREATE (p:Project {id: 'p1', name: 'TestProj'}) RETURN p.id")
    assert res.result_set[0][0] == "p1"
    
    # Clean up
    manager.delete_graph("test_conn_suite")


def test_falkordb_down_loud_failure():
    """Verify system fails loudly with HTTP 503 when FalkorDB is unreachable."""
    # Point to an invalid port where no service is listening
    manager = FalkorDBManager(host="127.0.0.1", port=6389)
    
    with pytest.raises(HTTPException) as exc_info:
        manager.get_client()
        
    assert exc_info.value.status_code == 503
    assert "FalkorDB connection failed" in exc_info.value.detail
    assert "Graph engine is unavailable" in exc_info.value.detail
