"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Flame,
  ShieldAlert,
  GitBranch,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
  Layers,
  Users,
  ExternalLink,
  RefreshCw
} from "lucide-react"
import { fetchFindingDetail, simulateUpgrade, proposeAction } from "@/lib/api"
import { formatSeverityBadge } from "@/lib/utils"
import CytoscapeGraph from "@/components/CytoscapeGraph"
import ScoreBreakdownCard from "@/components/ScoreBreakdownCard"
import AgentPanel from "@/components/AgentPanel"

export default function FindingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const findingId = decodeURIComponent((params.id as string) || "")
  const workspaceId = "demo_workspace"

  const [loading, setLoading] = useState(true)
  const [finding, setFinding] = useState<any | null>(null)
  const [selectedNode, setSelectedNode] = useState<any | null>(null)

  // Simulation state
  const [targetVersion, setTargetVersion] = useState("")
  const [simulating, setSimulating] = useState(false)
  const [simResult, setSimResult] = useState<any | null>(null)
  const [proposing, setProposing] = useState(false)
  const [actionProposed, setActionProposed] = useState(false)

  useEffect(() => {
    if (!findingId) return
    setLoading(true)
    fetchFindingDetail(workspaceId, findingId)
      .then((data) => {
        setFinding(data)
        // Set default target version if available from fixed_in
        const fixedIn = data?.vulnerability?.fixed_in
        if (fixedIn && fixedIn.length > 0) {
          setTargetVersion(fixedIn[0])
        } else if (data?.vulnerability?.affected_component_name?.includes("log4j")) {
          setTargetVersion("2.17.1")
        } else if (data?.vulnerability?.affected_component_name?.includes("spring-beans")) {
          setTargetVersion("5.3.18")
        } else {
          setTargetVersion("latest")
        }
      })
      .catch((err) => console.error("Error loading finding detail:", err))
      .finally(() => setLoading(false))
  }, [findingId])

  const handleSimulate = async () => {
    if (!finding?.vulnerability?.affected_component_purl || !targetVersion) return
    setSimulating(true)
    setSimResult(null)
    setActionProposed(false)
    try {
      const res = await simulateUpgrade(
        workspaceId,
        finding.vulnerability.affected_component_purl,
        targetVersion
      )
      setSimResult(res)
    } catch (err) {
      console.error("Simulation failed:", err)
    } finally {
      setSimulating(false)
    }
  }

  const handleProposeFix = async () => {
    if (!finding?.vulnerability?.affected_component_purl || !targetVersion) return
    setProposing(true)
    try {
      await proposeAction(
        workspaceId,
        `rec_${findingId}`,
        finding.vulnerability.affected_component_purl,
        targetVersion
      )
      setActionProposed(true)
    } catch (err) {
      console.error("Failed to propose action:", err)
    } finally {
      setProposing(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
        <RefreshCw className="h-6 w-6 animate-spin text-keystone-amber" />
        <span>Executing FalkorDB shortestPath and risk evaluation...</span>
      </div>
    )
  }

  if (!finding || finding.error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-lg font-bold text-white mb-2">Finding Not Found</h2>
        <p className="text-xs text-slate-400 mb-6">
          {finding?.error || `Finding ${findingId} does not exist in workspace '${workspaceId}'.`}
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold bg-surface border border-surface-border text-white hover:border-slate-500"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    )
  }

  const vuln = finding.vulnerability || {}
  const risk = finding.risk_assessment || { score: 50, tier: "MEDIUM", breakdown: {} }
  const paths = finding.paths || []
  const isKev = vuln.kev === true
  const sevBadge = formatSeverityBadge(vuln.severity)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 space-y-6">
      {/* Navigation Breadcrumb & Actions */}
      <div className="flex items-center justify-between pb-2 border-b border-surface-border">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Dashboard / Findings</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/remediation"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-surface border border-surface-border text-slate-200 hover:text-white"
          >
            <Wrench className="h-3.5 w-3.5 text-keystone-amber" />
            <span>Remediation Queue</span>
          </Link>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-surface border border-surface-border rounded p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold font-mono text-white tracking-tight">
                {vuln.id || findingId}
              </h1>
              <span className={`text-xs font-mono px-2.5 py-0.5 rounded border ${sevBadge}`}>
                {vuln.severity || "MEDIUM"}
              </span>
              {isKev && (
                <span className="inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded bg-red-950/80 border border-red-700 text-red-300 font-bold">
                  <Flame className="h-3 w-3 text-red-400" />
                  CISA KEV ACTIVE EXPLOITATION
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 font-mono">
              Affected Package: <span className="text-keystone-amber font-semibold">{vuln.affected_component_purl}</span>
            </p>

            {vuln.summary && (
              <p className="text-xs text-slate-400 max-w-4xl leading-relaxed mt-2">
                {vuln.summary}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 bg-surface-secondary/70 border border-surface-border rounded p-3 text-center font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block">CVSS v3</span>
              <span className="text-lg font-bold text-white">{vuln.cvss ?? "—"}</span>
            </div>
            <div className="w-px h-8 bg-surface-border" />
            <div>
              <span className="text-[10px] text-slate-400 block">EPSS</span>
              <span className="text-lg font-bold text-emerald-400">
                {vuln.epss ? `${Math.round(vuln.epss * 100)}%` : "—"}
              </span>
            </div>
            <div className="w-px h-8 bg-surface-border" />
            <div>
              <span className="text-[10px] text-slate-400 block">GRAPH EXPOSURE</span>
              <span className="text-lg font-bold text-keystone-amber">{risk.score} / 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Hero: Cytoscape Graph DAG */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-keystone-amber" />
            <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-slate-200">
              FalkorDB Shortest Path Traversal
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Path Depth: {paths[0]?.depth ?? (vuln.is_direct ? 1 : 2)} hops
          </span>
        </div>

        <div className="h-[420px] w-full rounded border border-surface-border overflow-hidden bg-background relative">
          <CytoscapeGraph
            paths={paths}
            highlightedPurl={vuln.affected_component_purl}
            onNodeSelect={(node) => setSelectedNode(node)}
          />
        </div>
      </div>

      {/* Two-Column Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Risk Breakdown & Simulation */}
        <div className="space-y-6">
          {/* Transparent Score Breakdown Card */}
          <ScoreBreakdownCard
            score={risk.score}
            tier={risk.tier}
            breakdown={risk.breakdown}
            disclaimer={risk.disclaimer}
          />

          {/* What-If Upgrade Simulator (FalkorDB GRAPH.COPY) */}
          <div className="bg-surface border border-surface-border rounded p-5 space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-keystone-amber" />
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  What-If Simulation Proof
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">FalkorDB GRAPH.COPY</span>
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              Before modifying dependency manifests, execute an isolated what-if simulation on an ephemeral FalkorDB graph clone to verify vulnerability resolution and rule out regressions.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={targetVersion}
                onChange={(e) => setTargetVersion(e.target.value)}
                placeholder="Target version (e.g. 2.17.1)"
                className="flex-1 bg-surface-secondary border border-surface-border rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-keystone-amber"
              />
              <button
                onClick={handleSimulate}
                disabled={simulating || !targetVersion}
                className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-keystone-amber text-slate-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {simulating ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Simulating...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    <span>Run What-If</span>
                  </>
                )}
              </button>
            </div>

            {/* Simulation Results Display */}
            {simResult && (
              <div className={`p-4 rounded border text-xs space-y-3 ${
                simResult.verified
                  ? "bg-emerald-950/40 border-emerald-800"
                  : "bg-amber-950/40 border-amber-800"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Simulation Proof Result</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    simResult.verified
                      ? "bg-emerald-900 text-emerald-300"
                      : "bg-amber-900 text-amber-300"
                  }`}>
                    {simResult.verified ? "VERIFIED SAFE TO UPGRADE" : "PARTIAL RESOLUTION"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="bg-surface/80 p-2 rounded border border-surface-border">
                    <span className="text-slate-400 block text-[9px]">RESOLVED</span>
                    <span className="text-emerald-400 font-bold text-sm block">
                      {simResult.resolved_cves?.length ?? 0} CVEs
                    </span>
                  </div>
                  <div className="bg-surface/80 p-2 rounded border border-surface-border">
                    <span className="text-slate-400 block text-[9px]">REMAINING</span>
                    <span className="text-slate-200 font-bold text-sm block">
                      {simResult.remaining_cves?.length ?? 0}
                    </span>
                  </div>
                  <div className="bg-surface/80 p-2 rounded border border-surface-border">
                    <span className="text-slate-400 block text-[9px]">REGRESSIONS</span>
                    <span className="text-rose-400 font-bold text-sm block">
                      {simResult.newly_introduced_cves?.length ?? 0}
                    </span>
                  </div>
                </div>

                {simResult.resolved_cves && simResult.resolved_cves.length > 0 && (
                  <div className="text-[11px] text-slate-300">
                    <span className="text-slate-400">Resolved IDs: </span>
                    {simResult.resolved_cves.join(", ")}
                  </div>
                )}

                {/* Propose Action Button */}
                <div className="pt-2 border-t border-surface-border/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Requires security engineer approval</span>
                  {actionProposed ? (
                    <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Action Proposed in Queue
                    </span>
                  ) : (
                    <button
                      onClick={handleProposeFix}
                      disabled={proposing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                    >
                      <Wrench className="h-3 w-3" />
                      <span>{proposing ? "Submitting..." : "Propose Fix to Queue"}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive AI Security Agent */}
        <div className="space-y-6">
          <div className="bg-surface border border-surface-border rounded p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-keystone-amber" />
                <h3 className="text-sm font-semibold uppercase tracking-wider font-mono text-slate-200">
                  Agentic Graph Investigation
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">Live SSE Stream</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Ask natural language security questions. The agent executes validated OpenCypher graph queries on FalkorDB with a complete inspectable timeline.
            </p>

            <AgentPanel
              workspaceId={workspaceId}
              onSelectFinding={(id) => router.push(`/findings/${encodeURIComponent(id)}`)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
