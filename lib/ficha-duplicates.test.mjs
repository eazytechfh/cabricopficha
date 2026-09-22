import assert from "node:assert/strict"
import test from "node:test"
import { findDuplicateReasons, groupDuplicateMatchesByClient } from "./ficha-duplicates.ts"

const incoming = {
  nomeCliente: "  João da Silva ",
  telefones: "(21) 99999-0000, 2133334444",
  numeroEndereco: "120",
  email: "JOAO@EXEMPLO.COM ",
  cpfCnpj: "123.456.789-00",
  cnh: "99887766",
  tipoProcesso: "NOVO PROCESSO",
  valorTotal: "R$ 1.000,00",
}

test("identifies normalized exact matches and explains every matching field", () => {
  const candidate = {
    nomeCliente: "JOAO DA SILVA 01",
    telefones: "+55 21 99999-0000",
    numeroEndereco: "120",
    email: "joao@exemplo.com",
    cpfCnpj: "12345678900",
    cnh: "99887766",
  }

  assert.deepEqual(findDuplicateReasons(incoming, candidate), [
    "CPF/CNPJ",
    "CNH",
    "e-mail",
    "telefone",
    "nome",
    "número do endereço",
  ])
})

test("does not flag weak data that only shares an address number", () => {
  const candidate = {
    nomeCliente: "Maria Souza 01",
    telefones: "21900001111",
    numeroEndereco: "120",
    email: "maria@exemplo.com",
    cpfCnpj: "98765432100",
    cnh: "11223344",
  }

  assert.deepEqual(findDuplicateReasons(incoming, candidate), [])
})

test("shows a previously unified client only once in duplicate matches", () => {
  const baseMatch = {
    clientGroupId: "client-group-1",
    nomeCliente: "João da Silva",
    cpfCnpj: "12345678900",
    telefones: "21999990000",
    numeroEndereco: "120",
    email: "joao@example.com",
    cnh: "99887766",
    dataContrato: "2026-09-01",
    nomeConsultor: "Consultor",
  }

  const grouped = groupDuplicateMatchesByClient([
    { ...baseMatch, id: "3", reasons: ["CPF/CNPJ"] },
    { ...baseMatch, id: "2", reasons: ["nome"] },
    { ...baseMatch, id: "1", reasons: ["e-mail"] },
  ])

  assert.equal(grouped.length, 1)
  assert.equal(grouped[0].id, "3")
  assert.deepEqual(grouped[0].reasons, ["CPF/CNPJ", "nome", "e-mail"])
})

test("keeps ungrouped duplicate records as separate client choices", () => {
  const matches = [
    { id: "1", clientGroupId: "", reasons: ["CPF/CNPJ"] },
    { id: "2", clientGroupId: "", reasons: ["CPF/CNPJ"] },
  ]

  assert.equal(groupDuplicateMatchesByClient(matches).length, 2)
})
