"use client"

import React from "react"
import { ShieldAlert, AlertTriangle, Info, TrendingUp, Layers } from "lucide-react"
import { formatSeverityBadge } from "@/lib/utils"

interface RiskAssessmentProps {
  score: number
  tier: string
  breakdown: {
    cvss_contribution: number
    kev_boost: number
    epss_contribution: number
    depth_exposure: number
    dependents_penalty: number
    path_depth: number
    is_direct: boolean
    is_kev: boolean
    epss_raw: number
    cvss_raw: number
    dependents_count: number
  }
  disclaimer?: string
}

export default function ScoreBreakdownCard({
  score,
  tier,
  breakdown,
  disclaimer,
}: RiskAssessmentProps) {
  return (
    <div className="bg-surface border border-surface-border rounded p-5 font-sans">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-border">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Graph Risk Assessment
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Transparent composite weighting derived from FalkorDB graph traversal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border ${formatSeverityBadge(
              tier
            )}`}
          >
            {tier}
          </span>
          <span className="text-lg font-bold font-mono text-white">
            {score.toFixed(1)}
            <span className="text-xs text-slate-500 font-normal">/10</span>
          </span>
        </div>
      </div>

      {/* Breakdown Rows */}
      <div className="space-y-2.5 text-xs font-mono">
        <div className="flex items-center justify-between py-1.5 px-2 bg-surface-secondary/40 rounded border border-surface-border/50">
          <div className="flex items-center gap-2 text-slate-300">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
            <span>Base Severity (CVSS {breakdown?.cvss_raw})</span>
          </div>
          <span className="font-semibold text-slate-200">
            +{breakdown?.cvss_contribution.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-between py-1.5 px-2 bg-surface-secondary/40 rounded border border-surface-border/50">
          <div className="flex items-center gap-2 text-slate-300">
            <AlertTriangle
              className={`h-3.5 w-3.5 ${
                breakdown?.is_kev ? "text-red-400 animate-pulse" : "text-slate-500"
              }`}
            />
            <span>CISA KEV Wild Exploitation</span>
          </div>
          <span
            className={`font-semibold ${
              breakdown?.is_kev ? "text-red-400" : "text-slate-500"
            }`}
          >
            {breakdown?.is_kev ? `+${breakdown.kev_boost.toFixed(2)}` : "None (0.00)"}
          </span>
        </div>

        <div className="flex items-center justify-between py-1.5 px-2 bg-surface-secondary/40 rounded border border-surface-border/50">
          <div className="flex items-center gap-2 text-slate-300">
            <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
            <span>EPSS Exploitation Probability ({((breakdown?.epss_raw || 0) * 100).toFixed(1)}%)</span>
          </div>
          <span className="font-semibold text-slate-200">
            +{breakdown?.epss_contribution.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-between py-1.5 px-2 bg-surface-secondary/40 rounded border border-surface-border/50">
          <div className="flex items-center gap-2 text-slate-300">
            <Layers className="h-3.5 w-3.5 text-sky-400" />
            <span>
              Path Exposure ({breakdown?.is_direct ? "Direct" : `Transitive, Hop ${breakdown?.path_depth}`})
            </span>
          </div>
          <span className="font-semibold text-slate-200">
            +{breakdown?.depth_exposure.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Methodology Disclaimer */}
      <div className="mt-4 pt-3 border-t border-surface-border/60 flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed font-sans">
        <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
        <p>
          {disclaimer ||
            "KEYSTONE computes exposure and blast radius along the declared and resolved dependency graph. It does not perform runtime call-graph reachability or bytecode execution path analysis."}
        </p>
      </div>
    </div>
  )
}
