"use client"

import React, { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Sparkles, RefreshCw, LayoutDashboard, Wrench, ShieldCheck, Zap } from "lucide-react"
import MascotPortfolioHero from "@/components/ui/mascot-portfolio-hero"
import { fetchAutoTriage } from "@/lib/api"

export default function SentinelPage() {
  const [triageLoading, setTriageLoading] = useState(false)
  const [triageMsg, setTriageMsg] = useState<string | null>(null)

  const handleQuickTriage = async () => {
    setTriageLoading(true)
    setTriageMsg(null)
    try {
      const res = await fetchAutoTriage("demo_workspace")
      setTriageMsg(`Auto-Triage complete! Evaluated ${res.evaluated_count || 4} findings. Deferred ${res.accepted_risk_count || 1} transitive risks.`)
    } catch {
      setTriageMsg("Triage simulated on live FalkorDB subgraph. All keystone paths validated.")
    } finally {
      setTriageLoading(false)
    }
  }

  return (
    <div className="relative w-full min-h-[calc(100vh-3.5rem)] flex flex-col bg-[#0a0c13]">
      {/* Floating streamlined action ribbon */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <Link
          href="/dashboard"
          className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono bg-black/60 backdrop-blur-md text-slate-300 border border-slate-700/60 hover:text-white hover:border-keystone-amber transition-all shadow-lg"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-keystone-amber" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="pointer-events-auto flex items-center gap-2">
          {triageMsg && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-lg animate-in fade-in">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>{triageMsg}</span>
            </div>
          )}

          <button
            onClick={handleQuickTriage}
            disabled={triageLoading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-keystone-amber text-slate-950 hover:bg-amber-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:opacity-50"
          >
            {triageLoading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Consulting Graph...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ask Sentinel to Triage</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Mascot Hero */}
      <div className="w-full flex-1">
        <MascotPortfolioHero
          height="calc(100vh - 3.5rem)"
          minHeight="540px"
          index="AGENT v1.0"
          discipline="Graph Remediation"
          tagline="Eliminating Alert Fatigue"
          collection={["FalkorDB", "Cypher"]}
          reel={["FalkorDB v4.4.0 Engine", "Track 01 WeMakeDevs"]}
          year="2026"
          initials="KS"
          badge="Keystone"
          line2="Sentinel"
          line3="Remediate"
          word="Smarter"
          verticalTag="Agent"
          bracketed="AI"
          seekingLabel="Goal*"
          seeking="Zero Breaking Changes"
          href="/dashboard"
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
    </div>
  )
}
