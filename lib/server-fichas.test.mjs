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

test("creates ficha numbers from the highest existing client number instead of row count", async () => {
  const server = await readFile(new URL("./server-fichas.ts", import.meta.url), "utf8")

  assert.match(server, /select: "numero_ficha"/)
  assert.match(server, /order: "numero_ficha\.desc"/)
  assert.match(server, /const highestSequence = Number\(rows\[0\]\?\.numero_ficha \?\? 0\)/)
  assert.match(server, /return highestSequence \+ 1/)
  assert.match(server, /payload\.numero_ficha = sequence/)
  assert.match(server, /getFichaSequenceByClient\(data\.cpfCnpj, data\.nomeCliente\)/)
  assert.match(server, /nome_cliente/)
  assert.doesNotMatch(server, /\)\.length \+ 1/)
})

test("persists complete process and fine deadlines in dedicated text columns", async () => {
  const server = await readFile(new URL("./server-fichas.ts", import.meta.url), "utf8")

  assert.match(server, /prazos_processo_texto: normalizedData\.prazoProcesso \|\| null/)
  assert.match(server, /prazos_multa_texto: normalizedData\.prazoMulta \|\| null/)
  assert.match(server, /String\(row\.prazos_processo_texto \?\? row\.assinatura_visto_juridico \?\? ""\)/)
  assert.match(server, /String\(row\.prazos_multa_texto \?\? ""\) \|\| fromDatabaseDate\(row\.prazo_multa\)/)
  assert.match(server, /return !\["prazos_processo_texto", "prazos_multa_texto", "cpf_proprietario"\]\.includes\(column\)/)
})

test("merges selected client records through one atomic database operation", async () => {
  const server = await readFile(new URL("./server-fichas.ts", import.meta.url), "utf8")
  const route = await readFile(new URL("../app/api/fichas/merge/route.ts", import.meta.url), "utf8")
  const migration = await readFile(new URL("../supabase/2026-08-28-merge-ficha-clients.sql", import.meta.url), "utf8")

  assert.match(server, /rpc\/merge_ficha_clients/)
  assert.match(route, /nivelAcesso !== "admin"/)
  assert.match(migration, /create or replace function public\.merge_ficha_clients/i)
  assert.match(migration, /security definer/i)
  assert.match(migration, /revoke all on function/i)
  assert.match(migration, /insert into public\.activity_logs/i)
})
