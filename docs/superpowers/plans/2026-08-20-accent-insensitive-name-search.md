# Accent-Insensitive Name Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ficha name searches match regardless of accents, case, or repeated whitespace.

**Architecture:** Add a small pure text-search utility using Unicode decomposition and safe regular-expression character groups. Name searches use PostgREST's case-insensitive `imatch` operator so PostgreSQL returns only matching rows without a database migration; CPF filtering remains unchanged.

**Tech Stack:** Next.js 16, TypeScript, Supabase PostgREST, Node test runner.

## Global Constraints

- `ROGE`, `ROGÉ`, `roge`, and `rogé` must match equivalent stored names.
- Existing accented and unaccented records must work without changing stored data.
- API responses must include only matching records.
- CPF and CNPJ searches must preserve their existing behavior.

---

### Task 1: Accent-insensitive server search

**Files:**
- Create: `lib/search-utils.ts`
- Create: `lib/search-utils.test.mjs`
- Modify: `lib/server-fichas.ts`
- Create: `lib/server-fichas.test.mjs`

**Interfaces:**
- Produces: `normalizeSearchText(value: string): string`, `includesNormalizedSearch(candidate: string, query: string): boolean`, and `buildAccentInsensitivePattern(query: string): string`.
- Consumes: `nome_cliente` values returned from Supabase and the `nome` query received by `getFichasByFilters`.

- [x] **Step 1: Write failing tests**

```js
assert.equal(normalizeSearchText("  Rogério  Silva "), "rogerio silva")
assert.equal(includesNormalizedSearch("ROGÉRIO DA SILVA", "roge"), true)
assert.equal(includesNormalizedSearch("Rogerio da Silva", "rogé"), true)
assert.equal(buildAccentInsensitivePattern("Rogé"), "r[oóòôõö]g[eéèêë]")
assert.match(serverSource, /imatch/)
```

- [x] **Step 2: Run tests and verify the missing behavior**

Run: `node --experimental-strip-types --test lib/search-utils.test.mjs lib/server-fichas.test.mjs`
Expected: FAIL because the search utility and server integration do not exist.

- [x] **Step 3: Implement normalization and database filtering**

```ts
export function normalizeSearchText(value: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
    .replace(/\s+/g, " ")
}

export function includesNormalizedSearch(candidate: string, query: string) {
  const normalizedQuery = normalizeSearchText(query)
  return Boolean(normalizedQuery) && normalizeSearchText(candidate).includes(normalizedQuery)
}
```

Build a safely escaped PostgreSQL pattern that expands letters such as `o` to `[oóòôõö]`, then set `nome_cliente` to `imatch.<pattern>` in `getFichasByFilters` when a name was supplied.

- [x] **Step 4: Run full verification**

Run: `node --experimental-strip-types --test lib/*.test.mjs components/*.test.mjs`
Expected: all tests PASS.

Run: `npm run build`
Expected: Next.js production build completes successfully.
