import os
import json
import logging
from abc import ABC, abstractmethod
from typing import Optional, Any
from backend.app.config import settings

logger = logging.getLogger(__name__)


class LLMAdapter(ABC):
    """Abstract interface allowing LLM providers to be changed through configuration."""

    @abstractmethod
    async def generate_response(
        self,
        system_prompt: str,
        user_prompt: str,
        tools_schema: list[dict],
        tool_call_history: list[dict]
    ) -> dict:
        """Returns { 'content': str, 'tool_call': Optional[dict] }"""
        pass


class GeminiAdapter(LLMAdapter):
    """Adapter for Google Gemini models via google-genai SDK."""

    def __init__(self, api_key: Optional[str] = None, model: str = "gemini-2.5-flash"):
        self.api_key = api_key or settings.gemini_api_key or os.getenv("GEMINI_API_KEY")
        self.model = model
        self.client = None
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Could not initialize Google GenAI client: {e}")

    async def generate_response(
        self,
        system_prompt: str,
        user_prompt: str,
        tools_schema: list[dict],
        tool_call_history: list[dict]
    ) -> dict:
        if not self.client:
            # Fallback to local heuristic response generator if API key omitted
            return self._heuristic_fallback(user_prompt, tool_call_history)

        try:
            from google.genai import types
            
            # Construct conversation history
            contents = [f"SYSTEM INSTRUCTIONS:\n{system_prompt}\n\nUSER QUESTION:\n{user_prompt}"]
            for step in tool_call_history:
                contents.append(
                    f"Executed Tool: {step.get('tool')}\n"
                    f"Arguments: {json.dumps(step.get('args', {}))}\n"
                    f"Result: {json.dumps(step.get('result', {}))[:2000]}"
                )

            contents.append("Synthesize a concise, rigorous response citing the verified evidence returned above:")
            
            response = self.client.models.generate_content(
                model=self.model,
                contents="\n\n".join(contents)
            )
            return {
                "content": response.text,
                "tool_call": None
            }
        except Exception as e:
            logger.warning(f"Gemini API call failed, using heuristic fallback: {e}")
            return self._heuristic_fallback(user_prompt, tool_call_history)

    def _heuristic_fallback(self, user_prompt: str, tool_call_history: list[dict]) -> dict:
        """Deterministic synthesis used when no LLM API key is present."""
        if not tool_call_history:
            return {
                "content": f"Investigating question: '{user_prompt}'. Querying FalkorDB knowledge graph...",
                "tool_call": None
            }

        last_tool = tool_call_history[-1]
        tool_name = last_tool.get("tool")
        result = last_tool.get("result", {})

        if tool_name == "explain_finding":
            v_id = result.get("finding_id", "Vulnerability")
            paths = result.get("paths", [])
            depth = paths[0].get("depth", 1) if paths else 1
            risk = result.get("risk_assessment", {})
            score = risk.get("score", 0.0)
            tier = risk.get("tier", "UNKNOWN")
            return {
                "content": (
                    f"**Finding Analysis for {v_id}**\n\n"
                    f"- **Risk Rating**: `{tier}` (Score: `{score}/10.0`)\n"
                    f"- **Exposure Depth**: `{depth}` hop(s) along the verified dependency chain.\n"
                    f"- **Shortest Route**: {' -> '.join(n['name'] for n in paths[0]['nodes']) if paths else 'Direct'}\n\n"
                    f"Recommendation: Remediate by upgrading the direct parent component to eliminate downstream exposure."
                ),
                "tool_call": None
            }
        elif tool_name == "plan_remediation":
            batches = result.get("recommended_batches", [])
            return {
                "content": (
                    f"**Remediation Plan Generated**\n\n"
                    f"FalkorDB greedy set cover identified **{len(batches)} direct upgrade batch(es)** "
                    f"achieving **{result.get('potential_risk_reduction_pct', 100)}% risk reduction**:\n\n" +
                    "\n".join(
                        f"{i+1}. `{b['package_name']}` ({b['current_version']} -> `{b['recommended_version']}`) "
                        f"— Resolves {b['resolved_count']} vulnerability alert(s)."
                        for i, b in enumerate(batches[:3])
                    )
                ),
                "tool_call": None
            }
        elif tool_name == "simulate_upgrade":
            verified = result.get("verified", False)
            return {
                "content": (
                    f"**What-If Simulation Result (FalkorDB GRAPH.COPY)**\n\n"
                    f"- **Status**: {'VERIFIED SAFE' if verified else 'UNVERIFIED'}\n"
                    f"- **Resolved Vulnerabilities**: {', '.join(result.get('resolved_vulnerabilities', [])) or 'None'}\n"
                    f"- **Newly Introduced**: {len(result.get('newly_introduced_vulnerabilities', []))}\n"
                    f"- **Net Risk Reduction**: `{result.get('net_risk_reduction_pct', 0)}%`\n\n"
                    f"{result.get('recommendation_verdict', '')}"
                ),
                "tool_call": None
            }
        
        return {
            "content": f"Graph query completed. Retrieved verified context from tool `{tool_name}` on FalkorDB.",
            "tool_call": None
        }


def get_llm_adapter() -> LLMAdapter:
    return GeminiAdapter()
