import assert from "node:assert/strict"
import test from "node:test"
import { normalizeDocumentListSpacing } from "./document-list-spacing.ts"

test("turns blank numbered items into neutral spacing items", () => {
  assert.equal(
    normalizeDocumentListSpacing("<ol><li>Primeiro</li><li>&nbsp;</li><li>Segundo</li></ol>"),
    '<ol><li>Primeiro</li><li data-list-spacer="true"><br></li><li>Segundo</li></ol>'
  )
})

test("preserves content and nested list hierarchy", () => {
  const html = "<ol><li>Principal<ul><li>Detalhe</li></ul></li><li><br></li><li>Próximo</li></ol>"
  const normalized = normalizeDocumentListSpacing(html)

  assert.match(normalized, /<li>Principal<ul><li>Detalhe<\/li><\/ul><\/li>/)
  assert.match(normalized, /<li data-list-spacer="true"><br><\/li><li>Próximo<\/li>/)
})

test("is idempotent for spacing items already normalized", () => {
  const html = '<ol><li>Um</li><li data-list-spacer="true"><br></li><li>Dois</li></ol>'
  assert.equal(normalizeDocumentListSpacing(html), html)
})
