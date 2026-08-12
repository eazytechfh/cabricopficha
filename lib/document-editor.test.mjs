import assert from "node:assert/strict"
import test from "node:test"

import {
  captureEditorSelection,
  runEditorCommand,
  syncEditableContent,
} from "./document-editor.ts"

test("hydrates an editable element that mounts after content was loaded", () => {
  const editor = { innerHTML: "" }

  const changed = syncEditableContent(editor, "<p>Contrato carregado</p>")

  assert.equal(changed, true)
  assert.equal(editor.innerHTML, "<p>Contrato carregado</p>")
})

test("captures only selections that belong to the editor", () => {
  const insideNode = {}
  const outsideNode = {}
  const clonedRange = { id: "clone" }
  const editor = { contains: (node) => node === insideNode }
  const insideRange = { commonAncestorContainer: insideNode, cloneRange: () => clonedRange }
  const outsideRange = { commonAncestorContainer: outsideNode, cloneRange: () => ({ id: "outside" }) }

  assert.equal(captureEditorSelection(editor, { rangeCount: 1, getRangeAt: () => insideRange }), clonedRange)
  assert.equal(captureEditorSelection(editor, { rangeCount: 1, getRangeAt: () => outsideRange }), null)
})

test("restores the saved selection before running a formatting command", () => {
  const calls = []
  const range = { commonAncestorContainer: {}, cloneRange: () => range }
  const selection = {
    rangeCount: 1,
    getRangeAt: () => range,
    removeAllRanges: () => calls.push("remove"),
    addRange: (received) => calls.push(received === range ? "add" : "wrong-range"),
  }
  const editor = {
    innerHTML: "<p>Texto</p>",
    contains: () => true,
    focus: () => calls.push("focus"),
    ownerDocument: {
      defaultView: { getSelection: () => selection },
      execCommand: (command, _showUi, value) => {
        calls.push(`${command}:${value}`)
        return true
      },
    },
  }

  const result = runEditorCommand(editor, "fontName", "Times New Roman", range)

  assert.equal(result.executed, true)
  assert.equal(result.content, "<p>Texto</p>")
  assert.deepEqual(calls, ["focus", "remove", "add", "fontName:Times New Roman"])
})
