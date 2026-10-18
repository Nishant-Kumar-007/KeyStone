import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSeverityBadge(severity: string) {
  switch (severity?.toUpperCase()) {
    case "CRITICAL":
      return "bg-red-950/60 text-red-400 border-red-800/80"
    case "HIGH":
      return "bg-rose-950/60 text-rose-400 border-rose-800/80"
    case "MEDIUM":
      return "bg-amber-950/60 text-amber-400 border-amber-800/80"
    case "LOW":
      return "bg-emerald-950/60 text-emerald-400 border-emerald-800/80"
    default:
      return "bg-slate-900 text-slate-400 border-slate-700"
  }
}
