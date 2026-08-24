import assert from "node:assert/strict"
import test from "node:test"
import { emptyFichaValues } from "./ficha-types.ts"
import { readAddressFields, splitLegacyAddress } from "./address-fields.ts"

test("keeps address number and complement as independent form values", () => {
  assert.equal(emptyFichaValues.endereco, "")
  assert.equal(emptyFichaValues.numeroEndereco, "")
  assert.equal(emptyFichaValues.complementoEndereco, "")
})

test("reads legacy concatenated addresses as separate fields", () => {
  assert.deepEqual(splitLegacyAddress("Rua Luiza de Souza Barros, Ponte da Saudade, Numero 261, Complemento FUNDOS SOB"), {
    endereco: "Rua Luiza de Souza Barros, Ponte da Saudade",
    numeroEndereco: "261",
    complementoEndereco: "FUNDOS SOB",
  })
})

test("prefers persisted address columns over legacy values", () => {
  assert.deepEqual(
    readAddressFields({ endereco: "Rua A, Numero 10, Complemento Antigo", numero_endereco: "20", complemento_endereco: "Novo" }),
    { endereco: "Rua A", numeroEndereco: "20", complementoEndereco: "Novo" }
  )
})
