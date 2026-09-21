export const FICHA_READ_SECTION_ORDER = [
  "Dados do Cliente",
  "Processos",
  "Outros Serviços",
  "Multas",
  "Dados Adicionais",
  "Dados do Pagamento",
  "Observações Adicionais",
] as const

export function hasFilledText(values: unknown[]) {
  return values.some((value) => typeof value === "string" && value.trim().length > 0)
}

export function shouldShowAdditionalObservations(value: string) {
  return value.trim().length > 0
}

export function formatAdditionalObservations(value: string) {
  return value.replace(/^\s*Data:\s*/i, "").trim()
}
