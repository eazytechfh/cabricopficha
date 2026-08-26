export const FICHA_READ_SECTION_ORDER = [
  "Dados do Cliente",
  "Dados do Pagamento",
  "Processos",
  "Outros Serviços",
  "Multas",
  "Observações Adicionais",
] as const

export function hasFilledText(values: unknown[]) {
  return values.some((value) => typeof value === "string" && value.trim().length > 0)
}

export function shouldShowAdditionalObservations(value: string) {
  return value.trim().length > 0
}
