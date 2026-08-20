import type { DocumentTemplateKind } from "@/lib/document-templates"

export const MAX_DOCUMENT_TEMPLATE_CONTENT_LENGTH = 4_000_000

export function hasMeaningfulDocumentTemplateContent(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false

  const renderedMarkup = value
    .replace(/<!--[^]*?-->/g, "")
    .replace(/<(script|style|template|noscript)\b[^>]*>[^]*?<\/\1\s*>/gi, "")

  if (/<img\b[^>]*\bsrc\s*=\s*(["'])\s*[^\s"'][^"']*\1/i.test(renderedMarkup)) return true

  const visibleContent = renderedMarkup
    .replace(/<[^>]*>/g, "")
    .replace(/&(nbsp|ensp|emsp|thinsp|hairsp|numsp|puncsp|tab|newline|#0*(?:9|10|13|32|160|8203)|#x0*(?:9|a|d|20|a0|200b));/gi, "")
    .replace(/[\s\u00a0\u200b]/g, "")

  return visibleContent.length > 0
}

export function parseDocumentTemplateKind(value: unknown): DocumentTemplateKind | null {
  if (value === "contract" || value === "procuration") return value
  return null
}

export function validateDocumentTemplateContent(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("O conteudo do modelo deve ser um texto valido.")
  }

  const content = value.trim()

  if (!hasMeaningfulDocumentTemplateContent(content)) {
    throw new Error("O modelo nao pode ficar vazio.")
  }

  if (new TextEncoder().encode(content).byteLength > MAX_DOCUMENT_TEMPLATE_CONTENT_LENGTH) {
    throw new Error("O modelo ficou muito grande. Remova ou reduza imagens antes de salvar.")
  }

  return content
}
