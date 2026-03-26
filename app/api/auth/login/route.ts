import { NextResponse } from "next/server"
import { getAccessByCode } from "@/lib/server-access"

export async function POST(request: Request) {
  try {
    const { codigoAcesso } = await request.json()
    const consultor = await getAccessByCode(String(codigoAcesso || "").trim())

    if (!consultor) {
      return NextResponse.json({ error: "Codigo de acesso invalido." }, { status: 401 })
    }

    return NextResponse.json({ consultor })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao validar o codigo."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
