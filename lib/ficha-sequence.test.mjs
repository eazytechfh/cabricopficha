import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const migration = await readFile(new URL("../supabase/2026-08-26-add-numero-ficha.sql", import.meta.url), "utf8").catch(() => "")
const schema = await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8")
const clientSequenceMigration = await readFile(new URL("../supabase/2026-08-28-fix-ficha-sequence-by-client.sql", import.meta.url), "utf8")

test("migration separates the ficha number and normalizes legacy suffixes", () => {
  assert.match(migration, /add column if not exists numero_ficha integer/i)
  assert.match(migration, /substring\(nome_cliente from '[^']*\[0-9\]\{1,2\}[^']*'\)/i)
  assert.match(migration, /regexp_replace\(nome_cliente, '[^']*\[0-9\]\{1,2\}[^']*'/i)
})

test("migration prevents duplicate ficha numbers for the same normalized CPF", () => {
  assert.match(migration, /create unique index/i)
  assert.match(migration, /numero_ficha/i)
  assert.match(migration, /check \(numero_ficha > 0\)/i)
})

test("current schema includes the dedicated ficha number", () => {
  assert.match(schema, /numero_ficha integer/i)
})

test("renumbers legacy rows only when the client has CPF/CNPJ", () => {
  assert.match(clientSequenceMigration, /row_number\(\) over/i)
  assert.match(clientSequenceMigration, /data_contrato nulls last, created_at nulls last, id/i)
  assert.match(clientSequenceMigration, /nome_cliente_value/i)
  assert.doesNotMatch(clientSequenceMigration, /lower\(regexp_replace\(trim\(coalesce\(nome_cliente_value/i)
  assert.match(clientSequenceMigration, /pg_advisory_xact_lock/i)
  assert.match(clientSequenceMigration, /create unique index/i)
})
