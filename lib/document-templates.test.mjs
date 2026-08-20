import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { prepareDocumentTemplateContent } from "./document-template-content.ts"

const documentTemplatesSource = readFileSync(new URL("./document-templates.ts", import.meta.url), "utf8")

test("adds an editable heading to a legacy contract template", () => {
  const content = prepareDocumentTemplateContent("contract", "Contrato de Prestação de Serviços")

  assert.match(content, /^<h1 data-document-title="true"[^>]*>CONTRATO<\/h1>/)
  assert.match(content, /Contrato de Prestação de Serviços$/)
})

test("preserves an edited marked contract heading without duplicating it", () => {
  const customized = '<h1 data-document-title="true">CONTRATO PERSONALIZADO</h1><p>Conteúdo</p>'

  assert.equal(prepareDocumentTemplateContent("contract", customized), customized)
})

test("marks an existing legacy contract heading instead of duplicating it", () => {
  const legacy = "<h1>CONTRATO</h1><p>Conteúdo</p>"
  const content = prepareDocumentTemplateContent("contract", legacy)

  assert.equal(content, '<h1 data-document-title="true">CONTRATO</h1><p>Conteúdo</p>')
})

test("adds an editable heading to a legacy procuration template", () => {
  const content = prepareDocumentTemplateContent("procuration", "<p>OUTORGANTE: Cliente</p>")

  assert.match(content, /^<h1 data-document-title="true"[^>]*>PROCURAÇÃO<\/h1>/)
  assert.match(content, /<p>OUTORGANTE: Cliente<\/p>$/)
})

test("turns the existing plain procuration title into the editable heading", () => {
  const content = prepareDocumentTemplateContent("procuration", "PROCURAÇÃO\n\nOUTORGANTE: Cliente")

  assert.match(content, /^<h1 data-document-title="true"[^>]*>PROCURAÇÃO<\/h1>/)
  assert.equal((content.match(/PROCURAÇÃO/g) ?? []).length, 1)
})

test("only adds a missing additional-clause placeholder to contracts", () => {
  assert.match(
    documentTemplatesSource,
    /kind === "contract"\s*&&\s*placeholders\.clausulaAdicional\s*&&\s*!normalizedTemplate\.includes\("\{\{clausulaAdicional\}\}"\)/,
  )
})
