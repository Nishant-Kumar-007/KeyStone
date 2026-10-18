from typing import Optional
from fastapi import HTTPException
from falkordb import FalkorDB, Graph
from redis.exceptions import ConnectionError as RedisConnectionError, TimeoutError as RedisTimeoutError
from backend.app.config import settings


class FalkorDBManager:
    _instance: Optional["FalkorDBManager"] = None
    _client: Optional[FalkorDB] = None

    def __init__(self, host: Optional[str] = None, port: Optional[int] = None):
        self.host = host or settings.falkordb_host
        # If host is localhost or 127.0.0.1, use 127.0.0.1 to avoid Windows IPv6 resolution issues
        if self.host == "localhost":
            self.host = "127.0.0.1"
        self.port = port or settings.falkordb_port

    @classmethod
    def get_instance(cls) -> "FalkorDBManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def reset_instance(cls):
        if cls._instance and cls._instance._client:
            try:
                cls._instance._client.close()
            except Exception:
                pass
        cls._instance = None

    def get_client(self) -> FalkorDB:
        try:
            if self._client is None:
                self._client = FalkorDB(host=self.host, port=self.port)
            # Verify connectivity via ping
            self._client.connection.ping()
            return self._client
        except (RedisConnectionError, RedisTimeoutError, ConnectionRefusedError, OSError) as e:
            self._client = None
            raise HTTPException(
                status_code=503,
                detail=f"FalkorDB connection failed at {self.host}:{self.port}. Graph engine is unavailable: {e}"
            )

    def select_graph(self, workspace_id: str) -> Graph:
        client = self.get_client()
        graph_name = f"workspace_{workspace_id}" if not workspace_id.startswith("workspace_") else workspace_id
        return client.select_graph(graph_name)

    def copy_graph(self, src_workspace_id: str, dst_workspace_id: str) -> Graph:
        client = self.get_client()
        src_name = f"workspace_{src_workspace_id}" if not src_workspace_id.startswith("workspace_") else src_workspace_id
        dst_name = f"workspace_{dst_workspace_id}" if not dst_workspace_id.startswith("workspace_") else dst_workspace_id
        try:
            client.connection.execute_command("GRAPH.COPY", src_name, dst_name)
            return client.select_graph(dst_name)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to copy graph from {src_name} to {dst_name}: {e}"
            )

    def delete_graph(self, workspace_id: str) -> bool:
        client = self.get_client()
        graph_name = f"workspace_{workspace_id}" if not workspace_id.startswith("workspace_") else workspace_id
        try:
            graph = client.select_graph(graph_name)
            graph.delete()
            return True
        except Exception:
            return False

    def list_graphs(self) -> list[str]:
        client = self.get_client()
        return client.list_graphs()

    def is_healthy(self) -> bool:
        try:
            client = self.get_client()
            return bool(client.connection.ping())
        except Exception:
            return False


db_manager = FalkorDBManager.get_instance()
