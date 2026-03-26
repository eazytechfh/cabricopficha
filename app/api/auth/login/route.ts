import { NextResponse } from "next/server"
import { getConsultorByCode } from "@/lib/consultants"

export async function POST(request: Request) {
  try {
    const { codigoAcesso } = await request.json()
    const consultor = getConsultorByCode(String(codigoAcesso || ""))

    if (!consultor) {
      return NextResponse.json({ error: "Código de acesso inválido." }, { status: 401 })
    }

    const { codigoAcesso: _, ...session } = consultor
    return NextResponse.json({ consultor: session })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao validar o código."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
