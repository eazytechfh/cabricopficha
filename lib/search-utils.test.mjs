import assert from "node:assert/strict"
import test from "node:test"

import {
  buildAccentInsensitivePattern,
  buildNameSearchFilter,
  getNameSearchTokens,
  includesNormalizedSearch,
  normalizeSearchText,
  parseFichaSearch,
} from "./search-utils.ts"

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

const matchesName = (stored, query) =>
  getNameSearchTokens(query).every((token) => new RegExp(buildAccentInsensitivePattern(token), "i").test(stored))

test("finds a person by first and last name, surname only, or partial names", () => {
  const stored = "JOÃO CARLOS DA CONCEIÇÃO SILVA"
  for (const query of ["joao silva", "Silva", "conceicao", "jo sil", "silva joao", "João da Silva"]) {
    assert.equal(matchesName(stored, query), true, query)
  }
  assert.equal(matchesName(stored, "joao souza"), false)
  assert.equal(matchesName("JOAO SILVA", "João da Silva"), true)
})

test("requires every word in the same field, for clients or third parties", () => {
  assert.equal(
    buildNameSearchFilter("Ze Li", ["nome_cliente", "terceiros"]),
    '(and(nome_cliente.imatch."z[eéèêë]",nome_cliente.imatch."l[iíìîï]"),and(terceiros.imatch."z[eéèêë]",terceiros.imatch."l[iíìîï]"))'
  )
})

test("drops punctuation and never builds a filter from an empty search", () => {
  assert.deepEqual(getNameSearchTokens('Ana (*"),.'), ["ana"])
  assert.equal(buildNameSearchFilter(" .,() ", ["nome_cliente"]), "")
})

test("detects CPF/CNPJ or name from what was typed", () => {
  assert.deepEqual(parseFichaSearch("273.819.947-04"), { cpf: "27381994704", nome: "" })
  assert.deepEqual(parseFichaSearch("12.345.678/0001-90"), { cpf: "12345678000190", nome: "" })
  assert.deepEqual(parseFichaSearch(" Maria Silva "), { cpf: "", nome: "Maria Silva" })
  assert.deepEqual(parseFichaSearch(""), { cpf: "", nome: "" })
})
