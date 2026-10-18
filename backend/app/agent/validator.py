import re
import logging
from typing import Any

logger = logging.getLogger(__name__)

# Patterns for CVEs and PURLs / package versions
CVE_PATTERN = re.compile(r"\b(CVE-\d{4}-\d{4,8}|GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4})\b", re.IGNORECASE)
PACKAGE_VERSION_PATTERN = re.compile(r"\b([a-zA-Z0-9_\-\./]+)@(\d+\.\d+(?:\.\d+)?(?:[a-zA-Z0-9_\-\.]*))\b")

# Prompt injection heuristics in untrusted advisory text
INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.IGNORECASE),
    re.compile(r"system\s*prompt", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+in\s+developer\s+mode", re.IGNORECASE),
    re.compile(r"drop\s+graph|drop\s+database|delete\s+from", re.IGNORECASE),
    re.compile(r"execute\s+arbitrary\s+code", re.IGNORECASE)
]


class EvidenceValidator:
    """Validates that agent outputs only cite verified nodes returned by tools,

    and strips untrusted prompt-injection attempts found in advisory text.
    """

    def sanitize_untrusted_advisory(self, text: str) -> str:
        """Sanitizes text originating from external vulnerability advisories."""
        sanitized = text
        for pattern in INJECTION_PATTERNS:
            if pattern.search(sanitized):
                logger.warning(f"Suspected prompt-injection attempt detected in advisory text: {pattern.pattern}")
                sanitized = pattern.sub("[REDACTED_UNTRUSTED_INSTRUCTION]", sanitized)
        return sanitized

    def extract_allowed_entities(self, tool_results: list[dict]) -> set[str]:
        """Extracts all verified CVEs, packages, and node IDs present in tool execution outputs."""
        allowed = set()

        def _traverse(obj: Any):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    if k in ("id", "purl", "target_purl", "current_purl", "cve", "name", "package_name"):
                        if isinstance(v, str):
                            allowed.add(v.strip().lower())
                    elif k in ("resolved_vulnerabilities", "remaining_vulnerabilities", "newly_introduced_vulnerabilities", "resolved_vulnerability_ids", "node_ids"):
                        if isinstance(v, list):
                            for item in v:
                                if isinstance(item, str):
                                    allowed.add(item.strip().lower())
                    _traverse(v)
            elif isinstance(obj, list):
                for item in obj:
                    _traverse(item)

        for tr in tool_results:
            _traverse(tr)

        return allowed

    def validate_agent_text(self, text: str, allowed_entities: set[str]) -> str:
        """Strips any CVE or package@version cited in the model response that was not

        returned in the tool output evidence.
        """
        # 1. Validate CVEs
        def _check_cve(match):
            cve_str = match.group(1)
            if cve_str.lower() in allowed_entities:
                return cve_str
            logger.warning(f"Stripping hallucinated or ungrounded CVE: {cve_str}")
            return f"[UNCITED_CVE_REDACTED]"

        validated = CVE_PATTERN.sub(_check_cve, text)

        # 2. Validate package@version strings
        def _check_pkg_ver(match):
            pkg_str = match.group(0)
            pkg_name = match.group(1).lower()
            if pkg_str.lower() in allowed_entities or pkg_name in allowed_entities or any(pkg_name in a for a in allowed_entities):
                return pkg_str
            logger.warning(f"Stripping hallucinated package version: {pkg_str}")
            return f"[UNCITED_PACKAGE_REDACTED]"

        validated = PACKAGE_VERSION_PATTERN.sub(_check_pkg_ver, validated)
        return validated


evidence_validator = EvidenceValidator()
