# Editor e Preview Lado a Lado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir o editor do modelo e seu preview lado a lado em telas largas, mantendo empilhamento responsivo em telas menores.

**Architecture:** Ampliar o modal do editor e envolver editor/preview em uma grade responsiva de duas colunas. Cada painel terá cabeçalho e rolagem independente, enquanto ferramentas, mensagens e rodapé permanecem compartilhados.

**Tech Stack:** React, Tailwind CSS, Node test runner.

## Global Constraints

- Duas colunas somente em telas largas.
- Em telas menores, editor e preview permanecem empilhados.
- Editor e preview devem ter rolagem independente.
- Salvar, fechar, variáveis e formatação devem continuar funcionando.

---

### Task 1: Layout responsivo do editor de modelos

**Files:**
- Modify: `components/fichas-workspace.tsx`
- Modify: `components/fichas-workspace.test.mjs`

**Interfaces:**
- Consumes: `templateContent`, `templatePreviewContent` e `DocumentTemplatePdf` existentes.
- Produces: grade `xl:grid-cols-2` com painéis identificados como “Conteúdo do modelo” e “Preview do documento”.

- [ ] **Step 1: Write the failing test**

```js
assert.match(source, /xl:grid-cols-2/)
assert.match(source, /Conteúdo do modelo/)
assert.match(source, /xl:max-w-\[1500px\]/)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test components/fichas-workspace.test.mjs`
Expected: FAIL porque editor e preview ainda estão empilhados.

- [ ] **Step 3: Write minimal implementation**

Ampliar o `DialogContent`, criar a grade responsiva, mover editor e preview para painéis irmãos e limitar cada área a `h-[60vh]` com rolagem própria.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test components/fichas-workspace.test.mjs`
Expected: PASS para o novo teste de layout.

- [ ] **Step 5: Verify lint**

Run: `npx eslint components/fichas-workspace.tsx components/fichas-workspace.test.mjs`
Expected: nenhum erro novo.
