# Número Próprio da Ficha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar a numeração da ficha do nome do cliente, normalizar dados antigos e gerar a próxima sequência pelo maior número existente para o CPF.

**Architecture:** Uma migration adiciona `numero_ficha`, recupera sufixos antigos de um ou dois dígitos, resolve colisões, limpa os nomes e cria proteção de unicidade por CPF. O servidor passa a ler/gravar a coluna dedicada e a interface formata o número sempre com dois dígitos, mantendo fallback para registros ainda não migrados.

**Tech Stack:** PostgreSQL/Supabase, TypeScript, React, Node test runner.

## Global Constraints

- Não editar migrations históricas.
- Preservar o valor numérico antigo: sufixo `4` deve se tornar `numero_ficha = 4` e ser exibido como `04`.
- Novas fichas usam `MAX(numero_ficha) + 1`, sem reutilizar lacunas após exclusões.
- O nome do cliente deve ser persistido sem o identificador da ficha.

---

### Task 1: Modelo e normalização no banco

**Files:**
- Create: `supabase/2026-08-26-add-numero-ficha.sql`
- Modify: `supabase/schema.sql`
- Create: `lib/ficha-sequence.test.mjs`

**Interfaces:**
- Produces: coluna `numero_ficha integer`, índice único por CPF e sequência, nomes antigos limpos.

- [ ] **Step 1: Write the failing test**

```js
assert.match(migration, /add column if not exists numero_ficha integer/)
assert.match(migration, /substring\(nome_cliente from/)
assert.match(migration, /create unique index/)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/ficha-sequence.test.mjs`
Expected: FAIL porque a migration e a integração ainda não existem.

- [ ] **Step 3: Write minimal implementation**

Criar a coluna, extrair sufixos de um ou dois dígitos, mover colisões e registros sem número para valores acima do máximo do CPF, limpar `nome_cliente` e criar restrições de validade/unicidade.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/ficha-sequence.test.mjs`
Expected: PASS.

### Task 2: Persistência e leitura

**Files:**
- Modify: `lib/ficha-types.ts`
- Modify: `lib/server-fichas.ts`
- Modify: `lib/server-fichas.test.mjs`

**Interfaces:**
- Produces: `FichaRecord.numeroFicha: number`, criação com nome limpo e `numero_ficha`, próxima sequência baseada no maior número.

- [ ] **Step 1: Write the failing test**

```js
assert.match(server, /select: "numero_ficha"/)
assert.match(server, /order: "numero_ficha.desc"/)
assert.match(server, /payload.numero_ficha = sequence/)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/server-fichas.test.mjs`
Expected: FAIL porque o servidor ainda usa contagem de linhas e nome numerado.

- [ ] **Step 3: Write minimal implementation**

Consultar o maior `numero_ficha`, retornar `max + 1`, gravar o número no payload, persistir o nome-base e mapear a coluna em consultas completas e resumidas.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/server-fichas.test.mjs`
Expected: PASS.

### Task 3: Exibição padronizada

**Files:**
- Modify: `lib/ficha-client-name.ts`
- Modify: `lib/ficha-client-name.test.mjs`
- Modify: `components/fichas-workspace.tsx`

**Interfaces:**
- Produces: `formatFichaNumber(numero: number): string` e rótulos `Ficha 01`, `Ficha 02`, `Ficha 04`.

- [ ] **Step 1: Write the failing test**

```js
assert.equal(formatFichaNumber(4), "04")
assert.match(workspace, /getFichaLabel\(contrato.numeroFicha/)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/ficha-client-name.test.mjs`
Expected: FAIL porque o formatador e o uso da coluna ainda não existem.

- [ ] **Step 3: Write minimal implementation**

Adicionar o formatador com `padStart(2, "0")` e fazer `getFichaLabel` priorizar `numeroFicha`, mantendo leitura do sufixo legado como fallback.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/ficha-client-name.test.mjs`
Expected: PASS.

- [ ] **Step 5: Verify the repository**

Run: `node --test lib/ficha-sequence.test.mjs lib/server-fichas.test.mjs lib/ficha-client-name.test.mjs`
Expected: PASS.

Run: `npx eslint lib/server-fichas.ts lib/ficha-types.ts lib/ficha-client-name.ts components/fichas-workspace.tsx`
Expected: nenhum erro novo.
