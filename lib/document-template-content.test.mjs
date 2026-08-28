import assert from "node:assert/strict"
import test from "node:test"
import { prepareDocumentTemplateContent } from "./document-template-content.ts"

test("exposes the space before the logo as editable template content", () => {
  const content = prepareDocumentTemplateContent(
    "procuration",
    '<h1 data-document-title="true"><img src="logo.jpg"></h1><p>PROCURAÇÃO</p>'
  )

  assert.match(content, /^<div data-document-top-space="true"/)
  assert.ok(content.indexOf("data-document-top-space") < content.indexOf("<img"))
})

test("does not duplicate an existing editable top space", () => {
  const template = '<div data-document-top-space="true" style="min-height: 32px;"><br></div><h1 data-document-title="true">CONTRATO</h1>'
  assert.equal(prepareDocumentTemplateContent("contract", template), template)
})
