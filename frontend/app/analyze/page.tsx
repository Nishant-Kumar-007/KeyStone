"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  UploadCloud,
  FileCode,
  Zap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Flame,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Search,
  SlidersHorizontal
} from "lucide-react"
import HalftoneNebula, { NEBULA_PRESETS } from "@/components/ui/halftone-nebula"
import { ingestSource, loadDemoFixture } from "@/lib/api"

export default function AnalyzePage() {
  const router = useRouter()
  const workspaceId = "demo_workspace"

  const [mode, setMode] = useState<"preset" | "purl" | "sbom">("preset")
  const [selectedPresetKey, setSelectedPresetKey] = useState<"log4j" | "spring4shell" | "axios" | "clean">("log4j")
  const [nebulaPalette, setNebulaPalette] = useState<keyof typeof NEBULA_PRESETS>("crimson")

  const [purlInput, setPurlInput] = useState("pkg:maven/org.apache.logging.log4j/log4j-core@2.14.1")
  const [projectName, setProjectName] = useState("acme-billing-service")
  const [sbomJson, setSbomJson] = useState("")

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  const scenarios = [
    {
      id: "log4j",
      title: "Log4Shell (CVE-2021-44228)",
      subtitle: "2-hop deep transitive dependency with CISA KEV active exploitation.",
      icon: Flame,
      severity: "CRITICAL",
      badgeColor: "bg-red-500/20 text-red-300 border-red-500/50",
      stats: "CVSS 10.0 · EPSS 96% · 14 Alerts",
      palette: "crimson" as const,
    },
    {
      id: "spring4shell",
      title: "Spring4Shell (CVE-2022-22965)",
      subtitle: "Direct framework RCE flaw across Spring WebMVC data-binder.",
      icon: Zap,
      severity: "CRITICAL",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/50",
      stats: "CVSS 9.8 · Direct Dependency",
      palette: "solar" as const,
    },
    {
      id: "axios",
      title: "Axios SSRF (CVE-2023-45857)",
      subtitle: "Client-side cross-domain redirect SSRF vulnerability.",
      icon: AlertCircle,
      severity: "HIGH",
      badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/50",
      stats: "CVSS 7.5 · Frontend Node.js",
      palette: "ultraviolet" as const,
    },
    {
      id: "clean",
      title: "Clean Baseline Service",
      subtitle: "Patched production microservice verifying zero false alarms.",
      icon: ShieldCheck,
      severity: "CLEAN",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50",
      stats: "0 Vulnerabilities · Healthy Subgraph",
      palette: "phosphor" as const,
    },
  ]

  const handleLaunchScenario = async (sc: typeof scenarios[0]) => {
    setSelectedPresetKey(sc.id as any)
    setNebulaPalette(sc.palette)
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await loadDemoFixture(sc.id as any, workspaceId)
      setResult(res.ingested || { status: "success", count: 1 })
    } catch (err: any) {
      setError(err.message || "Failed to load scenario")
    } finally {
      setLoading(false)
    }
  }

  const handlePurlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!purlInput.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await ingestSource(workspaceId, "purl", purlInput, projectName)
      setResult(res)
    } catch (err: any) {
      setError(err.message || "Failed to ingest PURL")
    } finally {
      setLoading(false)
    }
  }

  const handleSbomSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sbomJson.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await ingestSource(workspaceId, "cyclonedx", sbomJson, projectName)
      setResult(res)
    } catch (err: any) {
      setError(err.message || "Failed to ingest SBOM")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative w-full min-h-[calc(100vh-3.5rem)] overflow-hidden flex flex-col justify-between">
      {/* Halftone Nebula WebGL2 interactive background */}
      <div className="absolute inset-0 z-0">
        <HalftoneNebula
          height="100%"
          preset={nebulaPalette}
          interactive={true}
        />
      </div>

      {/* Top Bar with Palette Switcher & Context */}
      <div className="relative z-10 px-4 sm:px-6 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 text-xs font-mono text-slate-300">
          <Sparkles className="h-3.5 w-3.5 text-keystone-amber" />
          <span>Dependency Cosmos Scanner</span>
          <span className="text-slate-500">· Move cursor to light gas, click to drop stars</span>
        </div>

        {/* Nebula Theme Switcher */}
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-slate-700/60 text-[11px] font-mono">
          <SlidersHorizontal className="h-3 w-3 text-slate-400 mr-1" />
          {(["crimson", "ultraviolet", "abyssal", "solar", "phosphor"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setNebulaPalette(p)}
              className={`px-2 py-0.5 rounded-full capitalize transition-colors ${
                nebulaPalette === p
                  ? "bg-keystone-amber text-slate-950 font-bold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Main Glass Console - Simplified, high-contrast, uncluttered */}
      <div className="relative z-10 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="bg-[#0c0e17]/85 backdrop-blur-xl border border-slate-700/70 rounded-xl p-6 sm:p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto space-y-2 mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
              Scan & Ingest Dependencies
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Load a realistic vulnerability fixture into FalkorDB or input custom Package URLs to generate the dependency graph.
            </p>
          </div>

          {/* Clean Segmented Mode Selector */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex bg-black/50 p-1 rounded-lg border border-slate-700/60 text-xs font-mono">
              <button
                onClick={() => setMode("preset")}
                className={`px-4 py-1.5 rounded-md transition-all ${
                  mode === "preset"
                    ? "bg-keystone-amber text-slate-950 font-bold shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                1-Click Scenarios
              </button>
              <button
                onClick={() => setMode("purl")}
                className={`px-4 py-1.5 rounded-md transition-all ${
                  mode === "purl"
                    ? "bg-keystone-amber text-slate-950 font-bold shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Package URL (purl)
              </button>
              <button
                onClick={() => setMode("sbom")}
                className={`px-4 py-1.5 rounded-md transition-all ${
                  mode === "sbom"
                    ? "bg-keystone-amber text-slate-950 font-bold shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                CycloneDX SBOM
              </button>
            </div>
          </div>

          {/* Mode 1: 1-Click Scenarios */}
          {mode === "preset" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {scenarios.map((sc) => {
                const Icon = sc.icon
                const isSelected = selectedPresetKey === sc.id
                return (
                  <button
                    key={sc.id}
                    onClick={() => handleLaunchScenario(sc)}
                    disabled={loading}
                    className={`text-left p-4 rounded-lg border transition-all relative group ${
                      isSelected
                        ? "bg-surface-secondary/90 border-keystone-amber shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                        : "bg-surface/70 border-slate-800 hover:border-slate-600 hover:bg-surface-secondary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded bg-black/40 border border-slate-700/50 text-keystone-amber">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-white group-hover:text-keystone-amber transition-colors">
                            {sc.title}
                          </h3>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${sc.badgeColor}`}>
                            {sc.stats}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {sc.subtitle}
                    </p>
                  </button>
                )
              })}
            </div>
          )}

          {/* Mode 2: Package URL */}
          {mode === "purl" && (
            <form onSubmit={handlePurlSubmit} className="space-y-4 max-w-xl mx-auto">
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300">Package URL (purl)</label>
                <input
                  type="text"
                  value={purlInput}
                  onChange={(e) => setPurlInput(e.target.value)}
                  placeholder="pkg:npm/axios@0.21.1"
                  className="w-full bg-black/60 border border-slate-700 rounded-md px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-keystone-amber"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300">Project / Service Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-black/60 border border-slate-700 rounded-md px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-keystone-amber"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-md text-xs font-semibold bg-keystone-amber text-slate-950 hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span>Ingest & Traverse Graph</span>
              </button>
            </form>
          )}

          {/* Mode 3: CycloneDX SBOM */}
          {mode === "sbom" && (
            <form onSubmit={handleSbomSubmit} className="space-y-4 max-w-xl mx-auto">
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300">Paste CycloneDX 1.4/1.5 JSON</label>
                <textarea
                  rows={6}
                  value={sbomJson}
                  onChange={(e) => setSbomJson(e.target.value)}
                  placeholder='{"bomFormat": "CycloneDX", "specVersion": "1.4", ...}'
                  className="w-full bg-black/60 border border-slate-700 rounded-md p-3 text-xs font-mono text-white focus:outline-none focus:border-keystone-amber"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-md text-xs font-semibold bg-keystone-amber text-slate-950 hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                <span>Parse SBOM into FalkorDB</span>
              </button>
            </form>
          )}

          {/* Notification / Feedback Banner */}
          {loading && (
            <div className="mt-6 p-4 rounded-lg bg-surface border border-slate-700 text-center text-xs font-mono text-slate-300 flex items-center justify-center gap-3">
              <RefreshCw className="h-4 w-4 animate-spin text-keystone-amber" />
              <span>Parsing SBOM, enriching CVEs via OSV, and constructing FalkorDB subgraphs...</span>
            </div>
          )}

          {result && (
            <div className="mt-6 p-4 rounded-lg bg-emerald-950/80 border border-emerald-700 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-emerald-300 font-mono">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>Target successfully ingested into FalkorDB! Ready for analysis.</span>
              </div>
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-400 text-slate-950 font-bold text-xs hover:bg-emerald-300 transition-colors flex-shrink-0"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 rounded-lg bg-red-950/80 border border-red-700 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Subtle Footer hint */}
      <div className="relative z-10 px-4 py-3 text-center text-[11px] font-mono text-slate-400 bg-black/40 backdrop-blur-sm">
        FalkorDB v4.4.0 Engine · Fast Cypher Traversal · Zero False Positives
      </div>
    </div>
  )
}
