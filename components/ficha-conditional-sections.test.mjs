import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const [pdfSource, readViewSource, fichaTypesSource] = await Promise.all([
  readFile(new URL("./FichaPdf.tsx", import.meta.url), "utf8"),
  readFile(new URL("./ficha-read-view.tsx", import.meta.url), "utf8"),
  readFile(new URL("../lib/ficha-types.ts", import.meta.url), "utf8"),
])

test("the generated PDF filters empty fines and omits the fines section", () => {
  assert.match(pdfSource, /getMultaBlocks\(data\)\.filter/)
  assert.match(pdfSource, /\{multaBlocks\.length > 0 \? section\("MULTAS"/)
})

test("additional observations are conditional in PDF and consultation", () => {
  assert.match(pdfSource, /shouldShowAdditionalObservations\(data\.observacoes\)/)
  assert.match(readViewSource, /shouldShowAdditionalObservations\(values\.observacoes\)/)
})

test("additional clause stays removed from active ficha components and values", () => {
  assert.doesNotMatch(pdfSource, /clausulaAdicional|Cl[aá]usula Adicional/i)
  assert.doesNotMatch(readViewSource, /clausulaAdicional|Cl[aá]usula Adicional/i)
  assert.doesNotMatch(fichaTypesSource, /clausulaAdicional/i)
})
