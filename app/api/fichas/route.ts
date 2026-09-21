import { NextResponse } from "next/server"
import {
  createFicha,
  deleteFicha,
  findPotentialDuplicateFichas,
  getFichaById,
  getFichasByCpf,
  getFichasByFilters,
  mergeFichaClients,
  saveFichaToExcel,
  updateFichaInExcel,
} from "@/lib/server-fichas"
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
    if (resolution && resolution.action !== "create_new" && resolution.action !== "overwrite_client") {
      return NextResponse.json({ error: "Resolução de duplicidade inválida." }, { status: 400 })
    }
    if (matches.length > 0 && !resolution) {
      return NextResponse.json({ code: "POTENTIAL_DUPLICATE", matches, error: "Foi encontrado um possível cadastro duplicado." }, { status: 409 })
    }

    let relatedFichaIds: string[] = []
    if (resolution?.action === "overwrite_client") {
      const selectedMatch = matches.find((match) => match.id === resolution.matchedFichaId)
      if (!selectedMatch) {
        return NextResponse.json({ error: "O cliente selecionado não corresponde mais aos dados informados." }, { status: 409 })
      }

      const selectedFicha = await getFichaById(selectedMatch.id)
      const relatedFichas = selectedFicha.cpfCnpj
        ? await getFichasByCpf(selectedFicha.cpfCnpj)
        : selectedFicha.clientGroupId
          ? (await getFichasByFilters({ nome: selectedFicha.nomeCliente })).filter(
              (ficha) => ficha.clientGroupId === selectedFicha.clientGroupId
            )
          : []
      relatedFichaIds = [...new Set([selectedFicha.id, ...relatedFichas.map((ficha) => ficha.id)])]
    }

    let ficha = await createFicha(data, consultor)

    if (resolution?.action === "overwrite_client") {
      try {
        await mergeFichaClients(ficha.id, [ficha.id, ...relatedFichaIds], consultor)
        ficha = await getFichaById(ficha.id)
      } catch (error) {
        await deleteFicha(ficha.id).catch(() => undefined)
        throw error
      }
    }

    let excelSaved = true
    let excelError: string | undefined

    try {
      if (resolution?.action === "overwrite_client") {
        for (const fichaId of [ficha.id, ...relatedFichaIds]) {
          await updateFichaInExcel(await getFichaById(fichaId))
        }
      } else {
        excelSaved = await saveFichaToExcel(ficha)
      }
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
