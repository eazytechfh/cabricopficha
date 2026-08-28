import assert from "node:assert/strict"
import test from "node:test"

import { buildFichaChanges, formatFichaChangeValue } from "./ficha-change-log.ts"

test("formats payment JSON as readable audit details", () => {
  const serialized = JSON.stringify([{ id: "payment-1", formaPagamento: "pix", banco: "itau", valor: "270" }])

  assert.equal(formatFichaChangeValue("Pagamentos", serialized), "1. pix | itau | R$ 270,00")
  assert.equal(formatFichaChangeValue("Pagamentos", "[]"), "-")
})

const base = {
  instanciaMulta: "DEFESA PREVIA",
  placa: "RIO1E09",
  placaProprietario: "sim",
  cpfProprietario: "",
}

test("logs only the fine instance when plate ownership data did not change", () => {
  const changes = buildFichaChanges(
    { ...base, instanciaMulta: "DEFESA PREVIA" },
    { ...base, instanciaMulta: "1ª INSTANCIA" }
  )

  assert.deepEqual(changes, [{
    field: "Instancia da Multa",
    before: "DEFESA PREVIA",
    after: "1ª INSTANCIA",
  }])
})

test("ignores equivalent empty plate owner representations", () => {
  const changes = buildFichaChanges(
    { ...base, placaProprietario: "" },
    { ...base, placaProprietario: "sim" }
  )

  assert.deepEqual(changes, [])
})

test("ignores equivalent legacy ownership values in every fine block", () => {
  const separator = "||__MULTI_ENTRY__||"
  const changes = buildFichaChanges(
    { ...base, placaProprietario: `sim${separator}` },
    { ...base, placaProprietario: `sim${separator}sim` }
  )

  assert.deepEqual(changes, [])
})
