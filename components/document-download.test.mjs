import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("contrato usa modelo padrao como fallback e informa o andamento", async () => {
  const [workspace, pdfClient] = await Promise.all([
    readFile(new URL("./fichas-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/document-pdf-client.tsx", import.meta.url), "utf8"),
  ])

  assert.match(pdfClient, /getDocumentTemplate\(kind\)\.catch/)
  assert.match(pdfClient, /DEFAULT_DOCUMENT_TEMPLATES/)
  assert.match(workspace, /Gerando contrato\.\.\./)
  assert.match(workspace, /role="alert"/)
})
