import assert from "node:assert/strict"
import test from "node:test"
import {
  appendPaymentEntry,
  parsePaymentEntries,
  reconcilePaymentValues,
  serializePaymentEntries,
  validatePaymentEntries,
} from "./payment-details.ts"

const payments = [
  { id: "pix", formaPagamento: "pix", banco: "", valor: "300,00" },
  { id: "cash", formaPagamento: "especie", banco: "", valor: "300,00" },
  { id: "card", formaPagamento: "credito", banco: "rede", valor: "400,00" },
]

test("serializes and restores multiple payment methods", () => {
  assert.deepEqual(parsePaymentEntries(serializePaymentEntries(payments)), payments)
})

test("reconciles paid and remaining values with the contract total", () => {
  assert.deepEqual(reconcilePaymentValues("R$ 1.000,00", payments), {
    total: 1000,
    paid: 1000,
    remaining: 0,
    exceedsTotal: false,
  })
})

test("rejects a payment sum above the contract total", () => {
  const result = validatePaymentEntries("1000", [...payments, { id: "extra", formaPagamento: "debito", banco: "", valor: "1" }])
  assert.equal(result, "A soma dos pagamentos não pode ultrapassar o valor total do contrato.")
})

test("converts a legacy single payment into one detailed entry", () => {
  assert.deepEqual(parsePaymentEntries("", { formaPagamento: "pix", banco: "asaas", valorEntrada: "250" }), [
    { id: "legacy-1", formaPagamento: "pix", banco: "asaas", valor: "250" },
  ])
})

test("keeps a newly added blank payment visible for editing", () => {
  const current = [{ id: "payment-1", formaPagamento: "debito", banco: "itau", valor: "200" }]
  const next = appendPaymentEntry(current, "payment-2")

  assert.equal(next.length, 2)
  assert.deepEqual(next[1], { id: "payment-2", formaPagamento: "", banco: "", valor: "" })
})
