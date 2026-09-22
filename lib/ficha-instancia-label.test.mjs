import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

function formatInstanciaLabel(value) {
  return (value || "").replace(/(\d°)\s*Inst\b/gi, "$1")
}

test("formatInstanciaLabel remove a abreviacao 'Inst' mantendo DP e o numero da instancia", () => {
  assert.equal(formatInstanciaLabel("DP, 1° Inst, 2° Inst"), "DP, 1°, 2°")
  assert.equal(formatInstanciaLabel("1° Inst"), "1°")
  assert.equal(formatInstanciaLabel("2° Inst"), "2°")
  assert.equal(formatInstanciaLabel("DP"), "DP")
  assert.equal(formatInstanciaLabel(""), "")
})

test("lib/ficha-utils.ts define formatInstanciaLabel removendo a abreviacao 'Inst'", async () => {
  const source = await readFile(new URL("./ficha-utils.ts", import.meta.url), "utf8")

  assert.match(source, /export function formatInstanciaLabel\(value: string\) \{/)
  assert.match(source, /replace\(\/\(\\d°\)\\s\*Inst\\b\/gi, "\$1"\)/)
})

test("consulta e PDF exibem a instancia sem a abreviacao 'Inst'", async () => {
  const [readSource, pdfSource] = await Promise.all([
    readFile(new URL("../components/ficha-read-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/FichaPdf.tsx", import.meta.url), "utf8"),
  ])

  assert.match(readSource, /formatInstanciaLabel\(line\.instanciaProcesso\)/)
  assert.match(readSource, /formatInstanciaLabel\(line\.instanciaMulta\)/)
  assert.match(pdfSource, /formatInstanciaLabel\(line\.instanciaProcesso\)/)
  assert.match(pdfSource, /formatInstanciaLabel\(line\.instanciaMulta\)/)
})

test("PLACA e RENAVAM aparecem centralizados e com destaque na consulta", async () => {
  const readSource = await readFile(new URL("../components/ficha-read-view.tsx", import.meta.url), "utf8")

  assert.match(readSource, /function HighlightValueCell/)
  assert.match(readSource, /<HighlightValueCell label="PLACA"/)
  assert.match(readSource, /<HighlightValueCell label="RENAVAM"/)
})
