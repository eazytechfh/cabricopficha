import type { FichaFormValues, FichaRecord } from "@/lib/ficha-types"

const PRESET_BANK_VALUES = ["asaas", "rede", "itau"] as const
export const MULTI_ENTRY_SEPARATOR = "||__MULTI_ENTRY__||"

export function normalizeDigits(value: string) {
  return (value || "").replace(/\D/g, "")
}

export function normalizeCpfCnpj(value: string) {
  return normalizeDigits(value)
}

export function splitSerializedEntries(value: string) {
  if (!value) return [""]
  return value.split(MULTI_ENTRY_SEPARATOR)
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

export function isPresetBankValue(value: string) {
  return PRESET_BANK_VALUES.includes(value.trim().toLowerCase() as (typeof PRESET_BANK_VALUES)[number])
}

export function normalizeFichaValues(values: FichaFormValues): FichaFormValues {
  const banco = values.banco === "outros" ? values.bancoOutro.trim() : values.banco

  return {
    ...values,
    banco,
    bancoOutro: values.banco === "outros" ? values.bancoOutro : "",
    vistoJuridico: "",
    assinaturaVistoJuridico: "",
    vistoJuridicoMulta: "",
  }
}

export function toPdfData(values: FichaFormValues) {
  const normalizedValues = normalizeFichaValues(values)

  return {
    ...normalizedValues,
    valorTotal: parseCurrency(normalizedValues.valorTotal),
    valorEntrada: parseCurrency(normalizedValues.valorEntrada),
    valorRestante: parseCurrency(normalizedValues.valorRestante),
  }
}

export function toRecordValues(record: FichaRecord): FichaFormValues {
  const banco = record.banco || ""
  const usesPresetBank = isPresetBankValue(banco)

  return {
    ...record,
    banco: usesPresetBank ? banco : banco ? "outros" : "",
    bancoOutro: usesPresetBank ? "" : banco,
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
