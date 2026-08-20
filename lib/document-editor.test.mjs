import assert from "node:assert/strict"
import test from "node:test"

import {
  captureEditorSelection,
  getEditorSelectionFormatting,
  runEditorCommand,
  runEditorFontSizeCommand,
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

test("reads the computed font family and size at the current editor selection", () => {
  const selectedElement = { nodeType: 1 }
  const range = { commonAncestorContainer: selectedElement, cloneRange: () => range }
  const selection = { rangeCount: 1, getRangeAt: () => range, focusNode: selectedElement }
  const editor = {
    contains: (node) => node === selectedElement,
    ownerDocument: {
      defaultView: {
        getComputedStyle: () => ({ fontFamily: '"Times New Roman", serif', fontSize: "18px" }),
      },
    },
  }

  assert.deepEqual(getEditorSelectionFormatting(editor, selection), {
    fontFamily: "Times New Roman",
    fontSize: "18",
  })
})

test("applies a typed pixel font size to the saved editor selection", () => {
  const calls = []
  const range = { commonAncestorContainer: {}, cloneRange: () => range }
  const selection = {
    rangeCount: 1,
    getRangeAt: () => range,
    removeAllRanges: () => calls.push("remove"),
    addRange: () => calls.push("add"),
  }
  const editor = {
    innerHTML: "<p>Texto</p>",
    contains: () => true,
    focus: () => calls.push("focus"),
    querySelectorAll: () => [
      {
        style: {},
        removeAttribute: () => {
          editor.innerHTML = '<font style="font-size: 22px;">Texto</font>'
        },
      },
    ],
    ownerDocument: {
      defaultView: { getSelection: () => selection },
      execCommand: (command, _showUi, value) => {
        calls.push(`${command}:${value}`)
        return true
      },
    },
  }

  const result = runEditorFontSizeCommand(editor, "22", range)

  assert.equal(result.executed, true)
  assert.equal(result.content, '<font style="font-size: 22px;">Texto</font>')
  assert.deepEqual(calls, ["focus", "remove", "add", "styleWithCSS:false", "fontSize:7"])
})

test("limits a typed font size to 48 pixels", () => {
  const range = { commonAncestorContainer: {}, cloneRange: () => range }
  const selection = {
    rangeCount: 1,
    getRangeAt: () => range,
    removeAllRanges: () => {},
    addRange: () => {},
  }
  const appliedStyles = []
  const editor = {
    innerHTML: "<p>Texto</p>",
    contains: () => true,
    focus: () => {},
    querySelectorAll: () => [
      {
        style: {
          set fontSize(value) {
            appliedStyles.push(value)
          },
        },
        removeAttribute: () => {},
      },
    ],
    ownerDocument: {
      defaultView: { getSelection: () => selection },
      execCommand: () => true,
    },
  }

  const result = runEditorFontSizeCommand(editor, "96", range)

  assert.equal(result.fontSize, "48")
  assert.deepEqual(appliedStyles, ["48px"])
})
