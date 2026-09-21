import assert from "node:assert/strict"
import test from "node:test"
import { findDuplicateReasons } from "./ficha-duplicates.ts"

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
