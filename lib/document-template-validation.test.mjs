import assert from "node:assert/strict"
import test from "node:test"

import {
  MAX_DOCUMENT_TEMPLATE_CONTENT_LENGTH,
  parseDocumentTemplateKind,
  validateDocumentTemplateContent,
} from "./document-template-validation.ts"

test("accepts only known document template kinds", () => {
  assert.equal(parseDocumentTemplateKind("contract"), "contract")
  assert.equal(parseDocumentTemplateKind("procuration"), "procuration")
  assert.equal(parseDocumentTemplateKind("unknown"), null)
  assert.equal(parseDocumentTemplateKind(undefined), null)
})

test("normalizes surrounding whitespace and rejects empty content", () => {
  assert.equal(validateDocumentTemplateContent("  <p>Contrato</p>  "), "<p>Contrato</p>")
  assert.throws(() => validateDocumentTemplateContent("  "), /nao pode ficar vazio/i)
  assert.throws(() => validateDocumentTemplateContent({ content: "Contrato" }), /texto valido/i)
  assert.throws(() => validateDocumentTemplateContent(123), /texto valido/i)
})

test("rejects content that exceeds the persistence boundary", () => {
  const oversized = "x".repeat(MAX_DOCUMENT_TEMPLATE_CONTENT_LENGTH + 1)
  assert.throws(() => validateDocumentTemplateContent(oversized), /muito grande/i)

  const oversizedUtf8 = "á".repeat(Math.floor(MAX_DOCUMENT_TEMPLATE_CONTENT_LENGTH / 2) + 1)
  assert.throws(() => validateDocumentTemplateContent(oversizedUtf8), /muito grande/i)
})
