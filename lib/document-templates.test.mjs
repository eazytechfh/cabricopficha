import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { prepareDocumentTemplateContent, removeDeprecatedDocumentVariables } from "./document-template-content.ts"

const documentTemplatesSource = readFileSync(new URL("./document-templates.ts", import.meta.url), "utf8")

test("adds an editable heading to a legacy contract template", () => {
  const content = prepareDocumentTemplateContent("contract", "Contrato de Prestação de Serviços")

  assert.match(content, /<h1 data-document-title="true"[^>]*>CONTRATO<\/h1>/)
  assert.match(content, /Contrato de Prestação de Serviços$/)
})

test("preserves an edited marked contract heading without duplicating it", () => {
  const customized = '<h1 data-document-title="true">CONTRATO PERSONALIZADO</h1><p>Conteúdo</p>'

  const content = prepareDocumentTemplateContent("contract", customized)
  assert.match(content, /<h1 data-document-title="true">CONTRATO PERSONALIZADO<\/h1><p>Conteúdo<\/p>$/)
  assert.equal((content.match(/CONTRATO PERSONALIZADO/g) ?? []).length, 1)
})

test("marks an existing legacy contract heading instead of duplicating it", () => {
  const legacy = "<h1>CONTRATO</h1><p>Conteúdo</p>"
  const content = prepareDocumentTemplateContent("contract", legacy)

  assert.match(content, /<h1 data-document-title="true">CONTRATO<\/h1><p>Conteúdo<\/p>$/)
})

test("adds an editable heading to a legacy procuration template", () => {
  const content = prepareDocumentTemplateContent("procuration", "<p>OUTORGANTE: Cliente</p>")

  assert.match(content, /<h1 data-document-title="true"[^>]*>PROCURAÇÃO<\/h1>/)
  assert.match(content, /<p>OUTORGANTE: Cliente<\/p>$/)
})

test("turns the existing plain procuration title into the editable heading", () => {
  const content = prepareDocumentTemplateContent("procuration", "PROCURAÇÃO\n\nOUTORGANTE: Cliente")

  assert.match(content, /<h1 data-document-title="true"[^>]*>PROCURAÇÃO<\/h1>/)
  assert.equal((content.match(/PROCURAÇÃO/g) ?? []).length, 1)
})

test("removes the deprecated additional-clause marker from saved templates", () => {
  const legacy = "<h2>Cláusula Adicional</h2><p>{{clausulaAdicional}}</p><p>Texto mantido</p>"

  assert.equal(removeDeprecatedDocumentVariables(legacy), "<p>Texto mantido</p>")
  assert.doesNotMatch(documentTemplatesSource, /clausulaAdicional/)
})

test("provides editable templates and variables for other services", () => {
  assert.match(documentTemplatesSource, /"other-services-contract"/)
  assert.match(documentTemplatesSource, /"other-services-procuration"/)
  assert.match(documentTemplatesSource, /\{\{tipoOutroServico\}\}/)
  assert.match(documentTemplatesSource, /\{\{poderesOutroServico\}\}/)
})

test("document summaries omit deadlines and expose the requested process and fine fields", () => {
  assert.match(documentTemplatesSource, /Instância do Processo:/)
  assert.match(documentTemplatesSource, /Tipo do Processo:/)
  assert.match(documentTemplatesSource, /Nº do Processo:/)
  assert.match(documentTemplatesSource, /return "Defesa Prévia"/)
  assert.match(documentTemplatesSource, /return "1º Instância"/)
  assert.match(documentTemplatesSource, /return "2º Instância"/)
  assert.match(documentTemplatesSource, /- Auto:/)
  assert.doesNotMatch(documentTemplatesSource, /\$\{index \+ 1\}\. Instância da Multa/)
  assert.doesNotMatch(documentTemplatesSource, /prazo \$\{formatDate\(line\.prazo\)\}/)
})

test("address placeholder includes CEP", () => {
  assert.match(documentTemplatesSource, /`CEP: \$\{values\.cep\.trim\(\)\}`/)
})

test("fills the ficha creation date independently from the contract date", () => {
  assert.match(documentTemplatesSource, /dataFicha: formatFichaCreatedDate\(values\.createdAt \|\| ""\)/)
  assert.match(documentTemplatesSource, /\{ createdAt\?: string \}/)
})
