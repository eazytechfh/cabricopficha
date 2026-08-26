import assert from "node:assert/strict"
import test from "node:test"

import { formatFichaCreatedDate } from "./ficha-date.ts"

test("formats the immutable ficha creation timestamp as a date", () => {
  assert.equal(formatFichaCreatedDate("2026-08-25T18:59:00.000Z"), "25/08/2026")
  assert.equal(formatFichaCreatedDate("2026-08-26T01:00:00.000Z"), "25/08/2026")
})
