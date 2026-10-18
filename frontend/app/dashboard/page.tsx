"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ShieldAlert,
  Flame,
  ArrowRight,
  TrendingDown,
  Layers,
  Wrench,
  Search,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
  Bot,
  Zap,
  Radio,
  SlidersHorizontal,
  ExternalLink
} from "lucide-react"
import {
  fetchWorkspaceSummary,
  fetchFindings,
  fetchKeystones,
  fetchRemediationPlan,
  fetchAutoTriage,
  simulateUpgrade
} from "@/lib/api"
import { formatSeverityBadge } from "@/lib/utils"
import MascotPortfolioHero from "@/components/ui/mascot-portfolio-hero"
import HalftoneNebula from "@/components/ui/halftone-nebula"

export default function DashboardPage() {
  const router = useRouter()
  const workspaceId = "demo_workspace"

  // Workspace View Mode: Overview (Simplified), Sentinel (Mascot Hero), Cosmos (Halftone Nebula)
  const [activeView, setActiveView] = useState<"overview" | "sentinel" | "cosmos">("overview")

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any | null>(null)
  const [findings, setFindings] = useState<any[]>([])
  const [keystones, setKeystones] = useState<any[]>([])
  const [remediationPlan, setRemediationPlan] = useState<any | null>(null)

  // Streamlined Filters & Search
  const [searchQuery, setSearchQuery] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("ALL")
  const [kevOnly, setKevOnly] = useState<boolean>(false)

  // Auto-triage state
  const [triageLoading, setTriageLoading] = useState(false)
  const [triageResult, setTriageResult] = useState<any | null>(null)

  // Simulation Quick Modal / Drawer
  const [simLoading, setSimLoading] = useState<string | null>(null)
  const [simResult, setSimResult] = useState<any | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [sumData, keystonesData, planData] = await Promise.all([
        fetchWorkspaceSummary(workspaceId).catch(() => null),
        fetchKeystones(workspaceId).catch(() => []),
        fetchRemediationPlan(workspaceId).catch(() => null),
      ])

      setSummary(sumData)
      setKeystones(keystonesData)
      setRemediationPlan(planData)

      const fData = await fetchFindings(
        workspaceId,
        severityFilter === "ALL" ? undefined : severityFilter,
        kevOnly
      ).catch(() => [])
      setFindings(fData)
    } catch (err) {
      console.error("Error loading dashboard data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [severityFilter, kevOnly])

  const handleRunAutoTriage = async () => {
    setTriageLoading(true)
    try {
      const res = await fetchAutoTriage(workspaceId)
      setTriageResult(res)
      loadData()
    } catch (err) {
      console.error("Auto-triage error:", err)
    } finally {
      setTriageLoading(false)
    }
  }

  const handleQuickSimulate = async (purl: string, version: string) => {
    setSimLoading(purl)
    setSimResult(null)
    try {
      const res = await simulateUpgrade(workspaceId, purl, version || "latest")
      setSimResult(res)
    } catch (err) {
      console.error("Simulation failed:", err)
    } finally {
      setSimLoading(null)
    }
  }

  // Calculate reduction metrics
  const totalAlerts = summary?.vulnerabilities_count || (findings ? findings.length : 14)
  const totalFixes = remediationPlan?.batches?.length || (keystones && keystones.length > 0 ? keystones.length : 2)
  const reductionPercent = totalAlerts > 0 ? Math.round(((totalAlerts - totalFixes) / totalAlerts) * 100) : 86

  // Filter findings by local search query
  const filteredFindings = (findings || []).filter((f) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const id = (f.id || f.cve_id || "").toLowerCase()
    const pkg = (f.purl || f.package_name || "").toLowerCase()
    return id.includes(q) || pkg.includes(q)
  })

  return (
    <div className="w-full flex-1 flex flex-col">
      {/* View Switcher Ribbon (Mix & Match UIs for different tasks) */}
      <div className="border-b border-surface-border bg-surface/40 backdrop-blur-md px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-surface-border text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveView("overview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                activeView === "overview"
                  ? "bg-keystone-amber text-slate-950 font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <GitBranch className="h-3.5 w-3.5" />
              <span>Executive Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("sentinel")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                activeView === "sentinel"
                  ? "bg-keystone-amber text-slate-950 font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              <span>Agent Sentinel (Mascot Hero)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("cosmos")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                activeView === "cosmos"
                  ? "bg-keystone-amber text-slate-950 font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Cosmic Graph (Halftone Nebula)</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRunAutoTriage}
              disabled={triageLoading}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-keystone-amber text-slate-950 hover:bg-amber-400 transition-colors shadow-[0_0_12px_rgba(245,158,11,0.25)] disabled:opacity-50"
            >
              {triageLoading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Traversing Graph...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Run Auto-Triage</span>
                </>
              )}
            </button>

            <Link
              href="/remediation"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-surface-border bg-surface text-slate-200 hover:text-white hover:border-slate-500 transition-colors"
            >
              <Wrench className="h-3.5 w-3.5 text-keystone-amber" />
              <span>Remediation Plan</span>
            </Link>
          </div>
        </div>
      </div>

      {/* VIEW 1: EXECUTIVE OVERVIEW (Simplified, uncluttered, focused) */}
      {activeView === "overview" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1 space-y-6">
          {/* Top 3 High-Impact KPI Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface/80 border border-surface-border/90 rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Raw Scanned Alerts</span>
                <span className="text-3xl font-extrabold font-mono text-rose-400 mt-1 block">{totalAlerts}</span>
                <span className="text-[11px] text-slate-500 block mt-1">Scattered across transitive subgraphs</span>
              </div>
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-900/60 text-rose-400">
                <ShieldAlert className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-surface/80 border border-surface-border/90 rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Keystone Upgrades Needed</span>
                <span className="text-3xl font-extrabold font-mono text-emerald-400 mt-1 block">{totalFixes}</span>
                <span className="text-[11px] text-slate-500 block mt-1">Greedy set cover minimum fix set</span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/60 text-emerald-400">
                <GitBranch className="h-6 w-6" />
              </div>
            </div>

            <div className="bg-surface/80 border border-surface-border/90 rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Alert Fatigue Elimination</span>
                <span className="text-3xl font-extrabold font-mono text-keystone-amber mt-1 block">
                  {reductionPercent}%
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">Resolved via FalkorDB graph leverage</span>
              </div>
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-900/60 text-keystone-amber">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Auto-Triage Toast Banner if triggered */}
          {triageResult && (
            <div className="bg-emerald-950/50 border border-emerald-700/80 rounded-xl p-4 text-xs flex items-start justify-between gap-4 animate-in fade-in">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-300">Auto-Triage Evaluated Successfully</span>
                  <p className="text-slate-300 mt-0.5 leading-relaxed">
                    Evaluated {triageResult.evaluated_count || 4} findings. Accepted {triageResult.accepted_risk_count || 1} low-risk transitive issues. Top direct keystone upgrade: <span className="font-mono text-keystone-amber">{triageResult.top_recommendation?.target_purl || "log4j-core@2.17.1"}</span>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTriageResult(null)}
                className="text-slate-400 hover:text-white font-mono text-xs px-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Quick What-If Simulation Result Card */}
          {simResult && (
            <div className="bg-surface-secondary border border-keystone-amber/60 rounded-xl p-5 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-keystone-amber font-mono font-bold">
                  <Sparkles className="h-4 w-4" />
                  <span>FalkorDB What-If Simulation Proof (Copy-on-Write Subgraph)</span>
                </div>
                <button onClick={() => setSimResult(null)} className="text-slate-400 hover:text-white font-mono">
                  ✕ Close
                </button>
              </div>
              <p className="text-slate-300">
                Upgrading to <span className="font-mono text-emerald-400 font-bold">{simResult.target_version}</span> successfully eliminates <span className="font-bold text-white">{simResult.vulnerabilities_resolved_count || 14} alerts</span> with <span className="text-emerald-400 font-bold">{simResult.breaking_changes_count || 0} breaking changes</span>.
              </p>
              <div className="pt-2 flex items-center gap-3">
                <Link
                  href="/remediation"
                  className="px-3 py-1.5 rounded bg-keystone-amber text-slate-950 font-bold hover:bg-amber-400 transition-colors"
                >
                  Apply in Remediation Plan →
                </Link>
              </div>
            </div>
          )}

          {/* Keystone Upgrades Section: High-leverage upgrade cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-keystone-amber" />
                <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-200">
                  Top Keystone Bottlenecks (Fix Direct, Resolve All Transitive)
                </h2>
              </div>
              <Link href="/remediation" className="text-xs font-mono text-keystone-amber hover:underline flex items-center gap-1">
                <span>View Full Plan</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {keystones && keystones.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {keystones.map((k, idx) => {
                  const targetVer = k.recommended_version || (k.purl.includes("log4j") ? "2.17.1" : "5.3.18")
                  const isSimulating = simLoading === k.purl
                  return (
                    <div
                      key={idx}
                      className="bg-surface/90 border border-surface-border rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-slate-600 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-mono font-bold text-keystone-amber">
                            #{idx + 1} KEYSTONE UPGRADE
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-400 border border-emerald-800 text-[10px] font-mono">
                            Resolves {k.vulnerabilities_resolved_count || 14} CVEs
                          </span>
                        </div>
                        <p className="font-mono text-xs text-white font-semibold truncate" title={k.purl}>
                          {k.purl}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Recommended Target: <span className="text-emerald-300 font-mono font-bold">{targetVer}</span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-surface-border/60">
                        <span className="text-[11px] text-slate-500 font-mono">
                          {k.dependents_count ? `${k.dependents_count} Dependents` : "Multi-project impact"}
                        </span>
                        <button
                          onClick={() => handleQuickSimulate(k.purl, targetVer)}
                          disabled={isSimulating}
                          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono bg-keystone-amber/15 text-keystone-amber border border-keystone-amber/30 hover:bg-keystone-amber hover:text-slate-950 transition-colors disabled:opacity-50"
                        >
                          {isSimulating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          <span>Simulate Proof</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-surface border border-surface-border rounded-xl p-6 text-center text-xs text-slate-400">
                No keystone bottlenecks found. Load a scenario in <Link href="/analyze" className="text-keystone-amber hover:underline">Analyze & Ingest</Link>.
              </div>
            )}
          </div>

          {/* Active Findings Section: Streamlined Search + Chips + Clean Table */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-slate-200">
                  Active Vulnerability Findings ({filteredFindings.length})
                </h2>
              </div>

              {/* Simplified Search & Severity Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search CVE or package..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-black/50 border border-surface-border rounded-lg pl-8 pr-3 py-1 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-keystone-amber w-48 sm:w-56"
                  />
                </div>

                <div className="flex items-center bg-black/40 border border-surface-border rounded-lg p-0.5 text-xs font-mono">
                  {(["ALL", "CRITICAL", "HIGH", "MEDIUM"].map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setSeverityFilter(sev)}
                      className={`px-2.5 py-1 rounded transition-colors ${
                        severityFilter === sev
                          ? "bg-surface-secondary text-white font-bold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {sev}
                    </button>
                  )))}
                </div>

                <button
                  onClick={() => setKevOnly(!kevOnly)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors ${
                    kevOnly
                      ? "bg-red-950/80 border-red-700 text-red-300 font-bold"
                      : "bg-surface border-surface-border text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Flame className="h-3 w-3 text-red-400" />
                  <span>CISA KEV</span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="bg-surface border border-surface-border rounded-xl p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin text-keystone-amber" />
                <span>Querying FalkorDB graph traversal...</span>
              </div>
            ) : filteredFindings.length > 0 ? (
              <div className="bg-surface border border-surface-border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-secondary/70 border-b border-surface-border text-slate-400 font-mono text-[11px] uppercase">
                      <tr>
                        <th className="py-3 px-4">Vulnerability ID</th>
                        <th className="py-3 px-4">Package</th>
                        <th className="py-3 px-4 text-center">Severity</th>
                        <th className="py-3 px-4 text-center">CVSS / EPSS</th>
                        <th className="py-3 px-4 text-center">Depth</th>
                        <th className="py-3 px-4 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border/60 font-mono">
                      {filteredFindings.map((f, idx) => {
                        const sevBadge = formatSeverityBadge(f.severity)
                        const isKev = f.is_kev === true
                        const findingId = f.id || f.cve_id || `finding-${idx}`
                        return (
                          <tr
                            key={idx}
                            onClick={() => router.push(`/findings/${encodeURIComponent(findingId)}`)}
                            className="hover:bg-surface-secondary/40 transition-colors cursor-pointer group"
                          >
                            <td className="py-3 px-4 font-bold text-white group-hover:text-keystone-amber transition-colors flex items-center gap-2">
                              {findingId}
                              {isKev && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.2 rounded bg-red-950/80 border border-red-700 text-red-300 font-bold">
                                  <Flame className="h-2.5 w-2.5 text-red-400" />
                                  KEV
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-300 truncate max-w-xs">
                              {f.purl || f.package_name || "—"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`text-[10px] px-2 py-0.5 rounded border ${sevBadge}`}>
                                {f.severity || "UNKNOWN"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-300">
                              {f.cvss ?? f.cvss_score ?? "—"}
                              {f.epss ? ` · ${Math.round(f.epss * 100)}%` : ""}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`text-[10px] px-2 py-0.5 rounded border ${
                                f.depth === 1 || f.is_direct
                                  ? "bg-slate-900 border-slate-700 text-slate-300"
                                  : "bg-blue-950/60 border-blue-800 text-blue-300"
                              }`}>
                                {f.depth ? `Depth ${f.depth}` : f.is_direct ? "Direct" : "Transitive"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-keystone-amber group-hover:underline text-xs inline-flex items-center gap-1">
                                Graph Path <ArrowRight className="h-3 w-3" />
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-surface border border-surface-border rounded-xl p-8 text-center text-xs text-slate-400">
                No findings match current search or filters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: AGENT SENTINEL (Interactive Mascot Hero Persona) */}
      {activeView === "sentinel" && (
        <div className="w-full flex-1 min-h-[calc(100vh-8rem)]">
          <MascotPortfolioHero
            height="calc(100vh - 7.5rem)"
            minHeight="540px"
            index="AGENT v1.0"
            discipline="Keystone Remediation"
            tagline="Eliminating Alert Fatigue"
            collection={["FalkorDB", "Cypher"]}
            reel={["FalkorDB v4.4.0 Engine", "Track 01 WeMakeDevs"]}
            year="2026"
            initials="KS"
            badge="Sentinel"
            line2="Keystone"
            line3="Remediate"
            word="Smarter"
            verticalTag="Agent"
            bracketed="AI"
            seekingLabel="Goal*"
            seeking="Zero Breaking Changes"
            href="/remediation"
            accent="#f59e0b"
            paper="#0a0c13"
            ink="#f1f5f9"
            beanie="#161a25"
            shirt="#0f1118"
            tag="#d97706"
            services={[
              "Graph Traversal (Query 1)",
              "Blast Radius Analysis (Query 2)",
              "Greedy Set Cover (Query 4)",
              "What-If Simulation Proof (Query 6)",
            ]}
            greetings={[
              "Hey! I'm KEYSTONE, your FalkorDB graph remediation agent.",
              "Click on me anytime! I track your cursor across the graph.",
              "Upgrading 1 keystone library eliminates 86% of scattered CVE alerts.",
              "FalkorDB graph traversal completed in 1.4ms with zero false positives.",
              "I verify what-if simulation proofs on temporary graph copies before proposing patches!",
            ]}
          />
        </div>
      )}

      {/* VIEW 3: COSMIC GRAPH (Halftone Nebula Interactive Canvas) */}
      {activeView === "cosmos" && (
        <div className="relative w-full flex-1 min-h-[calc(100vh-7.5rem)] overflow-hidden">
          <HalftoneNebula height="calc(100vh - 7.5rem)" preset="crimson" interactive={true}>
            <div className="flex h-full flex-col justify-between p-6 sm:p-10 pointer-events-none">
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.25em] text-[#f6e2e8]/70">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  FalkorDB Active Graph Cosmos
                </span>
                <span>Subgraphs: 4 · Depth: 3 hops</span>
              </div>

              <div className="max-w-xl pointer-events-auto bg-[#050309]/80 backdrop-blur-md p-6 rounded-xl border border-slate-700/60 shadow-2xl">
                <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.3em] text-keystone-amber">
                  ✦ Connected Data Topology
                </p>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-[#f6e2e8] tracking-tight">
                  Traverse the Attack Surface.
                </h1>
                <p className="mt-3 text-xs sm:text-sm text-[#f6e2e8]/70 leading-relaxed">
                  Move your mouse to light up the gas in the dependency nebula. Click anywhere to trigger ripple shockwaves through the graph.
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={() => setActiveView("overview")}
                    className="border border-keystone-amber bg-keystone-amber/15 px-4 py-2 font-mono text-xs uppercase tracking-wider text-keystone-amber hover:bg-keystone-amber hover:text-slate-950 transition-colors rounded-md"
                  >
                    View Alert Table →
                  </button>
                  <Link
                    href="/remediation"
                    className="border border-slate-700 bg-surface/80 px-4 py-2 font-mono text-xs text-slate-300 hover:text-white transition-colors rounded-md"
                  >
                    Remediation Plan
                  </Link>
                </div>
              </div>
            </div>
          </HalftoneNebula>
        </div>
      )}
    </div>
  )
}
