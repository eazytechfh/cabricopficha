import assert from "node:assert/strict"
import test from "node:test"
import { formatCpfCnpjForCopy, normalizeAutoDetran } from "./ficha-copy-values.ts"

test("removes CPF and CNPJ punctuation for copying", () => {
  assert.equal(formatCpfCnpjForCopy("010.090.317-75"), "01009031775")
  assert.equal(formatCpfCnpjForCopy("16.513.797/0001-60"), "16513797000160")
})

test("keeps the letter I at the start of a Detran identifier", () => {
  assert.equal(normalizeAutoDetran("I60861293"), "I60861293")
  assert.equal(normalizeAutoDetran("i60861293"), "I60861293")
})

test("fixes a copied Detran identifier whose initial I became 1", () => {
  assert.equal(normalizeAutoDetran("160861293"), "I60861293")
  assert.equal(normalizeAutoDetran("160861293\nI53552418"), "I60861293\nI53552418")
})

test("does not alter unrelated numeric identifiers", () => {
  assert.equal(normalizeAutoDetran("60861293"), "60861293")
  assert.equal(normalizeAutoDetran("1234567890"), "1234567890")
})
