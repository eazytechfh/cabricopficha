import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { formatClientDisplayName } from "./ficha-client-name.ts"

const utilitySource = await readFile(new URL("./ficha-client-name.ts", import.meta.url), "utf8").catch(() => "")

test("removes only the internal two-digit ficha sequence from the displayed client name", () => {
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
