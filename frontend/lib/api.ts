const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function fetchWorkspaceSummary(workspaceId: string = "demo_workspace") {
  const res = await fetch(`${API_BASE}/api/workspace/${workspaceId}/summary`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch workspace summary")
  return res.json()
}

export async function fetchFindings(workspaceId: string = "demo_workspace", severity?: string, kevOnly?: boolean) {
  const params = new URLSearchParams()
  if (severity) params.set("severity", severity)
  if (kevOnly) params.set("kev_only", "true")
  const url = `${API_BASE}/api/workspace/${workspaceId}/findings?${params.toString()}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch findings")
  return res.json()
}

export async function fetchFindingDetail(workspaceId: string, findingId: string) {
  const res = await fetch(`${API_BASE}/api/workspace/${workspaceId}/findings/${findingId}`, { cache: "no-store" })
  if (!res.ok) throw new Error(`Failed to fetch finding ${findingId}`)
  return res.json()
}

export async function fetchKeystones(workspaceId: string = "demo_workspace") {
  const res = await fetch(`${API_BASE}/api/workspace/${workspaceId}/keystones`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch keystones")
  return res.json()
}

export async function fetchRemediationPlan(workspaceId: string = "demo_workspace") {
  const res = await fetch(`${API_BASE}/api/workspace/${workspaceId}/remediation`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch remediation plan")
  return res.json()
}

export async function simulateUpgrade(workspaceId: string, currentPurl: string, targetVersion: string) {
  const res = await fetch(`${API_BASE}/api/workspace/${workspaceId}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current_purl: currentPurl, target_version: targetVersion })
  })
  if (!res.ok) throw new Error("Failed to simulate upgrade")
  return res.json()
}

export async function proposeAction(workspaceId: string, recommendationId: string, targetPurl: string, recommendedVersion: string) {
  const res = await fetch(`${API_BASE}/api/workspace/${workspaceId}/actions/propose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recommendation_id: recommendationId,
      target_purl: targetPurl,
      recommended_version: recommendedVersion,
      action_type: "CREATE_ISSUE"
    })
  })
  if (!res.ok) throw new Error("Failed to propose action")
  return res.json()
}

export async function fetchActions(workspaceId: string = "demo_workspace") {
  const res = await fetch(`${API_BASE}/api/workspace/${workspaceId}/actions`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to fetch actions")
  return res.json()
}

export async function approveAction(workspaceId: string, actionId: string) {
  const res = await fetch(`${API_BASE}/api/workspace/${workspaceId}/actions/${actionId}/approve`, {
    method: "POST"
  })
  if (!res.ok) throw new Error("Failed to approve action")
  return res.json()
}

export async function rejectAction(workspaceId: string, actionId: string) {
  const res = await fetch(`${API_BASE}/api/workspace/${workspaceId}/actions/${actionId}/reject`, {
    method: "POST"
  })
  if (!res.ok) throw new Error("Failed to reject action")
  return res.json()
}

export async function ingestSource(workspaceId: string, sourceType: "purl" | "cyclonedx", payload: string, projectName?: string) {
  const res = await fetch(`${API_BASE}/api/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      workspace_id: workspaceId,
      source_type: sourceType,
      payload: payload,
      project_name: projectName
    })
  })
  if (!res.ok) throw new Error("Failed to ingest source")
  return res.json()
}

export async function fetchAutoTriage(workspaceId: string = "demo_workspace") {
  const res = await fetch(`${API_BASE}/api/workspace/${workspaceId}/auto-triage`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to run auto-triage")
  return res.json()
}

export async function loadDemoFixture(fixtureKey: "log4j" | "spring4shell" | "axios" | "clean", workspaceId: string = "demo_workspace") {
  const res = await fetch(`${API_BASE}/api/demo/load`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fixture: fixtureKey, workspace_id: workspaceId })
  })
  if (!res.ok) throw new Error(`Failed to load fixture ${fixtureKey}`)
  return res.json()
}

export async function resetWorkspace(workspaceId: string = "demo_workspace") {
  const res = await fetch(`${API_BASE}/api/workspace/${workspaceId}/reset`, {
    method: "POST"
  })
  if (!res.ok) throw new Error("Failed to reset workspace")
  return res.json()
}
