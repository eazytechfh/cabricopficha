import { DEFAULT_DOCUMENT_TEMPLATES, DOCUMENT_TEMPLATE_LABELS, prepareDocumentTemplateContent, type DocumentTemplateKind, type DocumentTemplateRecord } from "@/lib/document-templates"
import { createActivityLog } from "@/lib/server-activity-logs"
import type { ConsultorSession } from "@/lib/ficha-types"
import { hasMeaningfulDocumentTemplateContent } from "@/lib/document-template-validation"

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
    content: prepareDocumentTemplateContent(kind, DEFAULT_DOCUMENT_TEMPLATES[kind]),
  }
}

function mapTemplate(record: Record<string, unknown>, kind: DocumentTemplateKind): DocumentTemplateRecord {
  const storedContent = typeof record.content === "string" ? record.content : ""
  return {
    key: kind,
    title: DOCUMENT_TEMPLATE_LABELS[kind],
    content: prepareDocumentTemplateContent(
      kind,
      hasMeaningfulDocumentTemplateContent(storedContent) ? storedContent : DEFAULT_DOCUMENT_TEMPLATES[kind]
    ),
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

export async function updateServerDocumentTemplate(kind: DocumentTemplateKind, content: string, consultor: ConsultorSession) {
  ensureConfig()
  const previous = await getServerDocumentTemplate(kind)

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
  if (payload[0]) {
    const template = mapTemplate(payload[0], kind)
    await createActivityLog({
      entityType: "document_template",
      entityId: kind,
      entityLabel: `Modelo de ${DOCUMENT_TEMPLATE_LABELS[kind]}`,
      action: "update",
      summary: `Atualizou o conteudo do modelo de ${DOCUMENT_TEMPLATE_LABELS[kind]}.`,
      actorId: consultor.id,
      actorName: consultor.nome,
      details: [
        {
          field: "Conteudo do modelo",
          before: previous.content || "-",
          after: template.content || "-",
        },
      ],
    })
    return template
  }

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
  const template = created[0] ? mapTemplate(created[0], kind) : defaultTemplate(kind)
  await createActivityLog({
    entityType: "document_template",
    entityId: kind,
    entityLabel: `Modelo de ${DOCUMENT_TEMPLATE_LABELS[kind]}`,
    action: "update",
    summary: `Atualizou o conteudo do modelo de ${DOCUMENT_TEMPLATE_LABELS[kind]}.`,
    actorId: consultor.id,
    actorName: consultor.nome,
    details: [
      {
        field: "Conteudo do modelo",
        before: previous.content || "-",
        after: template.content || "-",
      },
    ],
  })
  return template
}
