import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("workspace integrates stable hydration, selection-aware commands, and undo", async () => {
  const source = await readFile(new URL("./fichas-workspace.tsx", import.meta.url), "utf8")

  assert.match(source, /ref=\{handleTemplateEditorRef\}/)
  assert.match(source, /captureTemplateSelection/)
  assert.match(source, /runTemplateCommand\("undo"\)/)
  assert.match(source, /Undo2/)
  assert.match(source, /saveRequestId === templateLoadRequestRef\.current/)
  assert.match(source, /imageRequestId !== templateLoadRequestRef\.current/)
  assert.match(source, /templateEditorRef\.current !== editor/)
})

test("workspace exposes list commands in a rich-text surface", async () => {
  const source = await readFile(new URL("./fichas-workspace.tsx", import.meta.url), "utf8")
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8")

  assert.match(source, /handleTemplateCommand\("insertUnorderedList"\)/)
  assert.match(source, /handleTemplateCommand\("insertOrderedList"\)/)
  assert.match(source, /className="document-rich-text h-\[60vh\]/)
  assert.match(styles, /\.document-rich-text :where\(ul\)/)
  assert.match(styles, /list-style-type: disc/)
  assert.match(styles, /list-style-type: decimal/)
})
