import assert from "node:assert/strict"
import test from "node:test"
import { findDuplicateReasons, mergeClientIdentity } from "./ficha-duplicates.ts"

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

test("merge reuses client identity without overwriting the new contract", () => {
  const existing = {
    nomeCliente: "João da Silva 01",
    telefones: "21977776666",
    numeroEndereco: "55",
    email: "novo-email@exemplo.com",
    cpfCnpj: "12345678900",
    cnh: "111222333",
    endereco: "Rua Existente",
    tipoProcesso: "PROCESSO ANTIGO",
    valorTotal: "R$ 50,00",
  }

  const merged = mergeClientIdentity(incoming, existing)

  assert.equal(merged.nomeCliente, "João da Silva")
  assert.equal(merged.telefones, existing.telefones)
  assert.equal(merged.endereco, existing.endereco)
  assert.equal(merged.tipoProcesso, incoming.tipoProcesso)
  assert.equal(merged.valorTotal, incoming.valorTotal)
})
