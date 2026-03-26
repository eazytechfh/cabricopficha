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

    console.log("Iniciando atualizacao da ficha", { id, consultorId: consultor.id })

    const current = await getFichaById(id)
    const allowed = canEditFicha(consultor.id, consultor.nivelAcesso, current)

    if (!allowed) {
      return NextResponse.json({ error: "Voce nao tem permissao para editar esta ficha." }, { status: 403 })
    }

    const ficha = await updateFicha(id, data, consultor)

    let excelSaved = true
    let excelError: string | undefined

    try {
      excelSaved = await updateFichaInExcel(ficha)
    } catch (error) {
      excelSaved = false
      excelError = error instanceof Error ? error.message : "Erro ao atualizar a planilha."
      console.error("Erro ao atualizar ficha no Excel:", error)
    }

    console.log("Ficha atualizada no Supabase com sucesso", {
      id: ficha.id,
      updatedAt: ficha.updatedAt,
      excelSaved,
      excelError,
    })

    return NextResponse.json({
      ficha,
      excelSaved,
      excelError,
    })
  } catch (error) {
    console.error("Erro ao atualizar ficha:", error)
    const message = error instanceof Error ? error.message : "Erro ao atualizar ficha."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
