import { NextResponse } from "next/server"
import { getFichaById, updateFicha, updateFichaInExcel } from "@/lib/server-fichas"
import { canEditFicha } from "@/lib/ficha-utils"
import { buildFichaUpdateWebhookPayload, sendFichaUpdateWebhook } from "@/lib/webhookService"
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
      return NextResponse.json({ error: "Voce nao tem permissao para editar esta ficha." }, { status: 403 })
    }

    const ficha = await updateFicha(id, data, consultor)
    const excelSaved = await updateFichaInExcel(ficha)

    try {
      const payload = buildFichaUpdateWebhookPayload(ficha, consultor)
      await sendFichaUpdateWebhook(payload)

      return NextResponse.json({
        ficha,
        excelSaved,
        webhookSent: true,
      })
    } catch (error) {
      const webhookError = error instanceof Error ? error.message : "Erro ao enviar os dados para a automacao."

      return NextResponse.json({
        ficha,
        excelSaved,
        webhookSent: false,
        webhookError,
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar ficha."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
