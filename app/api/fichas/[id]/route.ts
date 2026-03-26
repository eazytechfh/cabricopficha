import { NextResponse } from "next/server"
import { getFichaById, updateFicha, updateFichaInExcel } from "@/lib/server-fichas"
import { canEditFicha } from "@/lib/ficha-utils"
import type { ConsultorSession, FichaFormValues } from "@/lib/ficha-types"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const ficha = await getFichaById(id)
    return NextResponse.json({ ficha })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao buscar ficha."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const { data, consultor } = (await request.json()) as {
      data: FichaFormValues
      consultor: ConsultorSession
    }

    const current = await getFichaById(id)
    const allowed = canEditFicha(consultor.id, consultor.nivelAcesso, current)

    if (!allowed) {
      return NextResponse.json({ error: "Você não tem permissão para editar esta ficha." }, { status: 403 })
    }

    const ficha = await updateFicha(id, data, consultor)
    const excelSaved = await updateFichaInExcel(ficha)

    return NextResponse.json({ ficha, excelSaved })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar ficha."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
