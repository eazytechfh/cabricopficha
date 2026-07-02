import { NextResponse } from "next/server"
import { resetPasswordWithEmailAndPhone, updateAuthPassword } from "@/lib/server-access"

export async function POST(request: Request) {
  try {
    const { accessToken, password, email, telefone } = await request.json()
    const normalizedToken = String(accessToken || "").trim()
    const normalizedPassword = String(password || "")
    const normalizedEmail = String(email || "").trim().toLowerCase()
    const normalizedPhone = String(telefone || "").trim()

    if (normalizedPassword.length < 6) {
      return NextResponse.json({ error: "A senha precisa ter pelo menos 6 caracteres." }, { status: 400 })
    }

    if (normalizedToken) {
      await updateAuthPassword(normalizedToken, normalizedPassword)
    } else {
      if (!normalizedEmail || !normalizedPhone) {
        return NextResponse.json({ error: "E-mail, telefone e nova senha sao obrigatorios." }, { status: 400 })
      }

      await resetPasswordWithEmailAndPhone({
        email: normalizedEmail,
        telefone: normalizedPhone,
        password: normalizedPassword,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Senha redefinida com sucesso.",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao redefinir a senha."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
