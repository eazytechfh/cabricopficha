import type { FichaFormValues, FichaRecord } from "@/lib/ficha-types"

export function normalizeDigits(value: string) {
  return (value || "").replace(/\D/g, "")
}

export function normalizeCpfCnpj(value: string) {
  return normalizeDigits(value)
}

export function parseCurrency(value: string) {
  const normalized = Number.parseFloat((value || "").replace(",", "."))
  return Number.isFinite(normalized) ? normalized : 0
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0)
}

export function formatDate(value: string) {
  if (!value) return ""
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

export function toPdfData(values: FichaFormValues) {
  return {
    ...values,
    valorTotal: parseCurrency(values.valorTotal),
    valorEntrada: parseCurrency(values.valorEntrada),
    valorRestante: parseCurrency(values.valorRestante),
  }
}

export function toRecordValues(record: FichaRecord): FichaFormValues {
  return {
    ...record,
  }
}

export function canEditFicha(
  currentConsultorId: string,
  currentLevel: "admin" | "consultor",
  ficha: Pick<FichaRecord, "createdByConsultorId" | "updatedByConsultorId">
) {
  if (currentLevel === "admin") return true
  return ficha.createdByConsultorId === currentConsultorId || ficha.updatedByConsultorId === currentConsultorId
}
