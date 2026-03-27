"use client"

import { createRoot } from "react-dom/client"
import FichaPdf from "@/components/FichaPdf"
import { generatePdf } from "@/lib/generatePdf"
import { normalizeDigits, parseCurrency } from "@/lib/ficha-utils"
import type { FichaFormValues } from "@/lib/ficha-types"

function getPdfFilename(nomeCliente: string) {
  const safeName = (nomeCliente || "cliente")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "")

  return `ficha-${safeName}.pdf`
}

export async function downloadFichaPdf(values: FichaFormValues) {
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
    <FichaPdf
      data={{
        ...values,
        valorTotal: parseCurrency(values.valorTotal),
        valorEntrada: parseCurrency(values.valorEntrada),
        valorRestante: parseCurrency(values.valorRestante),
      }}
    />
  )

  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
  await new Promise((resolve) => setTimeout(resolve, 120))

  const printable = host.firstElementChild as HTMLElement | null

  if (!printable) {
    root.unmount()
    host.remove()
    throw new Error("Nao foi possivel montar o layout do PDF.")
  }

  try {
    await generatePdf(printable, getPdfFilename(values.nomeCliente))
  } finally {
    root.unmount()
    host.remove()
  }
}

export function normalizeCpfForSearch(value: string) {
  return normalizeDigits(value)
}
