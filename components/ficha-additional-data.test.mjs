import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const [formSource, readSource, pdfSource, workspaceSource] = await Promise.all([
  readFile(new URL("./ficha-form.tsx", import.meta.url), "utf8"),
  readFile(new URL("./ficha-read-view.tsx", import.meta.url), "utf8"),
  readFile(new URL("./FichaPdf.tsx", import.meta.url), "utf8"),
  readFile(new URL("./fichas-workspace.tsx", import.meta.url), "utf8"),
])

test("renders ficha-specific additional data between fines and payment", () => {
  assert.match(formSource, /order-\[40\][\s\S]*shouldShowSection\("fines"\)/)
  assert.match(formSource, /order-\[45\][\s\S]*shouldShowSection\("additional"\)/)
  assert.match(formSource, /order-\[50\][\s\S]*shouldShowSection\("payment"\)/)

  const readFines = readSource.indexOf('<ReadSection title="Multas">')
  const readAdditional = readSource.indexOf('<ReadSection title="Dados Adicionais">')
  const readPayment = readSource.indexOf('<ReadSection title="Dados do Pagamento">')
  assert.ok(readFines < readAdditional && readAdditional < readPayment)

  const pdfFines = pdfSource.indexOf('section("MULTAS"')
  const pdfAdditional = pdfSource.indexOf('section("DADOS ADICIONAIS"')
  const pdfPayment = pdfSource.indexOf('section("DADOS DO PAGAMENTO"')
  assert.ok(pdfFines < pdfAdditional && pdfAdditional < pdfPayment)
})

test("keeps consultant, origin and SNE outside shared client data", () => {
  const formClientSection = formSource.slice(
    formSource.indexOf('shouldShowSection("client")'),
    formSource.indexOf('shouldShowSection("payment")')
  )
  assert.doesNotMatch(formClientSection, /nomeConsultor|values\.origem|values\.sne/)

  const clientReadCard = workspaceSource.slice(
    workspaceSource.indexOf("function ClienteReadCard"),
    workspaceSource.indexOf("function formatAccessDate")
  )
  assert.doesNotMatch(clientReadCard, /Nome do Consultor|Origem|SNE/)

  const newContractHandler = workspaceSource.slice(
    workspaceSource.indexOf("const handleAddNovoContrato"),
    workspaceSource.indexOf("const handleEditClient")
  )
  assert.match(newContractHandler, /nomeConsultor: consultor \? getDefaultConsultorOption\(consultor\.nome\) : ""/)
  assert.match(newContractHandler, /origem: ""/)
  assert.match(newContractHandler, /sne: ""/)
})
