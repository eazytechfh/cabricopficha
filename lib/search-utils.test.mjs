import assert from "node:assert/strict"
import test from "node:test"

import { buildAccentInsensitivePattern, includesNormalizedSearch, normalizeSearchText } from "./search-utils.ts"

test("normalizes accents, case, and repeated whitespace for searches", () => {
  assert.equal(normalizeSearchText("  Rogério   da  Conceição  "), "rogerio da conceicao")
})

test("matches names when only the stored value has accents", () => {
  assert.equal(includesNormalizedSearch("ROGÉRIO DA SILVA", "roge"), true)
})

test("matches names when only the query has accents", () => {
  assert.equal(includesNormalizedSearch("ROGERIO DA SILVA", "rogé"), true)
})

test("does not match unrelated or empty searches", () => {
  assert.equal(includesNormalizedSearch("MARIA DA SILVA", "roge"), false)
  assert.equal(includesNormalizedSearch("ROGÉRIO DA SILVA", "   "), false)
})

test("builds a safe case-insensitive PostgreSQL pattern with accent groups", () => {
  assert.equal(buildAccentInsensitivePattern("Rogé"), "r[oóòôõö]g[eéèêë]")
  assert.equal(buildAccentInsensitivePattern("Ana (Teste)"), "[aáàâãäå][nñ][aáàâãäå]\\s+\\(t[eéèêë]st[eéèêë]\\)")
})
