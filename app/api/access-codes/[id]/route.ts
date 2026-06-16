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
        codigoAcesso?: string
        nivelAcesso?: AccessCodeRecord["nivelAcesso"]
        ativo?: boolean
      }
    }

    const currentAdmin = await assertAdminAccess(payload.consultor)
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: "Usuario nao informado." }, { status: 400 })
    }

    const nomeResponsavel = String(payload.input?.nomeResponsavel || "").trim()
    const codigoAcesso = String(payload.input?.codigoAcesso || "").trim()
    const nivelAcesso = normalizeAccessLevel(payload.input?.nivelAcesso)
    const ativo = Boolean(payload.input?.ativo ?? true)

    if (!nomeResponsavel || !codigoAcesso) {
      return NextResponse.json(
        { error: "Nome do responsavel e codigo de acesso sao obrigatorios." },
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
      codigoAcesso,
      nivelAcesso,
      ativo,
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
