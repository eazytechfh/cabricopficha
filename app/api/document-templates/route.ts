import { NextResponse } from "next/server"
import { assertAdminAccess } from "@/lib/server-access"
import { getServerDocumentTemplate, updateServerDocumentTemplate } from "@/lib/server-document-templates"
import type { ConsultorSession } from "@/lib/ficha-types"
import type { DocumentTemplateKind } from "@/lib/document-templates"

function parseKind(value: unknown): DocumentTemplateKind {
  return value === "procuration" ? "procuration" : "contract"
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      action?: "get" | "update"
      kind?: DocumentTemplateKind
      content?: string
      consultor?: ConsultorSession
    }
    const kind = parseKind(payload.kind)

    if (payload.action === "get") {
      const template = await getServerDocumentTemplate(kind)
      return NextResponse.json({ template })
    }

    if (payload.action === "update") {
      await assertAdminAccess(payload.consultor)
      const content = String(payload.content || "").trim()

      if (!content) {
        return NextResponse.json({ error: "O modelo nao pode ficar vazio." }, { status: 400 })
      }

      const template = await updateServerDocumentTemplate(kind, content)
      return NextResponse.json({ template })
    }

    return NextResponse.json({ error: "Acao invalida." }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao processar modelo."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
