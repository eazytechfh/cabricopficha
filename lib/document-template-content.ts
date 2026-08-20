export type EditableDocumentTemplateKind = "contract" | "procuration"

const EDITABLE_CONTRACT_TITLE =
  '<h1 data-document-title="true" style="margin: 0 0 24px; text-align: center; font-size: 22px; font-weight: 800; text-transform: uppercase;">CONTRATO</h1>'

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

export function normalizeDocumentTemplateContent(template: string) {
  if (!template) return ""
  if (looksLikeHtml(template)) return template
  return escapeHtml(template).replaceAll("\n", "<br />")
}

export function prepareDocumentTemplateContent(kind: EditableDocumentTemplateKind, template: string) {
  const content = normalizeDocumentTemplateContent(template)

  if (kind !== "contract" || /data-document-title=["']true["']/i.test(content)) {
    return content
  }

  if (/^\s*<h1\b[^>]*>\s*CONTRATO\s*<\/h1>/i.test(content)) {
    return content.replace(/^\s*<h1\b/i, '<h1 data-document-title="true"')
  }

  return `${EDITABLE_CONTRACT_TITLE}${content}`
}
