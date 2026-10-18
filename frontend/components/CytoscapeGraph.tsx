"use client"

import React, { useEffect, useRef, useState } from "react"
import cytoscape from "cytoscape"
import dagre from "cytoscape-dagre"
import { Maximize2, ZoomIn, ZoomOut, RotateCcw, Info } from "lucide-react"

// Register dagre extension safely once
if (typeof window !== "undefined") {
  try {
    cytoscape.use(dagre)
  } catch (e) {
    // Already registered
  }
}

interface GraphNode {
  id: string
  name?: string
  version?: string
  label?: string
  isVulnerable?: boolean
  isDirect?: boolean
}

interface CytoscapeGraphProps {
  paths: any[]
  highlightedPurl?: string
  onNodeSelect?: (nodeData: any) => void
}

export default function CytoscapeGraph({
  paths,
  highlightedPurl,
  onNodeSelect,
}: CytoscapeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const [selectedNode, setSelectedNode] = useState<any | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Build elements from paths
    const elements: cytoscape.ElementDefinition[] = []
    const addedNodeIds = new Set<string>()

    if (paths && paths.length > 0) {
      paths.forEach((pathItem) => {
        const nodes = pathItem.nodes || []
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i]
          const isTarget = i === nodes.length - 1
          const isRoot = i === 0

          if (!addedNodeIds.has(n.id)) {
            addedNodeIds.add(n.id)
            elements.push({
              data: {
                id: n.id,
                label: n.name || n.id,
                version: n.version || "",
                nodeType: isRoot ? "project" : isTarget ? "vulnerable" : "dependency",
                isTarget: isTarget,
                isRoot: isRoot,
                fullName: n.name,
                fullPurl: n.id,
              },
            })
          }

          if (i > 0) {
            const prev = nodes[i - 1]
            const edgeId = `${prev.id}->${n.id}`
            elements.push({
              data: {
                id: edgeId,
                source: prev.id,
                target: n.id,
                highlighted: true,
              },
            })
          }
        }
      })
    }

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "font-family": "JetBrains Mono, monospace",
            "font-size": "11px",
            color: "#e2e8f0",
            "text-valign": "center",
            "text-halign": "center",
            "text-wrap": "wrap",
            "text-max-width": "120px",
            width: "140px",
            height: "44px",
            shape: "round-rectangle",
            "background-color": "#131620",
            "border-width": 1.5,
            "border-color": "#2c3144",
            "border-opacity": 1,
            "transition-property": "background-color, border-color, width, height",
            "transition-duration": 0.2,
          },
        },
        {
          selector: 'node[nodeType = "project"]',
          style: {
            shape: "round-diamond",
            width: "150px",
            height: "50px",
            "background-color": "#0f172a",
            "border-color": "#38bdf8",
            color: "#38bdf8",
            "font-weight": "bold",
          },
        },
        {
          selector: 'node[nodeType = "vulnerable"]',
          style: {
            shape: "round-rectangle",
            "background-color": "#4c0519",
            "border-color": "#f43f5e",
            "border-width": 2,
            color: "#fda4af",
            "font-weight": "bold",
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-color": "#f59e0b",
            "border-width": 2.5,
            "background-color": "#1c1f2e",
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": "#f59e0b",
            "target-arrow-color": "#f59e0b",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            "arrow-scale": 0.9,
            opacity: 0.85,
          },
        },
      ],
      layout: {
        name: "dagre",
        rankDir: "TB",
        nodeSep: 60,
        rankSep: 80,
        padding: 40,
      } as any,
      wheelSensitivity: 0.25,
      minZoom: 0.4,
      maxZoom: 2.5,
    })

    cy.on("tap", "node", (evt) => {
      const nodeData = evt.target.data()
      setSelectedNode(nodeData)
      if (onNodeSelect) {
        onNodeSelect(nodeData)
      }
    })

    cyRef.current = cy

    return () => {
      cy.destroy()
    }
  }, [paths, highlightedPurl, onNodeSelect])

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25)
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)
  const handleFit = () => cyRef.current?.fit(undefined, 40)
  const handleReset = () => {
    cyRef.current?.reset()
    cyRef.current?.fit(undefined, 40)
  }

  return (
    <div className="relative w-full h-full min-h-[460px] bg-[#0c0d13] rounded border border-surface-border overflow-hidden">
      {/* Control Buttons */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-surface-secondary/90 border border-surface-border p-1 rounded backdrop-blur">
        <button
          onClick={handleZoomIn}
          title="Zoom in"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-surface-tertiary rounded transition-colors"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom out"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-surface-tertiary rounded transition-colors"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <div className="h-4 w-[1px] bg-surface-border mx-0.5" />
        <button
          onClick={handleFit}
          title="Fit to view"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-surface-tertiary rounded transition-colors"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          onClick={handleReset}
          title="Reset view"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-surface-tertiary rounded transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Legend Badge */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-4 bg-surface-secondary/90 border border-surface-border px-3 py-1.5 rounded text-[11px] font-mono text-slate-400 backdrop-blur">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-sky-950 border border-sky-400" />
          <span>Root Project</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-surface-secondary border border-slate-600" />
          <span>Dependency</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-950 border border-rose-500" />
          <span className="text-rose-400 font-semibold">Vulnerable Component</span>
        </div>
      </div>

      {/* Cytoscape Canvas */}
      <div ref={containerRef} className="w-full h-full min-h-[460px]" />

      {/* Node Click Inspector Drawer */}
      {selectedNode && (
        <div className="absolute top-3 left-3 z-20 max-w-xs bg-surface-secondary border border-surface-border p-3.5 rounded shadow-xl text-xs font-mono">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-surface-border">
            <span className="font-bold text-slate-200">{selectedNode.label}</span>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-500 hover:text-slate-300"
            >
              ×
            </button>
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-400">
            <div>
              <span className="text-slate-500">PURL: </span>
              <span className="text-slate-300 break-all">{selectedNode.fullPurl}</span>
            </div>
            {selectedNode.version && (
              <div>
                <span className="text-slate-500">Version: </span>
                <span className="text-slate-300">{selectedNode.version}</span>
              </div>
            )}
            <div>
              <span className="text-slate-500">Node Type: </span>
              <span className="uppercase text-slate-300">{selectedNode.nodeType}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
