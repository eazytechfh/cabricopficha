import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const workspaceSource = readFileSync(new URL("../components/fichas-workspace.tsx", import.meta.url), "utf8")

test("submits the ficha search with Enter", () => {
  const marker = workspaceSource.indexOf('data-ficha-search="true"')
  const searchForm = workspaceSource.slice(workspaceSource.lastIndexOf("<form", marker), workspaceSource.indexOf("</form>", marker))
  assert.match(searchForm, /onSubmit=\{\(event\) => \{/)
  assert.match(searchForm, /handleConsultarFichas\(\)/)
  assert.match(searchForm, /<Button type="submit"/)
  assert.match(searchForm, /Consultar/)
})
