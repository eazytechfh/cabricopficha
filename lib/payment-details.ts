export type PaymentEntry = {
  id: string
  formaPagamento: string
  banco: string
  valor: string
}

export function appendPaymentEntry(entries: PaymentEntry[], id: string): PaymentEntry[] {
  return [...entries, { id, formaPagamento: "", banco: "", valor: "" }]
}

type LegacyPayment = {
  formaPagamento?: string
  banco?: string
  valorEntrada?: string
}

export function parsePaymentAmount(value: string) {
  const raw = String(value || "").trim().replace(/[^\d,.-]/g, "")
  if (!raw) return 0

  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw
  const amount = Number.parseFloat(normalized)
  return Number.isFinite(amount) ? Math.max(amount, 0) : 0
}

export function serializePaymentEntries(entries: PaymentEntry[]) {
  return JSON.stringify(entries)
}

export function parsePaymentEntries(serialized: unknown, legacy: LegacyPayment = {}): PaymentEntry[] {
  try {
    const parsed = typeof serialized === "string" ? JSON.parse(serialized) : serialized
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((entry, index) => ({
        id: String(entry?.id || `payment-${index + 1}`),
        formaPagamento: String(entry?.formaPagamento || ""),
        banco: String(entry?.banco || ""),
        valor: String(entry?.valor || ""),
      }))
    }
  } catch {
    // Fichas anteriores ao detalhamento usam as colunas legadas abaixo.
  }

  if (legacy.formaPagamento || legacy.banco || parsePaymentAmount(legacy.valorEntrada || "") > 0) {
    return [{
      id: "legacy-1",
      formaPagamento: legacy.formaPagamento || "",
      banco: legacy.banco || "",
      valor: legacy.valorEntrada || "",
    }]
  }

  return []
}

export function reconcilePaymentValues(totalValue: string, entries: PaymentEntry[]) {
  const total = parsePaymentAmount(totalValue)
  const paid = entries.reduce((sum, entry) => sum + parsePaymentAmount(entry.valor), 0)
  const roundedPaid = Number(paid.toFixed(2))

  return {
    total,
    paid: roundedPaid,
    remaining: Number(Math.max(total - roundedPaid, 0).toFixed(2)),
    exceedsTotal: roundedPaid > total,
  }
}

export function validatePaymentEntries(totalValue: string, entries: PaymentEntry[]) {
  const incomplete = entries.find((entry) => {
    const hasMethod = Boolean(entry.formaPagamento.trim())
    const hasValue = parsePaymentAmount(entry.valor) > 0
    return hasMethod !== hasValue
  })

  if (incomplete) return "Preencha a forma de pagamento e o respectivo valor em todas as linhas."
  if (reconcilePaymentValues(totalValue, entries).exceedsTotal) {
    return "A soma dos pagamentos não pode ultrapassar o valor total do contrato."
  }

  return ""
}

export function formatPaymentAmount(value: number) {
  return value.toFixed(2)
}
