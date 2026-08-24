import assert from "node:assert/strict"
import test from "node:test"
import { normalizeDocumentListSpacing } from "./document-list-spacing.ts"

test("turns blank numbered items into neutral spacing blocks", () => {
  assert.equal(
    normalizeDocumentListSpacing("<ol><li>Primeiro</li><li>&nbsp;</li><li>Segundo</li></ol>"),
    '<ol><li>Primeiro</li><div data-list-spacer="true"><br></div><li>Segundo</li></ol>'
  )
})

test("preserves content and nested list hierarchy", () => {
  const html = "<ol><li>Principal<ul><li>Detalhe</li></ul></li><li><br></li><li>Próximo</li></ol>"
  const normalized = normalizeDocumentListSpacing(html)

  assert.match(normalized, /<li>Principal<ul><li>Detalhe<\/li><\/ul><\/li>/)
  assert.match(normalized, /<div data-list-spacer="true"><br><\/div><li>Próximo<\/li>/)
})

test("is idempotent for spacing blocks already normalized", () => {
  const html = '<ol><li>Um</li><div data-list-spacer="true"><br></div><li>Dois</li></ol>'
  assert.equal(normalizeDocumentListSpacing(html), html)
})
