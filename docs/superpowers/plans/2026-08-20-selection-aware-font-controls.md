# Selection-Aware Font Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the font family and numeric font size at the editor caret/selection and allow both values to be typed directly.

**Architecture:** Keep browser-selection and rich-text command details in `lib/document-editor.ts`. The workspace reads formatting whenever selection is captured, renders text/number inputs backed by datalists, and applies arbitrary pixel sizes through a controlled legacy-command marker that is immediately converted to inline CSS.

**Tech Stack:** React 19, TypeScript, contentEditable/Selection APIs, Node test runner.

## Global Constraints

- Clicking or selecting text in the document editor must refresh both font controls.
- Font family and font size must accept typed values.
- Existing quick font and size choices must remain available as suggestions.
- Arbitrary sizes must persist in the template HTML as pixel values.
- Existing selection restoration and document editing behavior must remain intact.

---

### Task 1: Selection formatting helpers

**Files:**
- Modify: `lib/document-editor.ts`
- Modify: `lib/document-editor.test.mjs`

**Interfaces:**
- Produces: `getEditorSelectionFormatting(editor, selection): { fontFamily: string; fontSize: string } | null`.
- Produces: `runEditorFontSizeCommand(editor, fontSize, savedRange)` with the same result shape as `runEditorCommand`.

- [x] **Step 1: Write failing helper tests**

```js
assert.deepEqual(getEditorSelectionFormatting(editor, selection), {
  fontFamily: "Times New Roman",
  fontSize: "18",
})
assert.equal(runEditorFontSizeCommand(editor, "22", range).content, '<font style="font-size: 22px;">Texto</font>')
```

- [x] **Step 2: Run tests and verify failure**

Run: `node --experimental-strip-types --test lib/document-editor.test.mjs`
Expected: FAIL because the formatting helpers do not exist.

- [x] **Step 3: Implement selection inspection and arbitrary size application**

```ts
export function getEditorSelectionFormatting(editor: HTMLElement, selection: Selection | null) {
  const range = captureEditorSelection(editor, selection)
  if (!range) return null
  const node = selection?.focusNode ?? range.commonAncestorContainer
  const element = node === editor ? editor : node.nodeType === 1 ? node as HTMLElement : node.parentElement
  if (!element) return null
  const style = editor.ownerDocument.defaultView?.getComputedStyle(element)
  if (!style) return null
  return {
    fontFamily: style.fontFamily.split(",")[0].trim().replace(/^['"]|['"]$/g, ""),
    fontSize: String(Number.parseFloat(style.fontSize)),
  }
}
```

Apply the requested size with `execCommand("fontSize", false, "7")`, replace the generated marker's `size` attribute with `style.fontSize = "<value>px"`, then return updated HTML and selection.

- [x] **Step 4: Run helper tests**

Run: `node --experimental-strip-types --test lib/document-editor.test.mjs`
Expected: PASS.

### Task 2: Editable synchronized toolbar controls

**Files:**
- Modify: `components/fichas-workspace.tsx`
- Modify: `components/fichas-workspace.test.mjs`

**Interfaces:**
- Consumes: `getEditorSelectionFormatting` and `runEditorFontSizeCommand` from Task 1.
- Produces: `input[list="document-template-font-options"]` and numeric font-size input synchronized with the active selection.

- [x] **Step 1: Write failing workspace integration tests**

```js
assert.match(source, /getEditorSelectionFormatting\(editor, selection\)/)
assert.match(source, /list="document-template-font-options"/)
assert.match(source, /type="number"/)
assert.match(source, /runEditorFontSizeCommand/)
```

- [x] **Step 2: Run test and verify failure**

Run: `node --experimental-strip-types --test components/fichas-workspace.test.mjs`
Expected: FAIL because the toolbar still uses non-editable Select controls.

- [x] **Step 3: Implement synchronized editable inputs**

Use `Input` with datalists for font family and size, apply values on Enter or blur, initialize the displayed size as `14`, and update both state values inside `captureTemplateSelection` whenever the caret or selection belongs to the editor.

- [x] **Step 4: Run full verification**

Run: `node --experimental-strip-types --test lib/*.test.mjs components/*.test.mjs`
Expected: all tests PASS.

Run: `npm run build`
Expected: Next.js production build completes successfully.
