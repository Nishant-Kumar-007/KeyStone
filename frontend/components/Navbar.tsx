"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Wrench,
  ScanLine,
  Bot,
  Database,
  Sparkles,
  Zap
} from "lucide-react"

export default function Navbar() {
  const pathname = usePathname()
  const [dbHealthy, setDbHealthy] = useState<boolean>(true)

  useEffect(() => {
    fetch("http://localhost:8000/api/health")
      .then((res) => res.json())
      .then((data) => setDbHealthy(data.healthy === true))
      .catch(() => setDbHealthy(false))
  }, [])

  // Dashboard is first option as requested
  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Remediation", href: "/remediation", icon: Wrench },
    { label: "Analyze & Ingest", href: "/analyze", icon: ScanLine },
    { label: "Agent Sentinel", href: "/sentinel", icon: Bot },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-border/80 bg-background/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-mono text-sm tracking-tight text-white hover:opacity-95 transition-opacity group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-keystone-amber/40 bg-keystone-amber/10 text-keystone-amber shadow-[0_0_12px_rgba(245,158,11,0.2)] group-hover:scale-105 transition-transform">
              <Zap className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wider uppercase text-xs text-slate-100">KEYSTONE</span>
                <span className="px-1.5 py-0.2 text-[9px] font-mono uppercase rounded bg-keystone-amber/15 text-keystone-amber border border-keystone-amber/30">
                  Graph Agent
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-sans tracking-normal">
                FalkorDB Alert Remediation
              </span>
            </div>
          </Link>

          {/* Primary Nav - Dashboard is Option 1 */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? "bg-surface-secondary text-white border border-surface-border shadow-sm text-keystone-amber"
                      : "text-slate-400 hover:text-slate-200 hover:bg-surface-secondary/50"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? "text-keystone-amber" : "text-slate-400"}`} />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* FalkorDB Live Status */}
          <div className="flex items-center gap-2 border border-surface-border bg-surface/80 px-2.5 py-1 rounded-md text-xs font-mono shadow-inner">
            <Database className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-slate-300">FalkorDB</span>
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                dbHealthy ? "bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" : "bg-red-500"
              }`}
            />
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 border border-surface-border/60 bg-surface-secondary/40 px-2.5 py-1 rounded-md">
            <Sparkles className="h-3 w-3 text-keystone-amber" />
            <span>Track 01</span>
          </div>
        </div>
      </div>
    </header>
  )
}
