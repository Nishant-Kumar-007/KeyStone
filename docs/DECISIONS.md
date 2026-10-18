# Technical Decisions Log

- **2026-10-14**: Stack chosen: FastAPI + official `falkordb` async client + Next.js 15 App Router + Tailwind + Cytoscape.js for strict graph-native traversal and zero in-memory fallback.
- **2026-10-14**: Graph isolation: Each workspace uses an isolated FalkorDB graph (`workspace_{id}`) to prevent cross-tenant data collisions.
- **2026-10-14**: What-if proof engine: Implemented via native `GRAPH.COPY` to create ephemeral scratch graphs (`workspace_scratch_{id}`), mutate edges, recompute risk, and drop.
- **2026-10-14**: Agent safety: Actions can only be generated in `PROPOSED` status; approvals require explicit human interaction, with dry-run mode enabled by default.
- **2026-10-14**: Offline resilience: All external APIs (deps.dev, OSV, CISA KEV, EPSS) cached locally with bundled static fixtures to guarantee offline demo stability.
