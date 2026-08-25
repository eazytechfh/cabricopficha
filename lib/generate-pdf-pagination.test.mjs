import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("nao cria uma pagina vazia antes da primeira secao grande", async () => {
  const source = await readFile(new URL("./generatePdf.ts", import.meta.url), "utf8")

  assert.match(source, /let pageHasContent = false/)
  assert.match(source, /if \(pageHasContent\) \{\s*pdf\.addPage\(\)/)
  assert.doesNotMatch(source, /if \(currentY > 0\) \{\s*pdf\.addPage\(\)/)
})
