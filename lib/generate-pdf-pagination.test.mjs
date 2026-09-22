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

test("aproveita o espaco restante e quebra secoes apenas entre linhas", async () => {
  const [generatorSource, fichaSource] = await Promise.all([
    readFile(new URL("./generatePdf.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/FichaPdf.tsx", import.meta.url), "utf8"),
  ])

  assert.match(fichaSource, /data-pdf-row="true"/)
  assert.match(generatorSource, /function getSafeBreakOffsetsPx/)
  assert.match(generatorSource, /function appendSectionAtSafeBreaks/)
  assert.match(generatorSource, /safeBreakOffsetsPx\.findLast/)
  assert.match(generatorSource, /sectionHeightMm > remainingHeightMm/)
})

test("quebra texto corrido (sem data-pdf-row) apenas entre linhas, nunca no meio de uma palavra", async () => {
  const source = await readFile(new URL("./generatePdf.ts", import.meta.url), "utf8")

  assert.match(source, /function getTextLineBreakOffsetsPx/)
  assert.match(source, /createTreeWalker\(section, NodeFilter\.SHOW_TEXT/)
  assert.match(source, /range\.getClientRects\(\)/)
  assert.match(source, /: getTextLineBreakOffsetsPx\(section, canvas\)/)
})

test("nao quebra linha nos campos Instancia e Prazo das multas e processos no PDF", async () => {
  const source = await readFile(new URL("../components/FichaPdf.tsx", import.meta.url), "utf8")

  assert.match(source, /nowrapField\("Instância", line\.instanciaMulta\)/)
  assert.match(source, /nowrapField\("Prazo", formatDate\(line\.prazoMulta\)\)/)
  assert.match(source, /nowrapField\("Instância", line\.instanciaProcesso\)/)
  assert.match(source, /nowrapField\("Prazo", formatDate\(line\.prazoProcesso\)\)/)
})
