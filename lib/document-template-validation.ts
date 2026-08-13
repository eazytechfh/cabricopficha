import type { DocumentTemplateKind } from "@/lib/document-templates"

export const MAX_DOCUMENT_TEMPLATE_CONTENT_LENGTH = 4_000_000

export function parseDocumentTemplateKind(value: unknown): DocumentTemplateKind | null {
  if (value === "contract" || value === "procuration") return value
  return null
}

export function validateDocumentTemplateContent(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("O conteudo do modelo deve ser um texto valido.")
  }

  const content = value.trim()

  if (!content) {
    throw new Error("O modelo nao pode ficar vazio.")
  }

  if (new TextEncoder().encode(content).byteLength > MAX_DOCUMENT_TEMPLATE_CONTENT_LENGTH) {
    throw new Error("O modelo ficou muito grande. Remova ou reduza imagens antes de salvar.")
  }

  return content
}
