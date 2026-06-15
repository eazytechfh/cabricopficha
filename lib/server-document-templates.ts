import { DEFAULT_DOCUMENT_TEMPLATES, DOCUMENT_TEMPLATE_LABELS, type DocumentTemplateKind, type DocumentTemplateRecord } from "@/lib/document-templates"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const tableName = "document_templates"

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
    throw new Error("Variaveis do Supabase nao configuradas para modelos.")
  }
}

function defaultTemplate(kind: DocumentTemplateKind): DocumentTemplateRecord {
  return {
    key: kind,
    title: DOCUMENT_TEMPLATE_LABELS[kind],
    content: DEFAULT_DOCUMENT_TEMPLATES[kind],
  }
}

function mapTemplate(record: Record<string, unknown>, kind: DocumentTemplateKind): DocumentTemplateRecord {
  return {
    key: kind,
    title: DOCUMENT_TEMPLATE_LABELS[kind],
    content: String(record.content || DEFAULT_DOCUMENT_TEMPLATES[kind]),
  }
}

export async function getServerDocumentTemplate(kind: DocumentTemplateKind) {
  ensureConfig()

  const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?key=eq.${kind}&select=key,content&limit=1`, {
    headers: headers(),
    cache: "no-store",
  })

  if (!response.ok) {
    return defaultTemplate(kind)
  }

  const payload = (await response.json()) as Array<Record<string, unknown>>
  return payload[0] ? mapTemplate(payload[0], kind) : defaultTemplate(kind)
}

export async function updateServerDocumentTemplate(kind: DocumentTemplateKind, content: string) {
  ensureConfig()

  const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?key=eq.${kind}`, {
    method: "PATCH",
    headers: headers({
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify({ content, updated_at: new Date().toISOString() }),
    cache: "no-store",
  })

  if (response.status === 404) {
    throw new Error("Tabela de modelos nao encontrada no Supabase.")
  }

  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar o modelo.")
  }

  const payload = (await response.json()) as Array<Record<string, unknown>>
  if (payload[0]) return mapTemplate(payload[0], kind)

  const createResponse = await fetch(`${supabaseUrl}/rest/v1/${tableName}`, {
    method: "POST",
    headers: headers({
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify({ key: kind, content }),
    cache: "no-store",
  })

  if (!createResponse.ok) {
    throw new Error("Nao foi possivel criar o modelo.")
  }

  const created = (await createResponse.json()) as Array<Record<string, unknown>>
  return created[0] ? mapTemplate(created[0], kind) : defaultTemplate(kind)
}
