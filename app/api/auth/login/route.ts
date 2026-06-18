import { NextResponse } from "next/server"
import { getAccessByCredentials } from "@/lib/server-access"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    const consultor = await getAccessByCredentials(String(email || "").trim(), String(password || ""))

    if (!consultor) {
      return NextResponse.json({ error: "E-mail ou senha invalidos." }, { status: 401 })
    }

    return NextResponse.json({ consultor })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao validar o acesso."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
