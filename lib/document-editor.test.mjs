import assert from "node:assert/strict"
import test from "node:test"

import {
  captureEditorSelection,
  getEditorSelectionFormatting,
  runEditorCommand,
  runEditorAlignmentCommand,
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

test("justifies selected paragraphs without changing their font formatting", () => {
  const paragraph = { style: { fontFamily: "Georgia", fontSize: "18px", textAlign: "" } }
  const range = { commonAncestorContainer: paragraph, cloneRange: () => range, intersectsNode: (node) => node === paragraph }
  const selection = { rangeCount: 1, getRangeAt: () => range, removeAllRanges: () => {}, addRange: () => {} }
  let execCommands = 0
  const editor = {
    innerHTML: '<p style="font-family: Georgia; font-size: 18px;">Texto</p>',
    contains: () => true,
    focus: () => {},
    querySelectorAll: () => [paragraph],
    ownerDocument: {
      defaultView: { getSelection: () => selection },
      execCommand: () => { execCommands += 1; return true },
    },
  }

  runEditorAlignmentCommand(editor, "justifyFull", range)

  assert.equal(paragraph.style.textAlign, "justify")
  assert.equal(paragraph.style.fontFamily, "Georgia")
  assert.equal(paragraph.style.fontSize, "18px")
  assert.equal(execCommands, 0)
})

test("aligns only the paragraph containing a collapsed caret", () => {
  const firstParagraph = {
    nodeType: 1,
    style: { textAlign: "" },
    matches: () => true,
    parentElement: null,
  }
  const secondParagraph = {
    nodeType: 1,
    style: { textAlign: "" },
    matches: () => true,
    parentElement: null,
  }
  const range = {
    collapsed: true,
    startContainer: secondParagraph,
    startOffset: 0,
    commonAncestorContainer: secondParagraph,
    cloneRange: () => range,
  }
  const selection = { rangeCount: 1, getRangeAt: () => range, removeAllRanges: () => {}, addRange: () => {} }
  const editor = {
    innerHTML: "<p>Primeiro</p><p>Segundo</p>",
    childNodes: [firstParagraph, secondParagraph],
    contains: () => true,
    focus: () => {},
    querySelectorAll: () => [firstParagraph, secondParagraph],
    ownerDocument: { defaultView: { getSelection: () => selection } },
  }
  firstParagraph.parentElement = editor
  secondParagraph.parentElement = editor

  const result = runEditorAlignmentCommand(editor, "justifyCenter", range)

  assert.equal(result.executed, true)
  assert.equal(firstParagraph.style.textAlign, "")
  assert.equal(secondParagraph.style.textAlign, "center")
})

test("does not align a parent block that contains the selected paragraph", () => {
  const paragraph = { style: { textAlign: "" }, contains: () => false }
  const wrapper = { style: { textAlign: "" }, contains: (node) => node === paragraph }
  const range = {
    collapsed: false,
    commonAncestorContainer: paragraph,
    cloneRange: () => range,
    intersectsNode: () => true,
  }
  const selection = { rangeCount: 1, getRangeAt: () => range, removeAllRanges: () => {}, addRange: () => {} }
  const editor = {
    innerHTML: "<div><p>Texto</p></div>",
    contains: () => true,
    focus: () => {},
    querySelectorAll: () => [wrapper, paragraph],
    ownerDocument: { defaultView: { getSelection: () => selection } },
  }

  runEditorAlignmentCommand(editor, "justifyCenter", range)

  assert.equal(wrapper.style.textAlign, "")
  assert.equal(paragraph.style.textAlign, "center")
})

test("wraps selected legacy text with line breaks in a justified block", () => {
  const fragment = { preservedMarkup: '<span style="font-family: Georgia; font-size: 18px;">Texto<br>segunda linha</span>' }
  const wrapper = { style: {}, appendChild: (received) => { wrapper.content = received } }
  const range = {
    commonAncestorContainer: {},
    cloneRange: () => range,
    extractContents: () => fragment,
    insertNode: (received) => { range.inserted = received },
    selectNodeContents: () => {},
    intersectsNode: () => false,
  }
  const selection = { rangeCount: 1, getRangeAt: () => range, removeAllRanges: () => {}, addRange: () => {} }
  const editor = {
    innerHTML: 'Texto<br>segunda linha',
    contains: () => true,
    focus: () => {},
    querySelectorAll: () => [],
    ownerDocument: {
      createElement: () => wrapper,
      defaultView: { getSelection: () => selection },
    },
  }

  const result = runEditorAlignmentCommand(editor, "justifyFull", range)

  assert.equal(result.executed, true)
  assert.equal(wrapper.style.textAlign, "justify")
  assert.equal(wrapper.content, fragment)
  assert.equal(range.inserted, wrapper)
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
