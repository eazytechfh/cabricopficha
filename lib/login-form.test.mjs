import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const workspaceSource = readFileSync(new URL("../components/fichas-workspace.tsx", import.meta.url), "utf8")

test("submits the login form with Enter", () => {
  assert.match(workspaceSource, /<form[^>]*onSubmit=\{\(event\) => \{[\s\S]*?handleLogin\(\)/)
  assert.match(workspaceSource, /<Button type="submit"[^>]*>[\s\S]*?Entrar/)
})
