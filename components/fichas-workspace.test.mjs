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
