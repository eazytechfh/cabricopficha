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

test("workspace resolves potential duplicate clients before definitive creation", async () => {
  const source = await readFile(new URL("./fichas-workspace.tsx", import.meta.url), "utf8")

  assert.match(source, /checkFichaDuplicates\(values\)/)
  assert.match(source, /Cadastrar como novo/)
  assert.match(source, /Unificar com este cadastro/)
  assert.match(source, /Excluir duplicado/)
  assert.match(source, /window\.confirm/)
  assert.match(source, /DuplicateResolution/)
})

test("workspace places template editing and preview side by side on wide screens", async () => {
  const source = await readFile(new URL("./fichas-workspace.tsx", import.meta.url), "utf8")

  assert.match(source, /h-\[calc\(100dvh-1rem\)\]/)
  assert.match(source, /w-\[calc\(100vw-1rem\)\]/)
  assert.match(source, /sm:max-w-none/)
  assert.match(source, /grid-cols-1[^\"]*xl:grid-cols-2/)
  assert.match(source, />Conteúdo do modelo</)
  assert.match(source, />Preview do documento</)
  assert.match(source, /h-\[60vh\][^\"]*overflow-y-auto/)
  assert.match(source, /xl:min-h-0[^\"]*xl:flex-1/)
})

test("workspace moves the template log from the footer into a header popover", async () => {
  const source = await readFile(new URL("./fichas-workspace.tsx", import.meta.url), "utf8")

  assert.match(source, /aria-label="Visualizar log do modelo"/)
  assert.match(source, /<PopoverContent[^>]*>[\s\S]*?<LogSummary log=\{latestTemplateLog\} \/>[\s\S]*?<\/PopoverContent>/)
  assert.doesNotMatch(source, /<\/div>\s*<LogSummary log=\{latestTemplateLog\} \/>/)
})

test("consulted ficha shows the contract date as the ficha date", async () => {
  const source = await readFile(new URL("./fichas-workspace.tsx", import.meta.url), "utf8")

  assert.doesNotMatch(source, /<p[^>]*>Data do contrato<\/p>[\s\S]*?<img src="\/logo\.png"[\s\S]*?<p[^>]*>Prazo<\/p>/i)
  assert.match(source, /Data da ficha:[\s\S]*formatDisplayDate\(selectedFicha\.dataContrato\)/)
  assert.match(source, /getFichaLabel\(selectedFichaNumbers\.get\(contrato\.id\)[\s\S]*formatDisplayDate\(contrato\.dataContrato\)/)
  assert.doesNotMatch(source, /ClienteValue label="Data do Contrato"/)
  assert.doesNotMatch(source, /<h3[^>]*>Data do Contrato<\/h3>/)
  assert.match(source, /value\.match\(\/\^\(\\d\{4\}\)-\(\\d\{2\}\)-\(\\d\{2\}\)\//)
  assert.match(source, /numbersAreReliable/)
  assert.match(source, /selectedFichaNumbers\.get\(contrato\.id\)/)
})

test("workspace uses one final save button and a compact add action while editing", async () => {
  const source = await readFile(new URL("./fichas-workspace.tsx", import.meta.url), "utf8")

  assert.doesNotMatch(source, /showInlineSubmit/)
  assert.match(source, /aria-label="Adicionar ficha"/)
  assert.doesNotMatch(source, /<Plus className="size-4" \/>\s*Adicionar/)
})

test("admins can select client groups and merge them into a chosen primary record", async () => {
  const source = await readFile(new URL("./fichas-workspace.tsx", import.meta.url), "utf8")

  assert.match(source, /Juntar selecionados/)
  assert.match(source, /Cadastro principal/)
  assert.match(source, /mergeFichaClients\(primaryFichaId, fichaIds, consultor\)/)
  assert.match(source, /Fichas, contratos, pagamentos e históricos serão preservados/)
})
