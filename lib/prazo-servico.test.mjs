import assert from "node:assert/strict"
import test from "node:test"
import { calculatePrazoServico } from "./prazo-servico.ts"

test("uses the nearest date between process and fine deadlines", () => {
  assert.equal(calculatePrazoServico("2026-09-20\n2026-09-30", "2026-09-10"), "2026-09-10")
})

test("ignores special and invalid deadlines", () => {
  assert.equal(
    calculatePrazoServico("Vencida\nRevisão de Ato\n2026-02-31", "VENCIDA||__MULTI_ENTRY__||2026-10-15"),
    "2026-10-15"
  )
})

test("returns empty when there is no dated deadline", () => {
  assert.equal(calculatePrazoServico("Vencida\nAG Penalidade", "Revisão de Ato"), "")
})
