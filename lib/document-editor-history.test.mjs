import assert from "node:assert/strict"
import test from "node:test"

import { resolveCustomEditorHistory } from "./document-editor-history.ts"

const entry = { before: '<p>Texto</p>', after: '<p style="text-align: justify">Texto</p>' }

test("undo restores the content before justification", () => {
  assert.deepEqual(resolveCustomEditorHistory(entry.after, entry, "undo"), { content: entry.before, applied: true })
})

test("redo restores the justified content", () => {
  assert.deepEqual(resolveCustomEditorHistory(entry.before, entry, "redo"), { content: entry.after, applied: true })
})

test("leaves native history in control when content changed afterwards", () => {
  assert.deepEqual(resolveCustomEditorHistory(`${entry.after}x`, entry, "undo"), { content: `${entry.after}x`, applied: false })
})
