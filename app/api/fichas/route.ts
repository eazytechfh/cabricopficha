import { NextResponse } from "next/server"
import { createFicha, findPotentialDuplicateFichas, getFichaById, getFichasByFilters, saveFichaToExcel } from "@/lib/server-fichas"
import { mergeClientIdentity } from "@/lib/ficha-duplicates"
import type { ConsultorSession, DuplicateResolution, FichaFormValues } from "@/lib/ficha-types"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const cpf = searchParams.get("cpf") || ""
    const nome = searchParams.get("nome") || ""

    if (!cpf && !nome) {
      return NextResponse.json({ fichas: [] })
    }

    const fichas = await getFichasByFilters({ cpf, nome })
    return NextResponse.json({ fichas })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao consultar fichas."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { data, consultor, resolution } = (await request.json()) as {
      data: FichaFormValues
      consultor: ConsultorSession
      resolution?: DuplicateResolution
    }

    const matches = await findPotentialDuplicateFichas(data)
    if (resolution && resolution.action !== "create_new" && resolution.action !== "merge") {
      return NextResponse.json({ error: "Resolução de duplicidade inválida." }, { status: 400 })
    }
    if (matches.length > 0 && !resolution) {
      return NextResponse.json({ code: "POTENTIAL_DUPLICATE", matches, error: "Foi encontrado um possível cadastro duplicado." }, { status: 409 })
    }

    let createData = data
    if (resolution?.action === "merge") {
      const selectedMatch = matches.find((match) => match.id === resolution.matchedFichaId)
      if (!selectedMatch) {
        return NextResponse.json({ error: "O cadastro selecionado para unificação não corresponde mais aos dados informados." }, { status: 409 })
      }
      createData = mergeClientIdentity(data, await getFichaById(selectedMatch.id))
    }

    const ficha = await createFicha(createData, consultor)

    let excelSaved = true
    let excelError: string | undefined

    try {
      excelSaved = await saveFichaToExcel(ficha)
    } catch (error) {
      excelSaved = false
      excelError = error instanceof Error ? error.message : "Erro ao salvar na planilha."
      console.error("Erro ao salvar ficha no Excel:", error)
    }

    return NextResponse.json({ ficha, excelSaved, excelError })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar ficha."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
