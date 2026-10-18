from backend.app.scoring.engine import scoring_engine


def test_scoring_critical_kev():
    res = scoring_engine.compute_risk(
        cvss=10.0,
        is_kev=True,
        epss=0.97,
        path_depth=1,
        is_direct=True,
        dependents_count=2
    )
    assert res["tier"] == "CRITICAL"
    assert res["score"] >= 8.5
    assert res["breakdown"]["kev_boost"] == 4.0
    assert "call-graph reachability" in res["disclaimer"]


def test_scoring_transitive_low():
    res = scoring_engine.compute_risk(
        cvss=4.0,
        is_kev=False,
        epss=0.01,
        path_depth=5,
        is_direct=False,
        dependents_count=1
    )
    assert res["tier"] in ("LOW", "MEDIUM")
    assert res["score"] < 5.0
    assert res["breakdown"]["kev_boost"] == 0.0
