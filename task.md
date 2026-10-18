# KEYSTONE Task Tracker

Track: **Track 01: Agents That Act on Connected Data**  
Project: **KEYSTONE — Graph-Native Vulnerability Remediation Agent**

---

## Phases & Milestones

### Phase 0: Planning & Environment Verification
- [x] Initial brief and rules analysis
- [x] Fetch WeMakeDevs hackathon rules & FalkorDB documentation
- [x] Draft `implementation_plan.md`
- [x] Draft `task.md`
- [x] Plan approved and all milestones completed across backend, frontend, FalkorDB, and demo walkthrough

### Phase 1: Project Scaffolding & Container Infrastructure
- [x] Initialize repository structure (`backend/`, `frontend/`, `docs/`, `fixtures/`, `evals/`, `config/`)
- [x] Create `docker-compose.yml` with pinned FalkorDB image (`falkordb/falkordb:v4.4.0`)
- [x] Configure Python backend environment with `requirements.txt` (FastAPI, official `falkordb`, `mcp`, `pydantic`, `pytest`)
- [x] Verify live FalkorDB connectivity via client
- [x] Implement & verify test: FalkorDB down -> 503 Loud Failure test (`backend/tests/test_falkordb_connection.py`)

### Phase 2: Graph Data Model & FalkorDB Queries Engine
- [x] Initialize graph schema, unique constraints, and indexes (`backend/app/graph/schema.py`)
- [x] Build offline fixtures (`backend/fixtures/` for Log4j, Spring4Shell, Axios, clean project, OSV advisories, KEV, EPSS)
- [x] Implement data ingestion pipeline:
  - [x] CycloneDX 1.4/1.5 JSON parser (`backend/app/ingest/cyclonedx.py`)
  - [x] Package URL (purl) resolver with local cache (`backend/app/ingest/purl_resolver.py`)
  - [x] OSV.dev vulnerability lookup client with local cache (`backend/app/ingest/advisories.py`)
  - [x] CISA KEV and FIRST EPSS enrichment client
- [x] Implement Core FalkorDB Cypher Queries (`backend/app/graph/queries.py`):
  - [x] Query 1: Dependency traversal & shortest path (`explain_finding`)
  - [x] Query 2: Multi-project & ownership blast radius (`blast_radius`)
  - [x] Query 3: Keystone component analysis (centrality + vulnerable descendants)
  - [x] Query 4: Fix leverage greedy set cover (`plan_remediation`)
  - [x] Query 5: Transparent risk scoring engine (`backend/app/scoring/engine.py`, `config/scoring.yaml`)
  - [x] Query 6: What-if proof simulation via `GRAPH.COPY` (`backend/app/graph/simulation.py`)
- [x] Write `docs/QUERIES.md` with every query and execution detail
- [x] Integration tests against live FalkorDB verifying all 6 query suites (`backend/tests/`)

### Phase 3: MCP Server & Inspectable Agent Loop
- [x] Implement typed MCP tools with Pydantic schemas (`backend/app/mcp_server/tools.py`):
  - [x] `graph_schema`
  - [x] `ingest_source`
  - [x] `list_findings`
  - [x] `explain_finding`
  - [x] `blast_radius`
  - [x] `keystone_components`
  - [x] `plan_remediation`
  - [x] `simulate_upgrade`
  - [x] `propose_action`
  - [x] `record_decision`
  - [x] `run_readonly_cypher`
- [x] Build inspectable agent tool loop with step limits, timeouts, and streaming (`backend/app/agent/loop.py`)
- [x] Build LLM Adapter interface (Gemini default, pluggable) (`backend/app/agent/llm_adapter.py`)
- [x] Build Auto-Triage deterministic mode (runs full pipeline without LLM) (`backend/app/agent/auto_triage.py`)
- [x] Implement anti-hallucination evidence validator (strips uncited CVEs/versions) (`backend/app/agent/validator.py`)
- [x] Implement advisory prompt-injection defense guardrail
- [x] Write 20 golden evals in `evals/` and run automated verification (`evals/golden_evals.json`, `evals/test_evals.py` — 40/40 tests passing)

### Phase 4: Frontend Development (Next.js + Cytoscape.js)
- [x] Initialize Next.js App Router application with Tailwind CSS and Radix UI
- [x] Establish design tokens (refined editorial technical theme, semantic severity colors, JetBrains Mono font)
- [x] Screen 1: Analyze (`/analyze`) with purl input, dropzone, and 4 one-click demo targets
- [x] Screen 2: Dashboard (`/dashboard`) with before/after compression hero and keystone ranking
- [x] Screen 3: Finding Detail (`/findings/[id]`) with Cytoscape.js path hero, node inspector, and score breakdown
- [x] Screen 4: Agent Panel (drawer / `/investigate`) with live streamed timeline and "Show Cypher" toggle
- [x] Screen 5: Remediation (`/remediation`) with before/after diff inspector and Approve/Reject queue
- [x] Integrate REST & SSE endpoints with FastAPI backend
- [x] Verify responsive layout on desktop (1440px) and mobile (390px)

### Phase 5: End-to-End Testing & Visual Polish
- [x] Pytest full test suite passing (unit, integration, golden paths, 503 test)
- [x] E2E verification across all user journeys with live FalkorDB & FastAPI
- [x] Visual inspection with browser subagent (screenshots captured)
- [x] Performance check: demo workspace loads under 5s, new package analysis under 60s

### Phase 6: Documentation & Hackathon Deliverables
- [x] `README.md` with setup in $\le 5$ commands and graph architecture
- [x] `docs/QUERIES.md` complete and verified
- [x] `docs/DECISIONS.md` logging all technical decisions
- [x] `docs/AI_USAGE.md` detailing AI tool usage
- [x] Track designation: **Track 01: Agents That Act on Connected Data**
- [x] Demo video script & recorded walkthrough ready
- [x] Local reproducible run verification (Docker & WSL FalkorDB)
