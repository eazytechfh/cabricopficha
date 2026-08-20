import assert from "node:assert/strict"
import test from "node:test"

import {
  hasMeaningfulDocumentTemplateContent,
  MAX_DOCUMENT_TEMPLATE_CONTENT_LENGTH,
  parseDocumentTemplateKind,
  validateDocumentTemplateContent,
} from "./document-template-validation.ts"

test("treats visually empty rich text as empty but preserves meaningful content", () => {
  for (const emptyContent of [
    "",
    "   ",
    "<br>",
    "<div><br></div>",
    "<p>&nbsp;</p>",
    "<p>\u200b</p>",
    '<!-- <img src="data:image/png;base64,abc"> -->',
    "<style>body { color: red }</style>",
    "<script>void 0</script>",
    "<p>&emsp;&#32;&#x20;</p>",
    "<p>&Tab;&NewLine;&#032;</p>",
    '<img src="">',
    "<img src='   '>",
  ]) {
    assert.equal(hasMeaningfulDocumentTemplateContent(emptyContent), false, emptyContent)
  }

  assert.equal(hasMeaningfulDocumentTemplateContent("<p>PROCURAÇÃO</p>"), true)
  assert.equal(hasMeaningfulDocumentTemplateContent("<p>{{nomeCliente}}</p>"), true)
  assert.equal(hasMeaningfulDocumentTemplateContent('<img src="data:image/png;base64,abc">'), true)
})

test("accepts only known document template kinds", () => {
  assert.equal(parseDocumentTemplateKind("contract"), "contract")
  assert.equal(parseDocumentTemplateKind("procuration"), "procuration")
  assert.equal(parseDocumentTemplateKind("unknown"), null)
  assert.equal(parseDocumentTemplateKind(undefined), null)
})

test("normalizes surrounding whitespace and rejects empty content", () => {
  assert.equal(validateDocumentTemplateContent("  <p>Contrato</p>  "), "<p>Contrato</p>")
  assert.throws(() => validateDocumentTemplateContent("  "), /nao pode ficar vazio/i)
  assert.throws(() => validateDocumentTemplateContent("<div><br></div>"), /nao pode ficar vazio/i)
  assert.throws(() => validateDocumentTemplateContent({ content: "Contrato" }), /texto valido/i)
  assert.throws(() => validateDocumentTemplateContent(123), /texto valido/i)
})

test("rejects content that exceeds the persistence boundary", () => {
  const oversized = "x".repeat(MAX_DOCUMENT_TEMPLATE_CONTENT_LENGTH + 1)
  assert.throws(() => validateDocumentTemplateContent(oversized), /muito grande/i)

  const oversizedUtf8 = "á".repeat(Math.floor(MAX_DOCUMENT_TEMPLATE_CONTENT_LENGTH / 2) + 1)
  assert.throws(() => validateDocumentTemplateContent(oversizedUtf8), /muito grande/i)
})
