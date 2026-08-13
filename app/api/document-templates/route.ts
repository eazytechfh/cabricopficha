import { NextResponse } from "next/server"
import { assertAdminAccess } from "@/lib/server-access"
import { getServerDocumentTemplate, updateServerDocumentTemplate } from "@/lib/server-document-templates"
import type { ConsultorSession } from "@/lib/ficha-types"
import type { DocumentTemplateKind } from "@/lib/document-templates"
import { parseDocumentTemplateKind, validateDocumentTemplateContent } from "@/lib/document-template-validation"

export async function POST(request: Request) {
  try {
    let rawPayload: unknown
    try {
      rawPayload = await request.json()
    } catch {
      return NextResponse.json({ error: "Corpo da requisicao invalido." }, { status: 400 })
    }

    if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
      return NextResponse.json({ error: "Corpo da requisicao invalido." }, { status: 400 })
    }

    const payload = rawPayload as {
      action?: "get" | "update"
      kind?: DocumentTemplateKind
      content?: string
      consultor?: ConsultorSession
    }
    const kind = parseDocumentTemplateKind(payload.kind)

    if (!kind) {
      return NextResponse.json({ error: "Tipo de modelo invalido." }, { status: 400 })
    }

    if (payload.action === "get") {
      const template = await getServerDocumentTemplate(kind)
      return NextResponse.json({ template })
    }

    if (payload.action === "update") {
      await assertAdminAccess(payload.consultor)
      let content: string
      try {
        content = validateDocumentTemplateContent(payload.content)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Conteudo do modelo invalido."
        return NextResponse.json({ error: message }, { status: 400 })
      }

      const template = await updateServerDocumentTemplate(kind, content, payload.consultor as ConsultorSession)
      return NextResponse.json({ template })
    }

    return NextResponse.json({ error: "Acao invalida." }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao processar modelo."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
