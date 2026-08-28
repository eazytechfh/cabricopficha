import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("keeps client data on the left and third-party data on the right", async () => {
  const form = await readFile(new URL("./ficha-form.tsx", import.meta.url), "utf8")
  const workspace = await readFile(new URL("./fichas-workspace.tsx", import.meta.url), "utf8")
  const pdf = await readFile(new URL("./FichaPdf.tsx", import.meta.url), "utf8")

  assert.match(form, /renderInput\("nomeCliente"[\s\S]*renderInput\("terceiros"[\s\S]*telefonesInput[\s\S]*renderInput\("telefoneTerceiros"[\s\S]*renderInput\("email"[\s\S]*renderInput\("emailTerceiros"/)
  assert.match(workspace, /Nome Completo[\s\S]*Nome Terceiros[\s\S]*Telefone\(s\)[\s\S]*Telefone Terceiros[\s\S]*E-mail"[\s\S]*E-mail Terceiros/)
  assert.match(pdf, /Nome Completo[\s\S]*Nome Terceiros[\s\S]*field\("Telefone", data\.telefones\)[\s\S]*Telefone Terceiros[\s\S]*field\("E-mail", data\.email\)[\s\S]*E-mail Terceiros/)
})
