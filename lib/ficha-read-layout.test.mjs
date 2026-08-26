import assert from "node:assert/strict"
import test from "node:test"
import {
  FICHA_READ_SECTION_ORDER,
  hasFilledText,
  shouldShowAdditionalObservations,
  formatAdditionalObservations,
} from "./ficha-read-layout.ts"

test("keeps the consultation sections in the familiar document order", () => {
  assert.deepEqual(FICHA_READ_SECTION_ORDER, [
    "Dados do Cliente",
    "Dados do Pagamento",
    "Processos",
    "Outros Serviços",
    "Multas",
    "Observações Adicionais",
  ])
})

test("removes the legacy Data label from additional observations", () => {
  assert.equal(formatAdditionalObservations("Data: 25/08/2026\nCliente pediu retorno."), "25/08/2026\nCliente pediu retorno.")
  assert.equal(formatAdditionalObservations("Cliente pediu retorno."), "Cliente pediu retorno.")
})

test("detects whether a conditional section has meaningful content", () => {
  assert.equal(hasFilledText(["", "   ", undefined]), false)
  assert.equal(hasFilledText(["", "123"]), true)
})

test("shows additional observations only when the client filled them", () => {
  assert.equal(shouldShowAdditionalObservations("   "), false)
  assert.equal(shouldShowAdditionalObservations("Nota do cliente"), true)
})
