import type { ActivityLogRecord } from "@/lib/ficha-types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const tableName = "activity_logs"

type ActivityLogApiRecord = {
  id?: string
  entity_type?: string
  entity_id?: string
  entity_label?: string
  action?: string
  summary?: string
  actor_id?: string
  actor_name?: string
  created_at?: string
}

function headers(extraHeaders?: HeadersInit) {
  return {
    apikey: serviceRoleKey as string,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/json",
    ...extraHeaders,
  }
}

function ensureConfig() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Variaveis do Supabase nao configuradas para logs.")
  }
}

function mapLog(record: ActivityLogApiRecord): ActivityLogRecord {
  return {
    id: String(record.id ?? ""),
    entityType: (record.entity_type === "document_template" ? "document_template" : "ficha") as ActivityLogRecord["entityType"],
    entityId: String(record.entity_id ?? ""),
    entityLabel: String(record.entity_label ?? ""),
    action: String(record.action ?? ""),
    summary: String(record.summary ?? ""),
    actorId: String(record.actor_id ?? ""),
    actorName: String(record.actor_name ?? ""),
    createdAt: String(record.created_at ?? ""),
  }
}

function isMissingTableError(payload: unknown) {
  const message = JSON.stringify(payload || "")
  return message.includes(tableName) && (message.includes("does not exist") || message.includes("nao existe"))
}

export async function createActivityLog(input: Omit<ActivityLogRecord, "id" | "createdAt">) {
  ensureConfig()

  const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}`, {
    method: "POST",
    headers: headers({
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify({
      entity_type: input.entityType,
      entity_id: input.entityId,
      entity_label: input.entityLabel,
      action: input.action,
      summary: input.summary,
      actor_id: input.actorId,
      actor_name: input.actorName,
    }),
    cache: "no-store",
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    if (isMissingTableError(payload)) return null
    throw new Error("Nao foi possivel registrar o log.")
  }

  const payload = (await response.json()) as ActivityLogApiRecord[]
  return payload[0] ? mapLog(payload[0]) : null
}

export async function getLatestActivityLog(entityType: ActivityLogRecord["entityType"], entityId: string) {
  ensureConfig()

  const params = new URLSearchParams({
    entity_type: `eq.${entityType}`,
    entity_id: `eq.${entityId}`,
    select: "id,entity_type,entity_id,entity_label,action,summary,actor_id,actor_name,created_at",
    order: "created_at.desc",
    limit: "1",
  })

  const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?${params.toString()}`, {
    headers: headers(),
    cache: "no-store",
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    if (isMissingTableError(payload)) return null
    throw new Error("Nao foi possivel carregar o ultimo log.")
  }

  const payload = (await response.json()) as ActivityLogApiRecord[]
  return payload[0] ? mapLog(payload[0]) : null
}

export async function listActivityLogs(limit = 100) {
  ensureConfig()

  const params = new URLSearchParams({
    select: "id,entity_type,entity_id,entity_label,action,summary,actor_id,actor_name,created_at",
    order: "created_at.desc",
    limit: String(limit),
  })

  const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?${params.toString()}`, {
    headers: headers(),
    cache: "no-store",
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    if (isMissingTableError(payload)) return []
    throw new Error("Nao foi possivel carregar a timeline.")
  }

  const payload = (await response.json()) as ActivityLogApiRecord[]
  return payload.map(mapLog)
}
