# AI Usage Disclosure

In compliance with Hackathon Rule 11 & Rule 13 ("AI coding assistants are allowed, but their use must be disclosed"), this document details how AI was utilized during the development of KEYSTONE.

## Tools & Assistants Used
- **Google Antigravity (Gemini 2.5 Pro / Flash)**: Utilized as a pair-programming coding assistant for scaffolding project architecture, implementing Cypher query routines, generating TypeScript components, and writing test fixtures.
- **Model Adapter**: Gemini API is integrated via `backend/agent/llm_adapter.py` for natural-language agent explanations and conversational investigations over structured MCP tool outputs.

## Participant Contribution & Verification
- All FalkorDB Cypher queries, graph schemas, and algorithm implementations were independently designed, tested, and verified against live FalkorDB database instances.
- The greedy set-cover fix leverage calculation and `GRAPH.COPY` what-if simulation were custom engineered to ensure strict graph-native operation without in-memory Python graph fallbacks.
- An "Auto-Triage" mode was specifically built to prove that the entire graph remediation and risk analysis pipeline functions deterministically without any LLM assistance.
