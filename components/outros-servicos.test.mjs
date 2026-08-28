import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("outros servicos possui bloco independente e OUTROS sai de processos", async () => {
  const [form, options, types] = await Promise.all([
    readFile(new URL("./ficha-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/ficha-options.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/ficha-types.ts", import.meta.url), "utf8"),
  ])

  assert.doesNotMatch(options, /TIPO_PROCESSO_OPTIONS[^\n]*OUTROS/)
  assert.match(form, /Outros Serviços/)
  assert.match(form, /id="tipoOutroServico"/)
  assert.match(form, /id="poderesOutroServico"/)
  assert.match(types, /tipoOutroServico: string/)
  assert.match(types, /poderesOutroServico: string/)
})

test("workspace oferece modelos e downloads especificos", async () => {
  const workspace = await readFile(new URL("./fichas-workspace.tsx", import.meta.url), "utf8")

  assert.match(workspace, /handleOpenTemplateEditor\("other-services-contract"\)/)
  assert.match(workspace, /handleOpenTemplateEditor\("other-services-procuration"\)/)
  assert.match(workspace, /handleDownloadDocument\("other-services-contract"\)/)
  assert.match(workspace, /handleDownloadDocument\("other-services-procuration"\)/)
  assert.match(workspace, /\{\{tipoOutroServico\}\}/)
  assert.match(workspace, /\{\{poderesOutroServico\}\}/)
})
