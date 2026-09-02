import assert from "node:assert/strict"
import test from "node:test"
import { normalizeOwnerFlags } from "./ficha-owner.ts"

test("keeps a third-party plate unchecked when its CPF is present", () => {
  assert.equal(normalizeOwnerFlags("sim", "123.456.789-00"), "nao")
})

test("normalizes every serialized plate independently", () => {
  const separator = "||__MULTI_ENTRY__||"
  assert.equal(
    normalizeOwnerFlags(`sim${separator}nao`, `${separator}987.654.321-00`),
    `sim${separator}nao`
  )
})
