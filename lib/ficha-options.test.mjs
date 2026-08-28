import assert from "node:assert/strict"
import test from "node:test"

import { ESTADO_CIVIL_OPTIONS } from "./ficha-options.ts"

test("adds (A) to gendered marital statuses but not to stable union", () => {
  assert.deepEqual([...ESTADO_CIVIL_OPTIONS], [
    "CASADO(A)",
    "SOLTEIRO(A)",
    "UNIÃO ESTÁVEL",
    "DIVORCIADO(A)",
    "VIÚVO(A)",
  ])
})
