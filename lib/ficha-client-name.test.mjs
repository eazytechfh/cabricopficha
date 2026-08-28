import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { formatClientDisplayName, formatFichaNumber } from "./ficha-client-name.ts"

const utilitySource = await readFile(new URL("./ficha-client-name.ts", import.meta.url), "utf8").catch(() => "")

test("removes the old two-digit suffix without changing legitimate single digits", () => {
  assert.match(utilitySource, /export function formatClientDisplayName/)
  assert.match(utilitySource, /replace\(\/\\s\+\\d\{2\}\$\//)
  assert.equal(formatClientDisplayName("FRANCISCO ALBERTO BRAVO PATRICIO 02"), "FRANCISCO ALBERTO BRAVO PATRICIO")
  assert.equal(formatClientDisplayName("EMPRESA 3M"), "EMPRESA 3M")
  assert.equal(formatClientDisplayName("CLIENTE 2"), "CLIENTE 2")
})

test("the ficha PDF displays the formatted client name", async () => {
  const source = await readFile(new URL("../components/FichaPdf.tsx", import.meta.url), "utf8")

  assert.match(source, /field\("Nome Completo", formatClientDisplayName\(data\.nomeCliente\)\)/)
})

test("formats every ficha number with at least two digits", () => {
  assert.equal(formatFichaNumber(1), "01")
  assert.equal(formatFichaNumber(4), "04")
  assert.equal(formatFichaNumber(12), "12")
})

test("workspace uses the dedicated number when labeling contracts", async () => {
  const source = await readFile(new URL("../components/fichas-workspace.tsx", import.meta.url), "utf8")

  assert.match(source, /getFichaLabel\(contrato\.numeroFicha, contrato\.nomeCliente\)/)
})
