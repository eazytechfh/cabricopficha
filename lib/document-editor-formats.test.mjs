import assert from "node:assert/strict"
import test from "node:test"
import { DOCUMENT_EDITOR_FORMAT_COMMANDS } from "./document-editor-formats.ts"

test("offers Word-like paragraph formatting without document-specific restrictions", () => {
  assert.deepEqual(
    DOCUMENT_EDITOR_FORMAT_COMMANDS,
    [
      "justifyLeft",
      "justifyCenter",
      "justifyRight",
      "justifyFull",
      "insertUnorderedList",
      "insertOrderedList",
      "outdent",
      "indent",
      "undo",
      "redo",
      "removeFormat",
    ]
  )
})
