# KEYSTONE Cypher Queries & Graph Algorithms Reference

**Track 01: Agents That Act on Connected Data**  
*All queries and graph operations execute natively on FalkorDB via the official Python client. In-memory graph processing and external databases are strictly prohibited.*

---

## 1. Schema Initialization & Indexing
**Location**: `backend/app/graph/schema.py` (`init_graph_schema`)  
**Command Type**: `GRAPH.QUERY`  
**Purpose**: Initializes property indexes on essential nodes to accelerate traversals and reachability calculations.

```cypher
CREATE INDEX FOR (p:Project) ON (p.id);
CREATE INDEX FOR (c:Component) ON (c.purl);
CREATE INDEX FOR (c:Component) ON (c.name);
CREATE INDEX FOR (c:Component) ON (c.ecosystem);
CREATE INDEX FOR (v:Vulnerability) ON (v.id);
CREATE INDEX FOR (v:Vulnerability) ON (v.severity);
CREATE INDEX FOR (v:Vulnerability) ON (v.kev);
CREATE INDEX FOR (o:Owner) ON (o.id);
CREATE INDEX FOR (a:Action) ON (a.id);
CREATE INDEX FOR (a:Action) ON (a.status);
CREATE INDEX FOR (d:Decision) ON (d.id);
```

---

## 2. Ingestion & Graph Construction
**Location**: `backend/app/ingest/cyclonedx.py`  
**Command Type**: `GRAPH.QUERY` (write)  
**Purpose**: Ingests CycloneDX SBOM components and dependencies, applying `MERGE` semantics for deduplication.

### 2.1 Project & Owner Declaration
```cypher
MERGE (p:Project {id: $proj_id})
SET p.name = $name,
    p.version = $version,
    p.ecosystem = $ecosystem,
    p.workspace_id = $workspace_id;

MATCH (p:Project {id: $proj_id})
MERGE (o:Owner {id: $owner_id})
ON CREATE SET o.name = $owner_name,
              o.email = $owner_email,
              o.team = 'Core Engineering'
MERGE (o)-[:OWNS]->(p);
```

### 2.2 Direct & Transitive Dependencies
```cypher
-- Direct dependency from Project
MATCH (p:Project {id: $proj_id})
MERGE (c:Component {purl: $child_purl})
SET c.is_direct = true
MERGE (p)-[r:DECLARES]->(c);

-- Transitive dependency edge
MERGE (parent:Component {purl: $parent_purl})
MERGE (child:Component {purl: $child_purl})
MERGE (parent)-[r:DEPENDS_ON]->(child);
```

### 2.3 Vulnerability Enrichment Linking
```cypher
MATCH (c:Component {purl: $purl})
MERGE (vuln:Vulnerability {id: $v_id})
SET vuln.summary = $summary,
    vuln.severity = $severity,
    vuln.cvss_score = $cvss,
    vuln.kev = $kev,
    vuln.epss = $epss,
    vuln.fixed_in = $fixed_in,
    vuln.published = $published
MERGE (c)-[:AFFECTED_BY]->(vuln);
```

---

## 3. Shortest Path & Dependency Traversal
**Location**: `backend/app/graph/queries.py` (`explain_finding`)  
**MCP Tool**: `explain_finding`  
**Command Type**: `GRAPH.RO_QUERY` (read-only)  
**Purpose**: Finds the exact shortest path from the root project through intermediate dependencies to the vulnerable component.

```cypher
MATCH (p:Project), (c:Component {purl: $purl})
RETURN shortestPath((p)-[:DECLARES|DEPENDS_ON*]->(c)) AS path;
```
*Output*: FalkorDB `Path` object with traversed `Node` and `Edge` collections, giving path depth and node attributes.

---

## 4. Blast Radius & Ownership Reach
**Location**: `backend/app/graph/queries.py` (`blast_radius`)  
**MCP Tool**: `blast_radius`  
**Command Type**: `GRAPH.RO_QUERY` (read-only)  
**Purpose**: Traverses upstream from a vulnerable component or advisory to all reachable root projects and accountable owners.

```cypher
MATCH (v:Vulnerability {id: $target_id})<-[:AFFECTED_BY]-(target:Component)
MATCH path = (proj:Project)-[:DECLARES|DEPENDS_ON*]->(target)
OPTIONAL MATCH (o:Owner)-[:OWNS]->(proj)
RETURN proj.id AS project_id,
       proj.name AS project_name,
       o.name AS owner_name,
       o.email AS owner_email,
       length(path) AS depth,
       target.purl AS target_purl;
```

