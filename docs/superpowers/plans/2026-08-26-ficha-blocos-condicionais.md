# Blocos Condicionais da Ficha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir na ficha apenas os blocos de multas e observações que tenham dados aplicáveis, mantendo a cláusula adicional fora da ficha.

**Architecture:** Centralizar as decisões de visibilidade em funções puras de `lib/ficha-read-layout.ts`, usadas pelo PDF e pela consulta. Filtrar blocos de multa vazios antes da renderização e condicionar observações ao texto preenchido.

**Tech Stack:** TypeScript, React 19, Next.js 16, Node test runner.

## Global Constraints

- Não alterar migrations históricas existentes.
- Preservar observações adicionais quando houver conteúdo.
- Não reintroduzir a variável ou o bloco de Cláusula Adicional.

---

### Task 1: Regras de visibilidade

**Files:**
- Modify: `lib/ficha-read-layout.ts`
- Modify: `lib/ficha-read-layout.test.mjs`

**Interfaces:**
- Consumes: valores textuais dos campos de multa e observações.
- Produces: `hasFilledText(values: unknown[]): boolean` e `shouldShowAdditionalObservations(value: string): boolean`.

- [ ] **Step 1: Write the failing test**

```js
assert.equal(hasFilledText(["", "  "]), false)
assert.equal(hasFilledText(["", "123"]), true)
assert.equal(shouldShowAdditionalObservations("  "), false)
assert.equal(shouldShowAdditionalObservations("Nota do cliente"), true)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/ficha-read-layout.test.mjs`
Expected: FAIL porque as funções ainda não são exportadas.

- [ ] **Step 3: Write minimal implementation**

```ts
export function hasFilledText(values: unknown[]) {
  return values.some((value) => typeof value === "string" && value.trim().length > 0)
}

export function shouldShowAdditionalObservations(value: string) {
  return value.trim().length > 0
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/ficha-read-layout.test.mjs`
Expected: PASS.

### Task 2: Aplicar regras ao PDF e à consulta

**Files:**
- Modify: `components/FichaPdf.tsx`
- Modify: `components/ficha-read-view.tsx`
- Create: `components/ficha-conditional-sections.test.mjs`

**Interfaces:**
- Consumes: `hasFilledText` e `shouldShowAdditionalObservations`.
- Produces: renderização condicional consistente nas duas superfícies.

- [ ] **Step 1: Write the failing test**

```js
assert.match(pdfSource, /getMultaBlocks\(data\)\.filter/)
assert.match(pdfSource, /shouldShowAdditionalObservations\(data\.observacoes\)/)
assert.doesNotMatch(pdfSource, /clausulaAdicional/i)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test components/ficha-conditional-sections.test.mjs`
Expected: FAIL porque o PDF ainda renderiza multas e observações incondicionalmente.

- [ ] **Step 3: Write minimal implementation**

Filtrar multas pelos campos efetivamente preenchidos, renderizar a seção somente quando restar ao menos um bloco e envolver observações com `shouldShowAdditionalObservations` no PDF e na consulta.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test components/ficha-conditional-sections.test.mjs lib/ficha-read-layout.test.mjs`
Expected: PASS.

- [ ] **Step 5: Verify the repository**

Run: `node --test lib/*.test.mjs components/*.test.mjs`
Expected: PASS.

Run: `npm run lint`
Expected: PASS sem novos erros.
