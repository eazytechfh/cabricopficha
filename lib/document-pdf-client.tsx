"use client"

import { createRoot } from "react-dom/client"
import { DocumentTemplatePdf } from "@/components/DocumentTemplatePdf"
import { DOCUMENT_TEMPLATE_LABELS, fillDocumentTemplate, getDocumentFilename, type DocumentTemplateKind } from "@/lib/document-templates"
import { generatePdf } from "@/lib/generatePdf"
import type { FichaFormValues } from "@/lib/ficha-types"
import { getDocumentTemplate } from "@/lib/document-template-client"

export async function downloadFilledDocumentPdf(kind: DocumentTemplateKind, values: FichaFormValues) {
  const template = await getDocumentTemplate(kind)
  const content = fillDocumentTemplate(template.content, values)

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
      renderTitle={kind !== "contract"}
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
