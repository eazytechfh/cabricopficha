import type { FichaFormValues, FichaRecord } from "@/lib/ficha-types"

const PRESET_BANK_VALUES = ["asaas", "rede", "itau"] as const
export const MULTI_ENTRY_SEPARATOR = "||__MULTI_ENTRY__||"

export function normalizeDigits(value: string) {
  return (value || "").replace(/\D/g, "")
}

export function normalizeCpfCnpj(value: string) {
  const normalizedValue = String(value || "").trim().replace(/\.0$/, "")
  return normalizeDigits(normalizedValue)
}

export function stripNumericDecimalSuffix(value: string) {
  return String(value || "").trim().replace(/(\d+)\.0(\s*(?:\/|-)\s*[A-Za-z]{2})?$/, "$1$2")
}

export function splitSerializedEntries(value: string) {
  if (!value) return [""]
  return value.split(MULTI_ENTRY_SEPARATOR)
}

export function formatMultaProcessoLabel(value: string) {
  const trimmedValue = (value || "").trim()
  const match = trimmedValue.match(/^(Multa\s+\d+)\s+-\s+Placa\s+\S+(?:\s+-\s*(.+))?$/i)

  if (!match) return trimmedValue

  return match[2]?.trim() ? `${match[1]} - ${match[2].trim()}` : match[1]
}

export function normalizeMultasProcessoLabels(value: string, multiline = false) {
  return (value || "")
    .split("\n")
    .map((line) =>
      line
        .split(",")
        .map((item) => formatMultaProcessoLabel(item))
        .filter(Boolean)
        .join(multiline ? "\n" : ", ")
    )
    .join("\n")
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
  if (value === "VENCIDA") return "Vencida"
  if (value === "Vencida" || value === "Revisão de Ato") return value
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

export function isPresetBankValue(value: string) {
  return PRESET_BANK_VALUES.includes(value.trim().toLowerCase() as (typeof PRESET_BANK_VALUES)[number])
}

export function normalizeInstanciaValue(value: string) {
  const normalized = (value || "").trim().toUpperCase()

  if (!normalized) return ""
  if (normalized === "DP" || normalized === "DEFESA PRÉVIA" || normalized === "DEFESA PREVIA") {
    return "DP"
  }
  if (normalized === "1° INST" || normalized === "1º INST" || normalized === "1º INSTÂNCIA" || normalized === "1° INSTÂNCIA") {
    return "1° Inst"
  }
  if (normalized === "2° INST" || normalized === "2º INST" || normalized === "2º INSTÂNCIA" || normalized === "2° INSTÂNCIA") {
    return "2° Inst"
  }

  return value
}

function normalizeInstanciaSelections(value: string) {
  return (value || "")
    .split("\n")
    .map((line) =>
      line
        .split(",")
        .map((item) => normalizeInstanciaValue(item))
        .join(", ")
    )
    .join("\n")
}

export function normalizeFichaValues(values: FichaFormValues): FichaFormValues {
  const banco = values.banco === "outros" ? values.bancoOutro.trim() : values.banco

  return {
    ...values,
    banco,
    bancoOutro: values.banco === "outros" ? values.bancoOutro : "",
    instanciaProcesso: normalizeInstanciaSelections(values.instanciaProcesso),
    instanciaMulta: values.instanciaMulta
      .split(MULTI_ENTRY_SEPARATOR)
      .map((item) => normalizeInstanciaSelections(item))
      .join(MULTI_ENTRY_SEPARATOR),
    vistoJuridico: normalizeMultasProcessoLabels(values.vistoJuridico),
    assinaturaVistoJuridico: values.prazoProcesso,
    vistoJuridicoMulta: values.vistoJuridicoMulta,
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
    instanciaProcesso: normalizeInstanciaSelections(record.instanciaProcesso),
    instanciaMulta: record.instanciaMulta
      .split(MULTI_ENTRY_SEPARATOR)
      .map((item) => normalizeInstanciaSelections(item))
      .join(MULTI_ENTRY_SEPARATOR),
    vistoJuridico: normalizeMultasProcessoLabels(record.vistoJuridico),
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
