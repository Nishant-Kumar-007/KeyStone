import json
import logging
from pathlib import Path
from typing import Any, Optional
from backend.app.config import settings

logger = logging.getLogger(__name__)


class LocalCache:
    def __init__(self, cache_dir: Optional[Path] = None):
        self.cache_dir = cache_dir or (Path(__file__).resolve().parent.parent.parent / "cache")
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.fixtures_dir = settings.fixtures_dir

    def _get_cache_file(self, namespace: str, key: str) -> Path:
        safe_key = "".join(c if c.isalnum() or c in ("-", "_", ".") else "_" for c in key)
        return self.cache_dir / f"{namespace}_{safe_key}.json"

    def get(self, namespace: str, key: str) -> Optional[Any]:
        cache_file = self._get_cache_file(namespace, key)
        if cache_file.exists():
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Error reading cache {cache_file}: {e}")
        return None

    def set(self, namespace: str, key: str, value: Any) -> None:
        cache_file = self._get_cache_file(namespace, key)
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(value, f, indent=2)
        except Exception as e:
            logger.warning(f"Error writing cache {cache_file}: {e}")

    def load_fixture(self, filename: str) -> dict:
        fixture_path = self.fixtures_dir / filename
        if fixture_path.exists():
            with open(fixture_path, "r", encoding="utf-8") as f:
                return json.load(f)
        logger.warning(f"Fixture {filename} not found at {fixture_path}")
        return {}


disk_cache = LocalCache()
