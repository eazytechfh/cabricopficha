import type { DocumentTemplateKind, DocumentTemplateRecord } from "@/lib/document-templates"
import type { ConsultorSession } from "@/lib/ficha-types"

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.error || "Erro ao processar modelo.")
  }
  return payload
}

export async function getDocumentTemplate(kind: DocumentTemplateKind) {
  const response = await fetch("/api/document-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "get", kind }),
  })

  const payload = await parseResponse<{ template: DocumentTemplateRecord }>(response)
  return payload.template
}

export async function updateDocumentTemplate(kind: DocumentTemplateKind, content: string, consultor: ConsultorSession) {
  const response = await fetch("/api/document-templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", kind, content, consultor }),
  })

  const payload = await parseResponse<{ template: DocumentTemplateRecord }>(response)
  return payload.template
}
