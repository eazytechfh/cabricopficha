import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("multas e processos oferecem AG Penalidade como prazo", async () => {
  const source = await readFile(new URL("./ficha-form.tsx", import.meta.url), "utf8")
  const option = '<SelectItem value="AG Penalidade">AG Penalidade</SelectItem>'

  assert.equal(source.split(option).length - 1, 2)
  assert.match(source, /if \(value === "AG Penalidade"\) return "AG Penalidade"/)
  assert.equal(source.split('? "grid grid-cols-\[110px_minmax\(0,1fr\)\] gap-2" : "grid grid-cols-1"').length - 1, 2)
  assert.equal(source.split('=== "DATA" ? \(').length - 1 >= 2, true)
})

test("AG Penalidade e preservado nas visualizacoes e na persistencia", async () => {
  const [readView, pdf, server] = await Promise.all([
    readFile(new URL("./ficha-read-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("./FichaPdf.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/server-fichas.ts", import.meta.url), "utf8"),
  ])

  assert.match(readView, /AG Penalidade/)
  assert.match(pdf, /AG Penalidade/)
  assert.match(server, /AG_PENALIDADE_SENTINEL_DATE/)
  assert.match(server, /return "AG Penalidade"/)
})
