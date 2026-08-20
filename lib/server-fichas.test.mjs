import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("filters ficha rows in PostgREST with an accent-insensitive name pattern", async () => {
  const source = await readFile(new URL("./server-fichas.ts", import.meta.url), "utf8")

  assert.match(source, /buildAccentInsensitivePattern/)
  assert.match(source, /searchParams\.set\("nome_cliente", `imatch\.\$\{buildAccentInsensitivePattern\(nome\)\}`\)/)
  assert.doesNotMatch(source, /pageSearchParams\.set\("offset"/)
})
