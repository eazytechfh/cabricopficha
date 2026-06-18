import { NextResponse } from "next/server"
import { updateAuthPassword } from "@/lib/server-access"

export async function POST(request: Request) {
  try {
    const { accessToken, password } = await request.json()
    const normalizedToken = String(accessToken || "").trim()
    const normalizedPassword = String(password || "")

    if (!normalizedToken || !normalizedPassword) {
      return NextResponse.json({ error: "Token e nova senha sao obrigatorios." }, { status: 400 })
    }

    if (normalizedPassword.length < 6) {
      return NextResponse.json({ error: "A senha precisa ter pelo menos 6 caracteres." }, { status: 400 })
    }

    await updateAuthPassword(normalizedToken, normalizedPassword)

    return NextResponse.json({
      success: true,
      message: "Senha redefinida com sucesso.",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao redefinir a senha."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
