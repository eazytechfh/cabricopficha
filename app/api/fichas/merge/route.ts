import { NextResponse } from "next/server"
import { mergeFichaClients } from "@/lib/server-fichas"
import type { ConsultorSession } from "@/lib/ficha-types"

export async function POST(request: Request) {
  try {
    const { primaryFichaId, fichaIds, consultor } = (await request.json()) as {
      primaryFichaId: string
      fichaIds: string[]
      consultor: ConsultorSession
    }

    if (consultor?.nivelAcesso !== "admin") {
      return NextResponse.json({ error: "Apenas administradores podem juntar cadastros." }, { status: 403 })
    }
    const uniqueIds = [...new Set((fichaIds || []).filter(Boolean))]
    if (!primaryFichaId || uniqueIds.length < 2 || !uniqueIds.includes(primaryFichaId)) {
      return NextResponse.json({ error: "Selecione ao menos dois cadastros e defina o principal." }, { status: 400 })
    }

    const mergedCount = await mergeFichaClients(primaryFichaId, uniqueIds, consultor)
    return NextResponse.json({ ok: true, mergedCount })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao juntar cadastros." }, { status: 500 })
  }
}
