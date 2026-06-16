import type { ActivityLogRecord, ConsultorSession } from "@/lib/ficha-types"

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.error || "Erro ao carregar logs.")
  }
  return payload
}

export async function getLatestLog(entityType: ActivityLogRecord["entityType"], entityId: string) {
  const response = await fetch("/api/activity-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "latest", entityType, entityId }),
  })

  const payload = await parseResponse<{ log: ActivityLogRecord | null }>(response)
  return payload.log
}

export async function getTimelineLogs(consultor: ConsultorSession) {
  const response = await fetch("/api/activity-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "timeline", consultor }),
  })

  const payload = await parseResponse<{ logs: ActivityLogRecord[] }>(response)
  return payload.logs
}
