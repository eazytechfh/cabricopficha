import { NextResponse } from "next/server"
import { createFicha, getFichasByCpf, saveFichaToExcel } from "@/lib/server-fichas"
import type { ConsultorSession, FichaFormValues } from "@/lib/ficha-types"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cpf = searchParams.get("cpf") || ""

    if (!cpf) {
      return NextResponse.json({ fichas: [] })
    }

    const fichas = await getFichasByCpf(cpf)
    return NextResponse.json({ fichas })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao consultar fichas."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { data, consultor } = (await request.json()) as {
      data: FichaFormValues
      consultor: ConsultorSession
    }

    const ficha = await createFicha(data, consultor)
    const excelSaved = await saveFichaToExcel(ficha)

    return NextResponse.json({ ficha, excelSaved })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar ficha."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
