"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import {
  Wrench,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  GitBranch,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  Clock,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Layers,
  FileCode
} from "lucide-react"
import {
  fetchRemediationPlan,
  fetchActions,
  simulateUpgrade,
  proposeAction,
  approveAction,
  rejectAction
} from "@/lib/api"

export default function RemediationPage() {
  const workspaceId = "demo_workspace"

  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<any | null>(null)
  const [actions, setActions] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<"plan" | "queue">("plan")

  // Simulation modal state
  const [simModalOpen, setSimModalOpen] = useState(false)
  const [simBatch, setSimBatch] = useState<any | null>(null)
  const [simLoading, setSimLoading] = useState(false)
  const [simResult, setSimResult] = useState<any | null>(null)

  // Action status state
  const [proposingBatchId, setProposingBatchId] = useState<string | null>(null)
  const [approvingActionId, setApprovingActionId] = useState<string | null>(null)
  const [rejectingActionId, setRejectingActionId] = useState<string | null>(null)
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null)
  const [expandedPreview, setExpandedPreview] = useState<Set<string>>(new Set())

  const loadData = async () => {
    setLoading(true)
    try {
      const [planData, actionsData] = await Promise.all([
        fetchRemediationPlan(workspaceId).catch(() => null),
        fetchActions(workspaceId).catch(() => []),
      ])
      setPlan(planData)
      setActions(actionsData)
    } catch (err) {
      console.error("Error loading remediation data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleOpenSimulate = async (batch: any) => {
    setSimBatch(batch)
    setSimModalOpen(true)
    setSimLoading(true)
    setSimResult(null)
    try {
      const res = await simulateUpgrade(
        workspaceId,
        batch.component_purl,
        batch.recommended_version
      )
      setSimResult(res)
    } catch (err) {
      console.error("Simulation error:", err)
    } finally {
      setSimLoading(false)
    }
  }

  const handlePropose = async (batch: any) => {
    setProposingBatchId(batch.batch_id)
    try {
      await proposeAction(
        workspaceId,
        batch.batch_id,
        batch.component_purl,
        batch.recommended_version
      )
      setActionSuccessMsg(`Action proposed for ${batch.package_name} -> ${batch.recommended_version}`)
      const updatedActions = await fetchActions(workspaceId).catch(() => [])
      setActions(updatedActions)
    } catch (err) {
      console.error("Propose action error:", err)
    } finally {
      setProposingBatchId(null)
    }
  }

  const handleApprove = async (actionId: string) => {
    setApprovingActionId(actionId)
    try {
      const res = await approveAction(workspaceId, actionId)
      setActionSuccessMsg(res.message || "Action approved successfully.")
      const updatedActions = await fetchActions(workspaceId).catch(() => [])
      setActions(updatedActions)
    } catch (err) {
      console.error("Approval error:", err)
    } finally {
      setApprovingActionId(null)
    }
  }

  const handleReject = async (actionId: string) => {
    setRejectingActionId(actionId)
    try {
      await rejectAction(workspaceId, actionId)
      setActionSuccessMsg("Action rejected.")
      const updatedActions = await fetchActions(workspaceId).catch(() => [])
      setActions(updatedActions)
    } catch (err) {
      console.error("Reject error:", err)
    } finally {
      setRejectingActionId(null)
    }
  }

  const togglePreview = (id: string) => {
    setExpandedPreview((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const batches = plan?.recommended_batches || []
  const proposedCount = actions.filter((a) => a.status === "PROPOSED").length
  const approvedCount = actions.filter((a) => a.status === "APPROVED").length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-surface-border gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-keystone-amber uppercase tracking-wider mb-1">
            <Wrench className="h-3.5 w-3.5" />
            <span>FalkorDB Greedy Set Cover</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Remediation & Action Approval Queue
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            Direct dependency upgrades prioritized by maximum transitive vulnerability coverage. Every action requires explicit human verification before execution.
          </p>
        </div>

        {/* Action queue quick indicator */}
        <div className="flex items-center gap-3">
          <div className="bg-surface border border-surface-border rounded px-3 py-2 text-xs font-mono flex items-center gap-3">
            <div>
              <span className="text-slate-400 block text-[10px]">PENDING APPROVAL</span>
              <span className="text-amber-400 font-bold">{proposedCount}</span>
            </div>
            <div className="w-px h-6 bg-surface-border" />
            <div>
              <span className="text-slate-400 block text-[10px]">APPROVED</span>
              <span className="text-emerald-400 font-bold">{approvedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMsg && (
        <div className="bg-emerald-950/40 border border-emerald-800 rounded p-4 text-xs flex items-center justify-between gap-3 text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-slate-400 hover:text-white font-mono">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-border">
        <button
          onClick={() => setActiveTab("plan")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === "plan"
              ? "border-keystone-amber text-keystone-amber bg-surface"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Recommended Fix Batches ({batches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("queue")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === "queue"
              ? "border-keystone-amber text-keystone-amber bg-surface"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Human-in-the-Loop Action Queue ({actions.length})</span>
        </button>
      </div>

      {/* Tab 1: Recommended Batches */}
      {activeTab === "plan" && (
        <div className="space-y-6">
          {/* Executive leverage summary */}
          <div className="bg-surface border border-surface-border rounded p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-mono">
              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Total Findings Resolved</span>
                <span className="text-2xl font-bold text-white mt-1 block">
                  {plan?.total_vulnerabilities || 0} CVEs
                </span>
                <span className="text-xs text-slate-500 mt-1 block">Across all transitive subgraphs</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Target Upgrades Required</span>
                <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                  {batches.length} Direct Upgrades
                </span>
                <span className="text-xs text-slate-500 mt-1 block">Minimum greedy set cover</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Risk Reduction Leverage</span>
                <span className="text-2xl font-bold text-keystone-amber mt-1 block">
                  {plan?.potential_risk_reduction_pct ?? 100}%
                </span>
                <span className="text-xs text-slate-500 mt-1 block">FalkorDB verified proof</span>
              </div>
            </div>
          </div>

          {/* Batches list */}
          <div className="space-y-4">
            {batches.map((b: any, idx: number) => {
              const isBatchProposing = proposingBatchId === b.batch_id
              return (
                <div
                  key={b.batch_id || idx}
                  className="bg-surface border border-surface-border rounded p-6 hover:border-slate-600 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-surface-secondary text-keystone-amber border border-surface-border">
                          BATCH #{b.rank || idx + 1}
                        </span>
                        <h3 className="text-base font-bold text-white font-mono">
                          {b.package_name}
                        </h3>
                        <span className="text-xs font-mono text-slate-400">
                          {b.current_version} &rarr; <span className="text-emerald-400 font-semibold">{b.recommended_version}</span>
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 font-mono truncate max-w-2xl">
                        {b.component_purl}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenSimulate(b)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-surface-secondary border border-surface-border text-slate-200 hover:text-white hover:border-slate-500 transition-colors"
                      >
                        <Play className="h-3 w-3 text-keystone-amber" />
                        <span>Simulate Fix</span>
                      </button>

                      <button
                        onClick={() => handlePropose(b)}
                        disabled={isBatchProposing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-keystone-amber text-slate-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
                      >
                        <Wrench className="h-3 w-3" />
                        <span>{isBatchProposing ? "Proposing..." : "Propose to Queue"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Resolved Vulnerabilities Chips */}
                  <div className="pt-3 border-t border-surface-border/60">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                      <span>Resolves {b.resolved_count} Vulnerabilities:</span>
                      <span className="text-keystone-amber">Leverage Score: {b.leverage_score}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {b.resolved_vulnerability_ids?.map((vulnId: string) => (
                        <Link
                          key={vulnId}
                          href={`/findings/${encodeURIComponent(vulnId)}`}
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-secondary border border-surface-border text-slate-300 hover:text-keystone-amber hover:border-slate-500 transition-colors inline-flex items-center gap-1"
                        >
                          <span>{vulnId}</span>
                          <ArrowRight className="h-2.5 w-2.5 text-slate-500" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Action Approval Queue */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-slate-200">
              Pending & Executed Actions
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Strict Model Safety: Human approval required for draft generation
            </span>
          </div>

          {actions && actions.length > 0 ? (
            <div className="space-y-4">
              {actions.map((act) => {
                const isApproved = act.status === "APPROVED"
                const isRejected = act.status === "REJECTED"
                const isProposed = act.status === "PROPOSED"
                const isExpanded = expandedPreview.has(act.id)

                let statusBadge = "bg-amber-950/70 border-amber-800 text-amber-300"
                if (isApproved) statusBadge = "bg-emerald-950/70 border-emerald-800 text-emerald-300"
                if (isRejected) statusBadge = "bg-rose-950/70 border-rose-800 text-rose-300"

                return (
                  <div
                    key={act.id}
                    className="bg-surface border border-surface-border rounded p-5 space-y-4 font-mono text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-border">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusBadge}`}>
                          {act.status}
                        </span>
                        <span className="text-slate-400">Action:</span>
                        <span className="text-white font-semibold">{act.type}</span>
                        <span className="text-slate-500 text-[11px]">({act.id})</span>
                      </div>

                      {/* Approval controls */}
                      {isProposed && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(act.id)}
                            disabled={approvingActionId === act.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
                          >
                            <ThumbsUp className="h-3 w-3" />
                            <span>{approvingActionId === act.id ? "Approving..." : "Approve Fix"}</span>
                          </button>

                          <button
                            onClick={() => handleReject(act.id)}
                            disabled={rejectingActionId === act.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-surface-secondary border border-surface-border text-rose-400 hover:bg-rose-950/40 transition-colors disabled:opacity-50"
                          >
                            <ThumbsDown className="h-3 w-3" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}

                      {isApproved && (
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Approved & Patch Drafted</span>
                        </div>
                      )}

                      {isRejected && (
                        <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-xs">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>Rejected by Security Engineer</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-300">
                      <div>
                        <span className="text-slate-500 block text-[10px]">TARGET COMPONENT</span>
                        <span className="text-white truncate block mt-0.5">{act.target_purl}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">RECOMMENDED TARGET VERSION</span>
                        <span className="text-emerald-400 font-bold block mt-0.5">{act.recommended_version}</span>
                      </div>
                    </div>

                    {/* Collapsible Markdown Preview */}
                    {act.preview_markdown && (
                      <div className="pt-2">
                        <button
                          onClick={() => togglePreview(act.id)}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          <span>{isExpanded ? "Hide Draft Markdown Preview" : "View Draft GitHub Issue / PR Markdown"}</span>
                        </button>

                        {isExpanded && (
                          <div className="mt-2 p-3 bg-surface-secondary rounded border border-surface-border font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                            {act.preview_markdown}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-surface border border-surface-border rounded p-8 text-center text-xs text-slate-400">
              No actions have been proposed yet. Review the recommended batches above and click "Propose to Queue" to initiate remediation workflows.
            </div>
          )}
        </div>
      )}

      {/* What-If Simulation Diff Modal */}
      {simModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border rounded-lg max-w-xl w-full p-6 space-y-5 font-mono shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-keystone-amber" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  FalkorDB What-If Simulation Proof
                </h3>
              </div>
              <button
                onClick={() => setSimModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            {simLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="h-6 w-6 animate-spin text-keystone-amber" />
                <span>Cloning scratch graph via GRAPH.COPY & validating regression invariants...</span>
              </div>
            ) : simResult ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">
                    Upgrading {simBatch?.package_name}: {simBatch?.current_version} &rarr; <span className="text-emerald-400 font-bold">{simBatch?.recommended_version}</span>
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    simResult.verified
                      ? "bg-emerald-900 text-emerald-300"
                      : "bg-amber-900 text-amber-300"
                  }`}>
                    {simResult.verified ? "VERIFIED SAFE" : "PARTIAL FIX"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-surface-secondary p-3 rounded border border-surface-border">
                    <span className="text-slate-400 block text-[9px]">RESOLVED</span>
                    <span className="text-emerald-400 font-bold text-base block mt-0.5">
                      {simResult.resolved_cves?.length ?? 0} CVEs
                    </span>
                  </div>
                  <div className="bg-surface-secondary p-3 rounded border border-surface-border">
                    <span className="text-slate-400 block text-[9px]">REMAINING</span>
                    <span className="text-slate-200 font-bold text-base block mt-0.5">
                      {simResult.remaining_cves?.length ?? 0}
                    </span>
                  </div>
                  <div className="bg-surface-secondary p-3 rounded border border-surface-border">
                    <span className="text-slate-400 block text-[9px]">REGRESSIONS</span>
                    <span className="text-rose-400 font-bold text-base block mt-0.5">
                      {simResult.newly_introduced_cves?.length ?? 0}
                    </span>
                  </div>
                </div>

                {simResult.resolved_cves && simResult.resolved_cves.length > 0 && (
                  <div className="p-3 bg-surface-secondary/70 rounded border border-surface-border text-[11px] text-slate-300">
                    <span className="text-slate-400 font-semibold block mb-1">Resolved Vulnerability IDs:</span>
                    <div className="flex flex-wrap gap-1">
                      {simResult.resolved_cves.map((id: string) => (
                        <span key={id} className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800 text-[10px]">
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Ephemeral graph was cloned, mutated, re-analyzed for reachability, and safely dropped. Original graph was unaltered.
                </p>

                <div className="pt-3 border-t border-surface-border flex items-center justify-end gap-3">
                  <button
                    onClick={() => setSimModalOpen(false)}
                    className="px-3 py-1.5 rounded text-xs bg-surface-secondary border border-surface-border text-slate-300 hover:text-white"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handlePropose(simBatch)
                      setSimModalOpen(false)
                    }}
                    className="px-3.5 py-1.5 rounded text-xs font-semibold bg-keystone-amber text-slate-950 hover:bg-amber-400"
                  >
                    Propose Fix to Queue
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
