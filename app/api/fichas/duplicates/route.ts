import { NextResponse } from "next/server"
import { findPotentialDuplicateFichas } from "@/lib/server-fichas"
import type { FichaFormValues } from "@/lib/ficha-types"

export async function POST(request: Request) {
  try {
    const { data } = (await request.json()) as { data: FichaFormValues }
    const matches = await findPotentialDuplicateFichas(data)
    return NextResponse.json({ matches })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao verificar cadastros semelhantes."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
