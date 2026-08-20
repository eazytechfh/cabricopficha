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
  assert.match(source, /prepareDocumentTemplateContent\(kind, DEFAULT_DOCUMENT_TEMPLATES\[kind\]\)/)
  assert.match(source, /templateEditorKind === "procuration" \? \(/)
  assert.match(source, /templateSaving \? "Salvando\.\.\." : "Salvar modelo"/)
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

test("workspace keeps document headings inside editable content and hides the fixed PDF title", async () => {
  const workspace = await readFile(new URL("./fichas-workspace.tsx", import.meta.url), "utf8")
  const pdf = await readFile(new URL("./DocumentTemplatePdf.tsx", import.meta.url), "utf8")
  const pdfClient = await readFile(new URL("../lib/document-pdf-client.tsx", import.meta.url), "utf8")

  assert.match(workspace, /prepareDocumentTemplateContent\(kind, DEFAULT_DOCUMENT_TEMPLATES\[kind\]\)/)
  assert.match(workspace, /prepareDocumentTemplateContent\(kind, template\.content\)/)
  assert.match(workspace, /renderTitle=\{false\}/)
  assert.match(pdf, /renderTitle\?: boolean/)
  assert.match(pdf, /renderTitle \? \(/)
  assert.match(pdfClient, /renderTitle=\{false\}/)
})

test("workspace exposes editable font controls synchronized with the editor selection", async () => {
  const source = await readFile(new URL("./fichas-workspace.tsx", import.meta.url), "utf8")

  assert.match(source, /getEditorSelectionFormatting\(editor, selection\)/)
  assert.match(source, /runEditorFontSizeCommand/)
  assert.match(source, /aria-label="Fonte atual"/)
  assert.match(source, /aria-label="Tamanho atual da fonte"/)
  assert.match(source, /type="number"/)
  assert.match(source, /aria-label="Abrir lista de fontes"/)
  assert.match(source, /aria-label="Abrir lista de tamanhos"/)
  assert.match(source, /DropdownMenuRadioGroup value=\{templateFontFamily\}/)
  assert.match(source, /DropdownMenuRadioGroup value=\{templateFontSize\}/)
  assert.doesNotMatch(source, /<datalist/)
})
