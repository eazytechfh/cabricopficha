import { NextResponse } from "next/server"
import { assertAdminAccess, createAccessCode, getAccessCodes } from "@/lib/server-access"
import type { AccessCodeRecord, ConsultorSession } from "@/lib/ficha-types"

function normalizeAccessLevel(value: AccessCodeRecord["nivelAcesso"] | undefined): AccessCodeRecord["nivelAcesso"] {
  if (value === "admin" || value === "andamento") return value
  return "consultor"
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      action?: "list" | "create"
      consultor?: ConsultorSession
      input?: {
        nomeResponsavel?: string
        email?: string
        telefone?: string
        nivelAcesso?: AccessCodeRecord["nivelAcesso"]
        password?: string
        appOrigin?: string
      }
    }

    await assertAdminAccess(payload.consultor)

    if (payload.action === "list") {
      const users = await getAccessCodes()
      return NextResponse.json({ users })
    }

    if (payload.action === "create") {
      const nomeResponsavel = String(payload.input?.nomeResponsavel || "").trim()
      const email = String(payload.input?.email || "").trim().toLowerCase()
      const telefone = String(payload.input?.telefone || "").trim()
      const appOrigin = String(payload.input?.appOrigin || "").trim()
      const nivelAcesso = normalizeAccessLevel(payload.input?.nivelAcesso)
      const password = String(payload.input?.password || "")

      if (!nomeResponsavel || !email || !telefone || !password) {
        return NextResponse.json(
          { error: "Nome do responsavel, e-mail, telefone e senha sao obrigatorios." },
          { status: 400 }
        )
      }

      const user = await createAccessCode({
        nomeResponsavel,
        email,
        telefone,
        nivelAcesso,
        password,
        appOrigin,
      })

      return NextResponse.json({ user }, { status: 201 })
    }

    return NextResponse.json({ error: "Acao invalida." }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao processar usuarios."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
