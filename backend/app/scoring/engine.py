import yaml
import logging
from pathlib import Path
from typing import Optional
from backend.app.config import settings

logger = logging.getLogger(__name__)


class RiskScoringEngine:
    def __init__(self, config_path: Optional[Path] = None):
        self.config_path = config_path or settings.scoring_config_path
        self.config = self._load_config()

    def _load_config(self) -> dict:
        if self.config_path.exists():
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    return yaml.safe_load(f)
            except Exception as e:
                logger.warning(f"Error loading {self.config_path}: {e}")
        # Default fallback config
        return {
            "weights": {
                "cvss_weight": 0.35,
                "kev_boost": 4.0,
                "epss_weight": 2.5,
                "depth_weight": 1.0,
                "dependents_weight": 0.15
            },
            "factors": {
                "depth_decay_rate": 0.25,
                "direct_scope_bonus": 0.5
            },
            "thresholds": {
                "critical": 8.5,
                "high": 7.0,
                "medium": 4.0,
                "low": 0.0
            },
            "disclaimers": {
                "call_graph_reachability": (
                    "KEYSTONE computes exposure and blast radius along the declared and resolved dependency graph. "
                    "It does not perform runtime call-graph reachability or bytecode execution path analysis."
                )
            }
        }

    def compute_risk(
        self,
        cvss: float,
        is_kev: bool,
        epss: float,
        path_depth: int,
        is_direct: bool,
        dependents_count: int = 1
    ) -> dict:
        weights = self.config["weights"]
        factors = self.config["factors"]

        # 1. Base CVSS component (0-10 -> scaled)
        cvss_contribution = cvss * weights["cvss_weight"]

        # 2. KEV Boost (Active wild exploitation)
        kev_contribution = weights["kev_boost"] if is_kev else 0.0

        # 3. EPSS component (0.0 to 1.0 probability)
        epss_contribution = epss * weights["epss_weight"]

        # 4. Depth & Scope exposure factor
        if is_direct or path_depth <= 1:
            depth_factor = 1.0 + factors.get("direct_scope_bonus", 0.5)
        else:
            decay = factors.get("depth_decay_rate", 0.25)
            depth_factor = 1.0 / (1.0 + decay * (path_depth - 1))
        depth_contribution = depth_factor * weights["depth_weight"]

        # 5. Upstream blast-radius penalty
        capped_dependents = min(max(dependents_count, 1), 10)
        dependents_contribution = capped_dependents * weights["dependents_weight"]

        # Raw composite total
        raw_score = (
            cvss_contribution
            + kev_contribution
            + epss_contribution
            + depth_contribution
            + dependents_contribution
        )
        total_score = min(max(round(raw_score, 2), 0.0), 10.0)

        # Determine semantic tier
        thresholds = self.config["thresholds"]
        if total_score >= thresholds["critical"]:
            tier = "CRITICAL"
        elif total_score >= thresholds["high"]:
            tier = "HIGH"
        elif total_score >= thresholds["medium"]:
            tier = "MEDIUM"
        else:
            tier = "LOW"

        return {
            "score": total_score,
            "tier": tier,
            "breakdown": {
                "cvss_contribution": round(cvss_contribution, 2),
                "kev_boost": round(kev_contribution, 2),
                "epss_contribution": round(epss_contribution, 2),
                "depth_exposure": round(depth_contribution, 2),
                "dependents_penalty": round(dependents_contribution, 2),
                "path_depth": path_depth,
                "is_direct": is_direct,
                "is_kev": is_kev,
                "epss_raw": round(epss, 4),
                "cvss_raw": round(cvss, 1),
                "dependents_count": dependents_count
            },
            "disclaimer": self.config["disclaimers"]["call_graph_reachability"]
        }


scoring_engine = RiskScoringEngine()
