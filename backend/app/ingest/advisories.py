import httpx
import logging
from typing import Optional
from backend.app.ingest.cache import disk_cache

logger = logging.getLogger(__name__)


class AdvisoryEnricher:
    def __init__(self):
        self._osv_fixtures = disk_cache.load_fixture("osv_advisories.json")
        self._kev_fixtures = disk_cache.load_fixture("cisa_kev.json").get("vulnerabilities", {})
        self._epss_fixtures = disk_cache.load_fixture("epss_scores.json").get("scores", {})

    async def get_cve_details(self, cve_id: str) -> Optional[dict]:
        cached = disk_cache.get("cve", cve_id)
        if cached:
            return cached

        # Check offline fixture
        if cve_id in self._osv_fixtures:
            item = dict(self._osv_fixtures[cve_id])
            item["kev"] = cve_id in self._kev_fixtures
            item["epss"] = self._epss_fixtures.get(cve_id, {}).get("epss", 0.05)
            disk_cache.set("cve", cve_id, item)
            return item

        # Attempt live lookup to OSV.dev if online
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(f"https://api.osv.dev/v1/vulns/{cve_id}")
                if res.status_code == 200:
                    data = res.json()
                    enriched = self._format_osv_record(data)
                    # Enrich with KEV & EPSS
                    enriched["kev"] = await self.is_kev(cve_id)
                    enriched["epss"] = await self.get_epss_score(cve_id)
                    disk_cache.set("cve", cve_id, enriched)
                    return enriched
        except Exception as e:
            logger.debug(f"Live OSV lookup failed for {cve_id}: {e}")

        return None

    async def find_vulnerabilities_for_package(self, name: str, version: str, ecosystem: str) -> list[dict]:
        cache_key = f"{ecosystem}_{name}_{version}"
        cached = disk_cache.get("pkg_vulns", cache_key)
        if cached:
            return cached

        findings = []

        # Check bundled fixtures
        for cve_id, adv in self._osv_fixtures.items():
            for pkg in adv.get("affected_packages", []):
                # Match package name (handling maven groupId/artifactId or npm package name)
                if pkg["name"].lower() == name.lower() or name.lower().endswith(pkg["name"].lower()):
                    if version in pkg.get("affected_versions", []):
                        item = dict(adv)
                        item["kev"] = cve_id in self._kev_fixtures
                        item["epss"] = self._epss_fixtures.get(cve_id, {}).get("epss", 0.05)
                        item["fixed_in"] = pkg.get("fixed_versions", [])
                        findings.append(item)

        # If not found in fixtures, attempt live OSV query
        if not findings:
            try:
                payload = {
                    "version": version,
                    "package": {
                        "name": name,
                        "ecosystem": ecosystem
                    }
                }
                async with httpx.AsyncClient(timeout=4.0) as client:
                    res = await client.post("https://api.osv.dev/v1/query", json=payload)
                    if res.status_code == 200:
                        vulns = res.json().get("vulns", [])
                        for v in vulns:
                            cve_id = v.get("id")
                            record = self._format_osv_record(v)
                            record["kev"] = await self.is_kev(cve_id)
                            record["epss"] = await self.get_epss_score(cve_id)
                            findings.append(record)
            except Exception as e:
                logger.debug(f"Live OSV query failed for {name}@{version}: {e}")

        disk_cache.set("pkg_vulns", cache_key, findings)
        return findings

    async def is_kev(self, cve_id: str) -> bool:
        if cve_id in self._kev_fixtures:
            return True
        cached = disk_cache.get("kev", cve_id)
        if cached is not None:
            return bool(cached)
        # Fallback default false
        return False

    async def get_epss_score(self, cve_id: str) -> float:
        if cve_id in self._epss_fixtures:
            return float(self._epss_fixtures[cve_id].get("epss", 0.05))
        cached = disk_cache.get("epss", cve_id)
        if cached is not None:
            return float(cached)
        return 0.05

    def _format_osv_record(self, raw: dict) -> dict:
        cve_id = raw.get("id", "UNKNOWN")
        severity = "MEDIUM"
        cvss = 5.0

        for sev in raw.get("severity", []):
            if sev.get("type") == "CVSS_V3":
                score_str = sev.get("score", "")
                # Default estimate or parse CVSS score
                severity = "HIGH"
                cvss = 7.5

        # Check database specific or summary
        summary = raw.get("summary", raw.get("details", "No summary provided"))
        if len(summary) > 200:
            summary = summary[:197] + "..."

        fixed_versions = []
        for affected in raw.get("affected", []):
            for rng in affected.get("ranges", []):
                for event in rng.get("events", []):
                    if "fixed" in event:
                        fixed_versions.append(event["fixed"])

        return {
            "id": cve_id,
            "aliases": raw.get("aliases", []),
            "summary": summary,
            "details": raw.get("details", ""),
            "severity": severity,
            "cvss_score": cvss,
            "ecosystem": raw.get("affected", [{}])[0].get("package", {}).get("ecosystem", "Unknown"),
            "fixed_in": list(set(fixed_versions)),
            "published": raw.get("published", "")
        }


advisory_enricher = AdvisoryEnricher()
