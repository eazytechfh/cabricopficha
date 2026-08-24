export type EditableDocumentTemplateKind = "contract" | "procuration"

const DOCUMENT_TITLES: Record<EditableDocumentTemplateKind, string> = {
  contract: "CONTRATO",
  procuration: "PROCURAÇÃO",
}

function buildEditableDocumentTitle(title: string) {
  return `<h1 data-document-title="true" style="margin: 0 0 24px; text-align: center; font-size: 22px; font-weight: 800; text-transform: uppercase;">${title}</h1>`
}

function buildEditableTopSpace() {
  return '<div data-document-top-space="true" style="min-height: 32px;"><br></div>'
}

function buildEditableLogo() {
  return '<div data-document-logo="true" style="display: flex; justify-content: center; margin-bottom: 20px;"><img src="/logo.png" alt="CABRICOP" style="max-width: 220px; width: 100%; height: auto; object-fit: contain;"></div>'
}

function ensureEditablePageHeader(content: string) {
  if (/data-document-top-space=["']true["']/i.test(content)) return content

  const logo = /<img\b/i.test(content) ? "" : buildEditableLogo()
  return `${buildEditableTopSpace()}${logo}${content}`
}

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
  const title = DOCUMENT_TITLES[kind]
  const editableTitle = buildEditableDocumentTitle(title)

  if (/data-document-title=["']true["']/i.test(content)) {
    return ensureEditablePageHeader(content)
  }

  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const headingPattern = new RegExp(`^\\s*<h1\\b[^>]*>\\s*${escapedTitle}\\s*<\\/h1>`, "i")

  if (headingPattern.test(content)) {
    return ensureEditablePageHeader(content.replace(/^\s*<h1\b/i, '<h1 data-document-title="true"'))
  }

  const plainTitlePattern = new RegExp(`^\\s*${escapedTitle}(?:<br\\s*\\/?>\\s*)+`, "i")
  if (plainTitlePattern.test(content)) {
    return ensureEditablePageHeader(content.replace(plainTitlePattern, editableTitle))
  }

  return ensureEditablePageHeader(`${editableTitle}${content}`)
}
