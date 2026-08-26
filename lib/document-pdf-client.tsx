"use client"

import { createRoot } from "react-dom/client"
import { DocumentTemplatePdf } from "@/components/DocumentTemplatePdf"
import { DEFAULT_DOCUMENT_TEMPLATES, DOCUMENT_TEMPLATE_LABELS, fillDocumentTemplate, getDocumentFilename, prepareDocumentTemplateContent, type DocumentTemplateKind } from "@/lib/document-templates"
import { generatePdf } from "@/lib/generatePdf"
import type { FichaFormValues } from "@/lib/ficha-types"
import { getDocumentTemplate } from "@/lib/document-template-client"

export async function downloadFilledDocumentPdf(kind: DocumentTemplateKind, values: FichaFormValues & { createdAt?: string }) {
  const template = await getDocumentTemplate(kind).catch(() => ({
    key: kind,
    title: DOCUMENT_TEMPLATE_LABELS[kind],
    content: prepareDocumentTemplateContent(kind, DEFAULT_DOCUMENT_TEMPLATES[kind]),
  }))
  const content = fillDocumentTemplate(template.content, values, kind)

  const host = document.createElement("div")
  host.style.position = "fixed"
  host.style.left = "-20000px"
  host.style.top = "0"
  host.style.width = "1200px"
  host.style.padding = "24px"
  host.style.background = "#ffffff"
  host.style.pointerEvents = "none"
  host.style.zIndex = "-1"
  document.body.appendChild(host)

  const root = createRoot(host)
  root.render(
    <DocumentTemplatePdf
      title={DOCUMENT_TEMPLATE_LABELS[kind]}
      content={content}
      renderTitle={false}
    />
  )

  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
  await new Promise((resolve) => setTimeout(resolve, 120))

  const printable = host.firstElementChild as HTMLElement | null

  if (!printable) {
    root.unmount()
    host.remove()
    throw new Error("Nao foi possivel montar o documento.")
  }

  try {
    await generatePdf(printable, getDocumentFilename(kind, values))
  } finally {
    root.unmount()
    host.remove()
  }
}
