import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("filters ficha rows in PostgREST with an accent-insensitive name pattern", async () => {
  const source = await readFile(new URL("./server-fichas.ts", import.meta.url), "utf8")

  assert.match(source, /buildAccentInsensitivePattern/)
  assert.match(source, /searchParams\.set\("nome_cliente", `imatch\.\$\{buildAccentInsensitivePattern\(nome\)\}`\)/)
  assert.doesNotMatch(source, /pageSearchParams\.set\("offset"/)
})

test("duplicate protection rechecks before create and supports safe deletion", async () => {
  const server = await readFile(new URL("./server-fichas.ts", import.meta.url), "utf8")
  const collectionRoute = await readFile(new URL("../app/api/fichas/route.ts", import.meta.url), "utf8")
  const itemRoute = await readFile(new URL("../app/api/fichas/[id]/route.ts", import.meta.url), "utf8")

  assert.match(server, /export async function findPotentialDuplicateFichas/)
  assert.match(server, /export async function deleteFicha/)
  assert.match(server, /export async function deleteFichaFromExcel/)
  assert.match(collectionRoute, /POTENTIAL_DUPLICATE/)
  assert.match(collectionRoute, /findPotentialDuplicateFichas\(data\)/)
  assert.match(collectionRoute, /resolution\?\.action === "merge"/)
  assert.match(itemRoute, /export async function DELETE/)
  assert.match(itemRoute, /canEditFicha/)
  assert.match(itemRoute, /deleteFichaFromExcel/)
})
