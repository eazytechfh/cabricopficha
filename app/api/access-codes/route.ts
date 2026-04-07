import { NextResponse } from "next/server"
import { assertAdminAccess, createAccessCode, getAccessCodes } from "@/lib/server-access"
import type { AccessCodeRecord, ConsultorSession } from "@/lib/ficha-types"

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      action?: "list" | "create"
      consultor?: ConsultorSession
      input?: {
        nomeResponsavel?: string
        codigoAcesso?: string
        nivelAcesso?: AccessCodeRecord["nivelAcesso"]
      }
    }

    await assertAdminAccess(payload.consultor)

    if (payload.action === "list") {
      const users = await getAccessCodes()
      return NextResponse.json({ users })
    }

    if (payload.action === "create") {
      const nomeResponsavel = String(payload.input?.nomeResponsavel || "").trim()
      const codigoAcesso = String(payload.input?.codigoAcesso || "").trim()
      const nivelAcesso = payload.input?.nivelAcesso === "admin" ? "admin" : "consultor"

      if (!nomeResponsavel || !codigoAcesso) {
        return NextResponse.json(
          { error: "Nome do responsavel e codigo de acesso sao obrigatorios." },
          { status: 400 }
        )
      }

      const user = await createAccessCode({
        nomeResponsavel,
        codigoAcesso,
        nivelAcesso,
      })

      return NextResponse.json({ user }, { status: 201 })
    }

    return NextResponse.json({ error: "Acao invalida." }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao processar usuarios."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
