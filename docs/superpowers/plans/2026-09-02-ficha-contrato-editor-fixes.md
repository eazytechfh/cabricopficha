# Ficha, Contract, and Document Editor Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve ficha data correctly and make generated contracts and the document editor match the requested formatting and editing behavior.

**Architecture:** Keep normalization and rendering rules in focused `lib/` helpers, with React components limited to wiring form/editor events. Persist third-party ownership data through the existing serialized multi-fine fields and verify database round trips separately from presentation formatting.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase/PostgreSQL, Node test runner, CSS.

## Global Constraints

- Preserve existing multi-entry serialization compatibility.
- Do not edit historical database migrations; add a new migration if the deployed schema needs repair.
- Generated ficha PDF and document-template preview must use the same saved values.
- Copy and paste must remain available in editable form fields and the document editor.

---

### Task 1: Contract placeholder formatting

**Files:**
- Modify: `lib/document-templates.ts`
- Modify: `lib/document-templates.test.mjs`

**Interfaces:**
- Consumes: `FichaFormValues.dataContrato`, `estadoCivil`, and serialized process/fine fields.
- Produces: HTML-safe placeholder values with sentence case, contract date, and one summary item per visual line.

- [ ] Add failing behavioral tests for sentence-case civil status, `dataContrato` as `dataFicha`, and `<br>` summary separators.
- [ ] Run `node --test lib/document-templates.test.mjs` and confirm the new assertions fail.
- [ ] Implement the smallest placeholder formatting changes.
- [ ] Re-run the focused tests and confirm they pass.

### Task 2: Third-party CPF persistence and PDF display

**Files:**
- Modify: `lib/ficha-utils.ts`
- Modify: `lib/ficha-utils.test.mjs`
- Modify: `lib/server-fichas.ts`
- Modify: `lib/server-fichas.test.mjs`
- Modify: `components/FichaPdf.tsx`
- Create: `supabase/migrations/20260902_ensure_third_party_owner_fields.sql`

**Interfaces:**
- Consumes: serialized `placaProprietario` and `cpfProprietario` values.
- Produces: normalized ownership values that survive create/update/read and appear conditionally in the ficha PDF.

- [ ] Add failing tests for retaining `nao` plus CPF through normalization and payload/row mapping.
- [ ] Run the focused tests and verify the regression is reproduced.
- [ ] Correct defaults/normalization and add an idempotent schema migration for both columns.
- [ ] Verify the focused tests pass and the PDF condition remains tied to the saved ownership value.

### Task 3: Copy/paste and isolated editor formatting

**Files:**
- Modify: `lib/document-editor.ts`
- Modify: `lib/document-editor.test.mjs`
- Modify: `components/fichas-workspace.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: the saved DOM `Range` inside the contenteditable editor.
- Produces: selection-scoped alignment and normal clipboard behavior in editable controls.

- [ ] Add a failing alignment test where a partially selected block must not cause an unrelated ancestor/sibling to change.
- [ ] Run the test and confirm the current block discovery fails it.
- [ ] Restrict alignment to the closest selected blocks and explicitly enable text selection/clipboard interaction on editable controls.
- [ ] Re-run the editor tests.

### Task 4: Numbered-list spacing and submenu marker

**Files:**
- Modify: `lib/document-list-spacing.ts`
- Modify: `lib/document-list-spacing.test.mjs`
- Modify: `components/fichas-workspace.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: empty list items and the current editor selection.
- Produces: spacing that does not corrupt ordered numbering and a visible submenu action with nested marker styling.

- [ ] Add failing tests for preserving ordered-list continuation while inserting neutral spacing.
- [ ] Run the focused test and confirm failure.
- [ ] Implement valid list splitting/continuation markup and expose a clearly labeled submenu control.
- [ ] Run list/editor tests, lint, and production build.

