import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const [formSource, readSource, pdfSource, workspaceSource] = await Promise.all([
  readFile(new URL("./ficha-form.tsx", import.meta.url), "utf8"),
  readFile(new URL("./ficha-read-view.tsx", import.meta.url), "utf8"),
  readFile(new URL("./FichaPdf.tsx", import.meta.url), "utf8"),
  readFile(new URL("./fichas-workspace.tsx", import.meta.url), "utf8"),
])

test("renders ficha sections in the expected order", () => {
  assert.match(formSource, /order-\[10\][\s\S]*shouldShowSection\("client"\)/)
  assert.match(formSource, /order-\[20\][\s\S]*shouldShowSection\("contract"\)/)
  assert.match(formSource, /order-\[30\][\s\S]*shouldShowSection\("payment"\)/)
  assert.match(formSource, /order-\[40\][\s\S]*shouldShowSection\("additional"\)/)
  assert.match(formSource, /order-\[50\][\s\S]*shouldShowSection\("processes"\)/)
  assert.match(formSource, /order-\[60\][\s\S]*shouldShowSection\("fines"\)/)
  assert.match(formSource, /order-\[70\][\s\S]*shouldShowSection\("otherServices"\)/)
  assert.match(formSource, /order-\[80\][\s\S]*shouldShowSection\("notes"\)/)

  const readPayment = readSource.indexOf('<ReadSection title="Dados do Pagamento">')
  const readAdditional = readSource.indexOf('<ReadSection title="Dados Adicionais">')
  const readProcesses = readSource.indexOf('<ReadSection title="Processos">')
  const readFines = readSource.indexOf('<ReadSection title="Multas">')
  const readOtherServices = readSource.indexOf('<ReadSection title="Outros Serviços">')
  const readNotes = readSource.indexOf('<ReadSection title="Observações Adicionais">')
  assert.ok(
    readPayment < readAdditional &&
      readAdditional < readProcesses &&
      readProcesses < readFines &&
      readFines < readOtherServices &&
      readOtherServices < readNotes
  )

  const pdfPayment = pdfSource.indexOf('section("DADOS DO PAGAMENTO"')
  const pdfAdditional = pdfSource.indexOf('section("DADOS ADICIONAIS"')
  const pdfProcesses = pdfSource.indexOf('section("PROCESSOS"')
  const pdfFines = pdfSource.indexOf('section("MULTAS"')
  const pdfOtherServices = pdfSource.indexOf('section("OUTROS SERVIÇOS"')
  const pdfNotes = pdfSource.indexOf('section("OBSERVAÇÕES ADICIONAIS"')
  assert.ok(
    pdfPayment < pdfAdditional &&
      pdfAdditional < pdfProcesses &&
      pdfProcesses < pdfFines &&
      pdfFines < pdfOtherServices &&
      pdfOtherServices < pdfNotes
  )
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
