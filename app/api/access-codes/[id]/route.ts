import { NextResponse } from "next/server"
import { assertAdminAccess, deleteAccessCode } from "@/lib/server-access"
import type { ConsultorSession } from "@/lib/ficha-types"

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
