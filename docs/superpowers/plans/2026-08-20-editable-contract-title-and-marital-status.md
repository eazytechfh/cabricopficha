# Editable Contract Title and Marital Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display `(A)` in gendered marital-status options and make the contract heading part of the editable, persisted contract template.

**Architecture:** Keep marital-status labels centralized in `lib/ficha-options.ts`. Introduce a document-template normalizer that upgrades legacy contract content by adding a marked editable heading, use it for defaults and server-loaded records, and suppress only the old fixed contract heading in the PDF shell so the preview has one title.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner.

## Global Constraints

- Preserve unrelated local modifications in the dirty worktree.
- Existing saved contract templates must gain an editable `CONTRATO` heading without a database migration.
- The preview and generated PDF must render the contract heading exactly once.

---

### Task 1: Marital-status labels

**Files:**
- Modify: `lib/ficha-options.ts`
- Create: `lib/ficha-options.test.mjs`

**Interfaces:**
- Consumes: `ESTADO_CIVIL_OPTIONS: readonly string[]`
- Produces: the same exported constant with `CASADO(A)`, `SOLTEIRO(A)`, `UNIÃO ESTÁVEL`, `DIVORCIADO(A)`, and `VIÚVO(A)`.

- [x] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict"
import test from "node:test"
import { ESTADO_CIVIL_OPTIONS } from "./ficha-options.ts"

test("adds (A) to gendered marital statuses but not to stable union", () => {
  assert.deepEqual([...ESTADO_CIVIL_OPTIONS], [
    "CASADO(A)", "SOLTEIRO(A)", "UNIÃO ESTÁVEL", "DIVORCIADO(A)", "VIÚVO(A)",
  ])
})
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --experimental-strip-types --test lib/ficha-options.test.mjs`
Expected: FAIL because the current options do not include `(A)`.

- [x] **Step 3: Write minimal implementation**

```ts
export const ESTADO_CIVIL_OPTIONS = ["CASADO(A)", "SOLTEIRO(A)", "UNIÃO ESTÁVEL", "DIVORCIADO(A)", "VIÚVO(A)"] as const
```

- [x] **Step 4: Run test to verify it passes**

Run: `node --experimental-strip-types --test lib/ficha-options.test.mjs`
Expected: PASS.

### Task 2: Editable contract heading

**Files:**
- Modify: `lib/document-templates.ts`
- Create: `lib/document-template-content.ts`
- Create: `lib/document-templates.test.mjs`
- Modify: `lib/server-document-templates.ts`
- Modify: `components/DocumentTemplatePdf.tsx`
- Modify: `components/fichas-workspace.tsx`
- Modify: `components/fichas-workspace.test.mjs`

**Interfaces:**
- Consumes: `DocumentTemplateKind`, legacy stored contract HTML, and the existing `DocumentTemplatePdf` props.
- Produces: `prepareDocumentTemplateContent(kind, content): string`, which normalizes HTML and prepends a marked editable contract heading only when legacy content lacks one.

- [x] **Step 1: Write failing behavior and integration tests**

```js
assert.match(prepareDocumentTemplateContent("contract", "Contrato de Prestação"), /data-document-title="true"[^>]*>CONTRATO</)
assert.equal(prepareDocumentTemplateContent("contract", markedCustomizedTitle), markedCustomizedTitle)
assert.doesNotMatch(pdfSource, /\{title\}/)
assert.match(workspaceSource, /prepareDocumentTemplateContent\(kind, DEFAULT_DOCUMENT_TEMPLATES\[kind\]\)/)
```

- [x] **Step 2: Run tests to verify they fail**

Run: `node --experimental-strip-types --test lib/document-templates.test.mjs components/fichas-workspace.test.mjs`
Expected: FAIL because the helper and contract-specific PDF behavior do not exist.

- [x] **Step 3: Implement the minimal compatibility normalizer**

```ts
export function prepareDocumentTemplateContent(kind: DocumentTemplateKind, template: string) {
  const content = normalizeDocumentTemplateContent(template)
  if (kind !== "contract" || /data-document-title=["']true["']/i.test(content)) return content
  return `<h1 data-document-title="true" style="text-align: center; font-size: 22px; font-weight: 800;">CONTRATO</h1>${content}`
}
```

Use this helper for default and stored server records and for the editor's immediate fallback content. Render the fixed PDF heading only for non-contract documents, leaving the marked heading inside the contract HTML editable and persistent.

- [x] **Step 4: Run focused and full verification**

Run: `node --experimental-strip-types --test lib/*.test.mjs components/*.test.mjs`
Expected: all tests PASS.

Run: `npm run build`
Expected: Next.js production build completes without TypeScript errors.
