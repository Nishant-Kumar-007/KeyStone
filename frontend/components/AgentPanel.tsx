"use client"

import React, { useState } from "react"
import { Send, Terminal, ChevronDown, ChevronRight, CheckCircle2, ShieldCheck, Zap } from "lucide-react"

interface ToolEvent {
  step_index: number
  tool: string
  parameters: any
  cypher_query: string
  duration_ms?: number
  summary?: string
  status: "running" | "completed"
}

interface AgentPanelProps {
  workspaceId: string
  onSelectFinding?: (findingId: string) => void
}

export default function AgentPanel({ workspaceId, onSelectFinding }: AgentPanelProps) {
  const [question, setQuestion] = useState("")
  const [loading, setLoading] = useState(false)
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([])
  const [finalAnswer, setFinalAnswer] = useState<string | null>(null)
  const [evidenceList, setEvidenceList] = useState<any[]>([])
  const [expandedCypherSteps, setExpandedCypherSteps] = useState<Set<number>>(new Set())

  const quickPrompts = [
    "Why is log4j-core in my project?",
    "What is the smallest set of direct upgrades?",
    "Simulate upgrading log4j-core to 2.17.1",
    "Show keystone dependency bottlenecks",
  ]

  const toggleCypher = (stepIdx: number) => {
    setExpandedCypherSteps((prev) => {
      const next = new Set(prev)
      if (next.has(stepIdx)) {
        next.delete(stepIdx)
      } else {
        next.add(stepIdx)
      }
      return next
    })
  }

  const handleAsk = async (queryText?: string) => {
    const textToSubmit = queryText || question
    if (!textToSubmit.trim()) return

    setLoading(true)
    setToolEvents([])
    setFinalAnswer(null)
    setEvidenceList([])
    setExpandedCypherSteps(new Set())

    try {
      const url = `http://localhost:8000/api/workspace/${workspaceId}/investigate?question=${encodeURIComponent(
        textToSubmit
      )}`
      const eventSource = new EventSource(url)

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "tool_start") {
            setToolEvents((prev) => [
              ...prev,
              {
                step_index: data.step_index,
                tool: data.tool,
                parameters: data.parameters,
                cypher_query: data.cypher_query,
                status: "running",
              },
            ])
          } else if (data.type === "tool_finish") {
            setToolEvents((prev) =>
              prev.map((t) =>
                t.step_index === data.step_index
                  ? {
                      ...t,
                      status: "completed",
                      duration_ms: data.duration_ms,
                      summary: data.summary,
                    }
                  : t
              )
            )
          } else if (data.type === "answer") {
            setFinalAnswer(data.answer)
            if (data.evidence) {
              setEvidenceList(data.evidence)
            }
            eventSource.close()
            setLoading(false)
          }
        } catch (e) {
          console.error("Error parsing SSE event:", e)
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
        setLoading(false)
      }
    } catch (e) {
      console.error("Investigation error:", e)
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface border border-surface-border rounded p-5 font-sans flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-keystone-amber" />
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
            Agent Investigation
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-400 bg-surface-secondary px-2 py-0.5 rounded border border-surface-border">
          FalkorDB Loop
        </span>
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => {
              setQuestion(qp)
              handleAsk(qp)
            }}
            className="text-[11px] font-mono bg-surface-secondary/70 hover:bg-surface-secondary text-slate-300 hover:text-white px-2 py-1 rounded border border-surface-border/60 transition-colors"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Query Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleAsk()
        }}
        className="flex gap-2 mb-4"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask why a package is affected or what fixes it..."
          className="flex-1 bg-surface-secondary border border-surface-border rounded px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-keystone-amber"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="bg-keystone-amber hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold px-3.5 py-2 rounded text-xs transition-colors flex items-center gap-1.5 font-mono"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Investigate</span>
        </button>
      </form>

      {/* Live Tool Execution Timeline */}
      {toolEvents.length > 0 && (
        <div className="mb-4 space-y-2 max-h-56 overflow-y-auto pr-1">
          <span className="text-[11px] font-mono uppercase text-slate-500 tracking-wider">
            Tool Execution Timeline ({toolEvents.length} steps)
          </span>
          {toolEvents.map((t) => (
            <div
              key={t.step_index}
              className="bg-surface-secondary/60 border border-surface-border/60 rounded p-2.5 text-xs font-mono"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">#{t.step_index}</span>
                  <span className="font-bold text-slate-300">{t.tool}</span>
                  {t.status === "completed" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </div>
                {t.duration_ms && (
                  <span className="text-[10px] text-slate-500">{t.duration_ms}ms</span>
                )}
              </div>

              {t.summary && (
                <p className="text-[11px] text-slate-400 mt-1 font-sans">{t.summary}</p>
              )}

              {/* Show Cypher Toggle */}
              {t.cypher_query && (
                <div className="mt-2 pt-1.5 border-t border-surface-border/40">
                  <button
                    type="button"
                    onClick={() => toggleCypher(t.step_index)}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-keystone-amber transition-colors font-mono"
                  >
                    {expandedCypherSteps.has(t.step_index) ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                    <span>{expandedCypherSteps.has(t.step_index) ? "Hide Cypher" : "Show Cypher Query"}</span>
                  </button>
                  {expandedCypherSteps.has(t.step_index) && (
                    <pre className="mt-1.5 p-2 bg-[#08090d] border border-surface-border/80 rounded text-[10px] text-amber-200/90 overflow-x-auto whitespace-pre-wrap">
                      {t.cypher_query}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Grounded Answer */}
      {finalAnswer && (
        <div className="mt-auto bg-[#0e111a] border border-emerald-900/50 rounded p-4 font-sans text-xs">
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-surface-border text-emerald-400 font-mono text-[11px] font-semibold">
            <ShieldCheck className="h-4 w-4" />
            <span>Verified Grounded Answer</span>
          </div>
          <div className="text-slate-300 leading-relaxed whitespace-pre-line font-mono text-xs">
            {finalAnswer}
          </div>

          {/* Evidence Citations */}
          {evidenceList.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-surface-border/50">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block mb-1.5">
                Retrieved Graph Evidence:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {evidenceList.map((ev, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono bg-surface-secondary text-slate-300 px-2 py-0.5 rounded border border-surface-border/60"
                  >
                    {ev.claim || `Node: ${ev.node_ids?.join(", ")}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
