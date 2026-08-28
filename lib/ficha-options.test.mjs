import assert from "node:assert/strict"
import test from "node:test"

import { ESTADO_CIVIL_OPTIONS, formatOptionInitialCaps } from "./ficha-options.ts"

test("adds (A) to gendered marital statuses but not to stable union", () => {
  assert.deepEqual([...ESTADO_CIVIL_OPTIONS], [
    "CASADO(A)",
    "SOLTEIRO(A)",
    "UNIÃO ESTÁVEL",
    "DIVORCIADO(A)",
    "VIÚVO(A)",
  ])
})

test("shows marital statuses with only word initials capitalized", () => {
  assert.deepEqual(ESTADO_CIVIL_OPTIONS.map(formatOptionInitialCaps), [
    "Casado(a)",
    "Solteiro(a)",
    "União Estável",
    "Divorciado(a)",
    "Viúvo(a)",
  ])
})
