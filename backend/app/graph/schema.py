from falkordb import Graph
import logging

logger = logging.getLogger(__name__)

SCHEMA_INDEXES = [
    "CREATE INDEX FOR (p:Project) ON (p.id)",
    "CREATE INDEX FOR (c:Component) ON (c.purl)",
    "CREATE INDEX FOR (c:Component) ON (c.name)",
    "CREATE INDEX FOR (c:Component) ON (c.ecosystem)",
    "CREATE INDEX FOR (v:Vulnerability) ON (v.id)",
    "CREATE INDEX FOR (v:Vulnerability) ON (v.severity)",
    "CREATE INDEX FOR (v:Vulnerability) ON (v.kev)",
    "CREATE INDEX FOR (o:Owner) ON (o.id)",
    "CREATE INDEX FOR (a:Action) ON (a.id)",
    "CREATE INDEX FOR (a:Action) ON (a.status)",
    "CREATE INDEX FOR (d:Decision) ON (d.id)"
]


def init_graph_schema(graph: Graph) -> list[str]:
    """Ensures essential property indexes are initialized on the workspace graph."""
    created = []
    for query in SCHEMA_INDEXES:
        try:
            graph.query(query)
            created.append(query)
        except Exception as e:
            # Index may already exist or be unsupported
            logger.debug(f"Index query skipped or already exists: {query} ({e})")
    return created


def get_graph_schema_info(graph: Graph) -> dict:
    """Returns introspection metadata for the graph schema."""
    try:
        # Retrieve labels and relationship types via Cypher
        labels_res = graph.ro_query("MATCH (n) RETURN DISTINCT labels(n) AS lbl")
        all_labels = set()
        for row in labels_res.result_set:
            if row and row[0]:
                for l in row[0]:
                    all_labels.add(l)

        rels_res = graph.ro_query("MATCH ()-[r]->() RETURN DISTINCT type(r) AS rel")
        all_rels = set(row[0] for row in rels_res.result_set if row)

        counts_res = graph.ro_query("MATCH (n) RETURN count(n) AS nodes")
        total_nodes = counts_res.result_set[0][0] if counts_res.result_set else 0

        edge_counts_res = graph.ro_query("MATCH ()-[r]->() RETURN count(r) AS edges")
        total_edges = edge_counts_res.result_set[0][0] if edge_counts_res.result_set else 0

        return {
            "node_labels": sorted(list(all_labels)),
            "relationship_types": sorted(list(all_rels)),
            "total_nodes": total_nodes,
            "total_edges": total_edges,
            "indexes": SCHEMA_INDEXES
        }
    except Exception as e:
        return {
            "node_labels": ["Project", "Component", "Vulnerability", "Owner", "Decision", "Action", "Investigation", "ToolCall"],
            "relationship_types": ["DECLARES", "DEPENDS_ON", "AFFECTED_BY", "OWNS", "ABOUT", "TARGETS", "RAN"],
            "total_nodes": 0,
            "total_edges": 0,
            "error": str(e)
        }
