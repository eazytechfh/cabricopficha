import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("nao cria uma pagina vazia antes da primeira secao grande", async () => {
  const source = await readFile(new URL("./generatePdf.ts", import.meta.url), "utf8")

  assert.match(source, /let pageHasContent = false/)
  assert.match(source, /if \(pageHasContent\) \{\s*pdf\.addPage\(\)/)
  assert.doesNotMatch(source, /if \(currentY > 0\) \{\s*pdf\.addPage\(\)/)
})

test("compacta as capturas da ficha antes de inclui-las no PDF", async () => {
  const source = await readFile(new URL("./generatePdf.ts", import.meta.url), "utf8")

  assert.match(source, /const PDF_IMAGE_QUALITY = 0\.82/)
  assert.match(source, /canvas\.toDataURL\("image\/jpeg", PDF_IMAGE_QUALITY\)/)
  assert.match(source, /pdf\.addImage\(imageData, "JPEG", xMm, yMm, widthMm, heightMm, undefined, "FAST"\)/)
  assert.match(source, /new jsPDF\(\{ orientation: "p", unit: "mm", format: "a4", compress: true \}\)/)
  assert.doesNotMatch(source, /toDataURL\("image\/png"\)/)
})
