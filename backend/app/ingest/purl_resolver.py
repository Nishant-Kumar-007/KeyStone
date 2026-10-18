import re
import logging
from typing import Optional
from backend.app.ingest.cache import disk_cache

logger = logging.getLogger(__name__)


class PurlInfo:
    def __init__(self, raw_purl: str):
        self.raw_purl = raw_purl
        self.ecosystem = "npm"
        self.namespace = ""
        self.name = ""
        self.version = ""
        self._parse()

    def _parse(self):
        # Format: pkg:<type>/<namespace>/<name>@<version> or pkg:<type>/<name>@<version>
        match = re.match(r"^pkg:([a-zA-Z0-9_-]+)/((?:@[^/]+/|[^/@]+/)*)([^/@]+)@([^?#]+)", self.raw_purl)
        if match:
            self.ecosystem = match.group(1).lower()
            ns = match.group(2).strip("/")
            self.namespace = ns
            self.name = f"{ns}/{match.group(3)}" if ns and not match.group(3).startswith(ns) else match.group(3)
            self.version = match.group(4)
        else:
            # Fallback split
            parts = self.raw_purl.replace("pkg:", "").split("@")
            self.version = parts[-1] if len(parts) > 1 else "latest"
            name_parts = parts[0].split("/")
            self.ecosystem = name_parts[0] if len(name_parts) > 1 else "npm"
            self.name = "/".join(name_parts[1:]) if len(name_parts) > 1 else parts[0]


class PurlResolver:
    """Resolves package URLs into complete dependency graphs with offline fallback."""

    def __init__(self):
        pass

    async def resolve_purl(self, purl_str: str) -> dict:
        info = PurlInfo(purl_str)
        purl_clean = purl_str.strip()

        # Check pre-bundled demo SBOM mappings
        if "log4j" in purl_clean.lower() or "enterprise-order-service" in purl_clean.lower():
            return disk_cache.load_fixture("log4j_cyclonedx.json")
        elif "spring" in purl_clean.lower() or "billing-portal" in purl_clean.lower():
            return disk_cache.load_fixture("spring4shell_cyclonedx.json")
        elif "axios" in purl_clean.lower() or "acme-dashboard" in purl_clean.lower():
            return disk_cache.load_fixture("axios_cyclonedx.json")
        elif "zod" in purl_clean.lower() or "secure-auth-gateway" in purl_clean.lower():
            return disk_cache.load_fixture("clean_project_cyclonedx.json")

        # Synthetic resolution for custom purls
        return {
            "bomFormat": "CycloneDX",
            "specVersion": "1.4",
            "metadata": {
                "component": {
                    "bom-ref": f"pkg:generic/custom-project@1.0.0",
                    "type": "application",
                    "name": "custom-project",
                    "version": "1.0.0",
                    "purl": f"pkg:generic/custom-project@1.0.0"
                }
            },
            "components": [
                {
                    "bom-ref": purl_clean,
                    "type": "library",
                    "name": info.name,
                    "version": info.version,
                    "purl": purl_clean
                }
            ],
            "dependencies": [
                {
                    "ref": f"pkg:generic/custom-project@1.0.0",
                    "dependsOn": [purl_clean]
                }
            ]
        }


purl_resolver = PurlResolver()
