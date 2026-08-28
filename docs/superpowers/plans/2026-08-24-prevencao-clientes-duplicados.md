# Prevenção de Clientes Duplicados Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verificar correspondências antes da criação definitiva de uma ficha e permitir criar separadamente, unificar com o cliente existente ou excluir uma ficha duplicada.

**Architecture:** A comparação fica em uma unidade pura e testável, enquanto `server-fichas.ts` consulta o Supabase e devolve correspondências com motivos. A rota de criação exige uma resolução explícita quando há correspondências; a tela apresenta um diálogo e só chama a criação depois da decisão. Como a aplicação representa contratos e clientes na mesma tabela, unificar cria o novo contrato com os dados cadastrais canônicos da ficha selecionada, sem sobrescrever o contrato existente.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase REST/PostgREST, Node test runner, XLSX.

## Global Constraints

- A verificação deve ocorrer antes da criação definitiva do cliente.
- Considerar nome, telefone, número de endereço, e-mail, CPF/CNPJ, CNH e demais identificadores relevantes.
- Não alterar fichas existentes durante “cadastrar como novo” ou “unificar”.
- Exigir confirmação explícita antes de excluir e respeitar a mesma permissão usada para editar fichas.
- Manter Supabase e o arquivo Excel local consistentes após exclusão.

---

### Task 1: Comparação determinística de duplicidades

**Files:**
- Create: `lib/ficha-duplicates.ts`
- Test: `lib/ficha-duplicates.test.mjs`

**Interfaces:**
- Consumes: `FichaFormValues` e candidatos com os campos cadastrais de `FichaRecord`.
- Produces: `findDuplicateReasons(input, candidate): DuplicateReason[]` e `mergeClientIdentity(input, existing): FichaFormValues`.

- [ ] **Step 1: Write the failing test** cobrindo normalização sem acentos, telefone só com dígitos, e-mail em minúsculas, CPF/CNPJ e número de endereço, além da preservação dos dados do novo contrato durante a unificação.
- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/ficha-duplicates.test.mjs`
Expected: FAIL porque `ficha-duplicates.ts` ainda não existe.

- [ ] **Step 3: Write minimal implementation** com normalizadores locais, motivos rotulados e uma lista explícita dos campos cadastrais reutilizados.
- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/ficha-duplicates.test.mjs`
Expected: PASS.

### Task 2: Consulta, bloqueio de criação e exclusão no servidor

**Files:**
- Modify: `lib/server-fichas.ts`
- Modify: `app/api/fichas/route.ts`
- Modify: `app/api/fichas/[id]/route.ts`
- Modify: `lib/fichas-api.ts`
- Modify: `lib/ficha-types.ts`
- Test: `lib/server-fichas.test.mjs`

**Interfaces:**
- Consumes: `DuplicateResolution = { action: "create_new" | "merge"; matchedFichaId?: string }`.
- Produces: `POST /api/fichas/duplicates`, erro HTTP 409 `{ code: "POTENTIAL_DUPLICATE", matches }`, e `DELETE /api/fichas/:id`.

- [ ] **Step 1: Write failing source-contract tests** que exijam consulta anterior à mutação, resolução explícita na criação, verificação novamente no servidor, permissão na exclusão e remoção da linha no Excel.
- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/server-fichas.test.mjs`
Expected: FAIL nos novos contratos de integração.

- [ ] **Step 3: Implement minimal server flow** selecionando somente campos necessários, classificando correspondências, rechecando imediatamente antes do POST, aplicando a identidade da ficha escolhida em `merge` e implementando DELETE no Supabase e Excel.
- [ ] **Step 4: Run server tests**

Run: `node --test lib/server-fichas.test.mjs`
Expected: PASS.

### Task 3: Diálogo de decisão antes do cadastro

**Files:**
- Modify: `components/fichas-workspace.tsx`
- Test: `components/fichas-workspace.test.mjs`

**Interfaces:**
- Consumes: `checkFichaDuplicates`, `deleteFicha` e `saveFichaWithPdfAndWebhook(..., resolution)`.
- Produces: diálogo com correspondências, motivos e ações “Cadastrar como novo”, “Unificar” e “Excluir duplicado”.

- [ ] **Step 1: Write failing source-contract test** exigindo que `handleCreate` consulte antes de salvar, que o modal exponha as três ações e que exclusão tenha confirmação explícita.
- [ ] **Step 2: Run test to verify it fails**

Run: `node --test components/fichas-workspace.test.mjs`
Expected: FAIL nos novos contratos de UI.

- [ ] **Step 3: Implement minimal UI** mantendo o formulário preenchido, impedindo chamadas duplas durante carregamento e retomando o salvamento somente após uma decisão.
- [ ] **Step 4: Run UI tests**

Run: `node --test components/fichas-workspace.test.mjs`
Expected: PASS.

### Task 4: Verificação integrada de regressão

**Files:**
- Modify: `package.json` somente se necessário para expor um comando de testes já executável.

**Interfaces:**
- Consumes: todos os artefatos anteriores.
- Produces: build e suíte existentes sem regressão.

- [ ] **Step 1: Run all Node tests**

Run: `node --test lib/*.test.mjs components/*.test.mjs`
Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: sem novos erros.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: build concluído com sucesso.