---

## 5. Keystone Component Centrality
**Location**: `backend/app/graph/queries.py` (`keystone_components`)  
**MCP Tool**: `keystone_components`  
**Command Type**: `GRAPH.RO_QUERY` (read-only)  
**Purpose**: Calculates library centrality based on upstream project dependents and downstream vulnerable descendants.

```cypher
MATCH (c:Component)
OPTIONAL MATCH (c)-[:DEPENDS_ON*]->(descendant:Component)-[:AFFECTED_BY]->(v:Vulnerability)
OPTIONAL MATCH (upstream:Project)-[:DECLARES|DEPENDS_ON*]->(c)
RETURN c.purl AS purl,
       c.name AS name,
       c.version AS version,
       c.is_direct AS is_direct,
       count(distinct upstream) AS upstream_count,
       count(distinct descendant) AS vuln_descendant_count,
       count(distinct v) AS reachable_vuln_count
ORDER BY vuln_descendant_count DESC, reachable_vuln_count DESC, upstream_count DESC
LIMIT $limit;
```

---

## 6. Fix Leverage via Greedy Set Cover
**Location**: `backend/app/graph/queries.py` (`plan_remediation`)  
**MCP Tool**: `plan_remediation`  
**Command Type**: `GRAPH.RO_QUERY` (read-only)  
**Purpose**: Determines the direct dependencies that, when upgraded, eliminate the maximum risk across all transitive descendants. Ignores findings marked with `ACCEPTED_RISK` decisions.

```cypher
MATCH (proj:Project)-[:DECLARES]->(direct:Component)
MATCH (direct)-[:DEPENDS_ON*0..]->(affected:Component)-[:AFFECTED_BY]->(v:Vulnerability)
WHERE NOT EXISTS {
    MATCH (dec:Decision {type: 'ACCEPTED_RISK'})-[:ABOUT]->(v)
}
RETURN direct.purl AS direct_purl,
       direct.name AS package_name,
       direct.version AS current_version,
       collect(distinct v.id) AS resolved_vulns,
       count(distinct v.id) AS resolved_count,
       sum(CASE WHEN v.kev = true THEN 5.0 ELSE 1.0 END * (coalesce(v.cvss_score, 5.0) / 10.0)) AS leverage_score
ORDER BY leverage_score DESC, resolved_count DESC;
```

---

## 7. What-If Simulation via GRAPH.COPY
**Location**: `backend/app/graph/simulation.py` (`simulate_upgrade`)  
**MCP Tool**: `simulate_upgrade`  
**Command Type**: `GRAPH.COPY` -> `GRAPH.QUERY` -> `GRAPH.RO_QUERY` -> `GRAPH.DELETE`  
**Purpose**: Proven before-and-after verification by cloning to an ephemeral scratch graph, applying the upgrade edge mutation, checking remaining risk, and destroying the scratch graph.

### Step 1: Copy active graph
```
GRAPH.COPY workspace_main workspace_scratch_7f9b02a1
```

### Step 2: Mutate upgrade candidate in scratch graph
```cypher
MATCH (old:Component {purl: $old_purl})
OPTIONAL MATCH (parent)-[r1:DEPENDS_ON]->(old)
OPTIONAL MATCH (proj:Project)-[r2:DECLARES]->(old)
OPTIONAL MATCH (old)-[r3:AFFECTED_BY]->(v:Vulnerability)
DELETE r1, r2, r3
MERGE (new_c:Component {purl: $new_purl})
ON CREATE SET new_c.name = $name, new_c.version = $new_version, new_c.ecosystem = $eco
WITH parent, proj, new_c
FOREACH (p in CASE WHEN parent IS NOT NULL THEN [parent] ELSE [] END |
    MERGE (p)-[:DEPENDS_ON]->(new_c)
)
FOREACH (pr in CASE WHEN proj IS NOT NULL THEN [proj] ELSE [] END |
    MERGE (pr)-[:DECLARES]->(new_c)
);
```

### Step 3: Recompute reachable vulnerabilities in scratch graph
```cypher
MATCH (proj:Project)-[:DECLARES|DEPENDS_ON*]->(c:Component)-[:AFFECTED_BY]->(v:Vulnerability)
RETURN collect(distinct v.id) AS cves, count(distinct v) AS count;
```

### Step 4: Destroy scratch graph
```
GRAPH.DELETE workspace_scratch_7f9b02a1
```
