import assert from "node:assert/strict"
import test from "node:test"
import { FICHA_READ_SECTION_ORDER } from "./ficha-read-layout.ts"

test("keeps the consultation sections in the familiar document order", () => {
  assert.deepEqual(FICHA_READ_SECTION_ORDER, [
    "Dados do Cliente",
    "Dados do Pagamento",
    "Processos",
    "Multas",
    "Observações Adicionais",
    "Cláusula Adicional",
  ])
})
