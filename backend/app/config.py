from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    falkordb_host: str = "localhost"
    falkordb_port: int = 6379
    gemini_api_key: str = ""
    github_token: str = ""
    github_repository: str = ""
    workspace_default_id: str = "demo_workspace"
    fixtures_dir: Path = Path(__file__).resolve().parent.parent / "fixtures"
    scoring_config_path: Path = Path(__file__).resolve().parent.parent.parent / "config" / "scoring.yaml"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
