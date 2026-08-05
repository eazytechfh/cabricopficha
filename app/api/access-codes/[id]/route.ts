import { NextResponse } from "next/server"
import { assertAdminAccess, deleteAccessCode, updateAccessCode } from "@/lib/server-access"
import type { AccessCodeRecord, ConsultorSession } from "@/lib/ficha-types"

function normalizeAccessLevel(value: AccessCodeRecord["nivelAcesso"] | undefined): AccessCodeRecord["nivelAcesso"] {
  if (value === "admin" || value === "andamento") return value
  return "consultor"
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const payload = (await request.json()) as {
      consultor?: ConsultorSession
      input?: {
        nomeResponsavel?: string
        email?: string
        telefone?: string
        nivelAcesso?: AccessCodeRecord["nivelAcesso"]
        ativo?: boolean
        password?: string
      }
    }

    const currentAdmin = await assertAdminAccess(payload.consultor)
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: "Usuario nao informado." }, { status: 400 })
    }

    const nomeResponsavel = String(payload.input?.nomeResponsavel || "").trim()
    const email = String(payload.input?.email || "").trim().toLowerCase()
    const telefone = String(payload.input?.telefone || "").trim()
    const nivelAcesso = normalizeAccessLevel(payload.input?.nivelAcesso)
    const ativo = Boolean(payload.input?.ativo ?? true)
    const password = String(payload.input?.password || "")

    if (!nomeResponsavel || !email || !telefone) {
      return NextResponse.json(
        { error: "Nome do responsavel, e-mail e telefone sao obrigatorios." },
        { status: 400 }
      )
    }

    if (currentAdmin.id === id && !ativo) {
      return NextResponse.json(
        { error: "Voce nao pode desativar o proprio usuario." },
        { status: 400 }
      )
    }

    const user = await updateAccessCode(id, {
      nomeResponsavel,
      email,
      telefone,
      nivelAcesso,
      ativo,
      password: password || undefined,
    })

    return NextResponse.json({ user })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar usuario."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { consultor } = (await request.json()) as { consultor?: ConsultorSession }
    await assertAdminAccess(consultor)

    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: "Usuario nao informado." }, { status: 400 })
    }

    await deleteAccessCode(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover usuario."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
