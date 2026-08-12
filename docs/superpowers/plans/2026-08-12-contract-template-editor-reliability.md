# Contract Template Editor Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make document templates load consistently, preserve text selection while formatting fonts, add undo, and prevent stale or oversized editor operations from causing future failures.

**Architecture:** Keep the existing content-editable editor and browser editing commands, but isolate DOM synchronization and selection handling in a small tested utility. The workspace owns request sequencing and UI state, while the API validates template kinds and payload bounds before persistence.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.7, Node test runner, Radix UI.

## Global Constraints

- Preserve the existing Supabase schema and document placeholders.
- Do not modify existing migrations.
- Keep template updates restricted to active administrators.
- Use tests first for every behavior change.

---

### Task 1: Rich-text editor lifecycle and selection utilities

**Files:**
- Create: `lib/document-editor.ts`
- Test: `lib/document-editor.test.mjs`

**Interfaces:**
- Produces: `syncEditableContent(editor, content)`, `captureEditorSelection(editor, selection)`, `restoreEditorSelection(editor, range, selection)`, and `runEditorCommand(editor, command, value, range)`.

- [x] **Step 1: Write failing tests** for late editor hydration, selection containment, selection restoration before a command, and simple font-family command values.
- [x] **Step 2: Run `node --test lib/document-editor.test.mjs`** and verify failures are caused by the missing utility.
- [x] **Step 3: Implement the DOM utilities** with editor containment checks and `document.execCommand` isolated behind one function.
- [x] **Step 4: Run `node --test lib/document-editor.test.mjs`** and verify all editor utility tests pass.

### Task 2: Reliable template loading, formatting, and undo UI

**Files:**
- Modify: `components/fichas-workspace.tsx`

**Interfaces:**
- Consumes: the Task 1 editor utility functions.
- Produces: a stable callback ref that hydrates content even when the dialog portal mounts after the fetch; guarded request sequencing; preserved selection for toolbar controls; an Undo button.

- [x] **Step 1: Add a failing source-level regression test** asserting the workspace uses the stable hydration callback, selection-aware command helper, and undo action.
- [x] **Step 2: Run the targeted test** and verify it fails before the workspace changes.
- [x] **Step 3: Implement stable mount hydration and request sequencing**, clearing stale state on open/close and ignoring late responses.
- [x] **Step 4: Preserve the editor selection** on keyboard/mouse selection and before toolbar focus changes, then restore it for font, size, color, variables, and formatting commands.
- [x] **Step 5: Add the Undo button** using the browser content-editable undo history, syncing state and preview afterward.
- [x] **Step 6: Use valid single-family values** for `fontName` and add accessible labels/tooltips to icon-only editor controls touched by this change.
- [x] **Step 7: Run the targeted tests** and verify they pass.

### Task 3: Boundary validation and failure feedback

**Files:**
- Modify: `app/api/document-templates/route.ts`
- Modify: `components/fichas-workspace.tsx`
- Test: `lib/document-template-validation.test.mjs`
- Create: `lib/document-template-validation.ts`

**Interfaces:**
- Produces: strict template-kind parsing, a maximum template content size, and client-side image MIME/size validation.

- [x] **Step 1: Write failing tests** for rejecting unknown kinds, empty content, and oversized template payloads.
- [x] **Step 2: Run the targeted validation test** and verify the expected failures.
- [x] **Step 3: Implement shared validation** and return HTTP 400 for invalid input instead of silently treating it as a contract.
- [x] **Step 4: Reject non-image and oversized uploads before FileReader**, with a clear message in the editor.
- [x] **Step 5: Run all Node tests** and verify they pass.

### Task 4: Verification and focused audit

**Files:**
- Modify: `docs/superpowers/plans/2026-08-12-contract-template-editor-reliability.md`

**Interfaces:**
- Consumes: all earlier tasks.
- Produces: verified build/lint results and a prioritized residual-risk report.

- [x] **Step 1: Run `cmd /c npm run lint`** and document that the repository is missing its declared ESLint dependency.
- [x] **Step 2: Run `cmd /c npm run build`** and fix type/build regressions introduced by this work.
- [x] **Step 3: Review the focused editor flow** for loading, permissions, storage size, XSS exposure, network errors, stale requests, preview consistency, and browser compatibility.
- [x] **Step 4: Mark completed plan items** and report any residual risks that require a larger authentication or editor migration project.
