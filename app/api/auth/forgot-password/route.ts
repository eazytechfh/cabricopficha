import { NextResponse } from "next/server"
import { sendPasswordRecovery } from "@/lib/server-access"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    const normalizedEmail = String(email || "").trim().toLowerCase()

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Informe o e-mail para recuperar a senha." }, { status: 400 })
    }

    const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    await sendPasswordRecovery(normalizedEmail, origin)

    return NextResponse.json({
      success: true,
      message: "Enviamos um link de recuperacao para o seu e-mail.",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao solicitar recuperacao de senha."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
