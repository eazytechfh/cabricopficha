import assert from "node:assert/strict"
import test from "node:test"

import { shouldValidatePayments } from "./payment-validation-context.ts"

test("does not validate hidden payments while editing only client data", () => {
  assert.equal(shouldValidatePayments("editClient"), false)
})

test("validates payments during creation and full record editing", () => {
  assert.equal(shouldValidatePayments("create"), true)
  assert.equal(shouldValidatePayments("edit"), true)
})
