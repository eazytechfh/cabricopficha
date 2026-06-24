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
    const rawMessage = error instanceof Error ? error.message : "Erro ao solicitar recuperacao de senha."
    const normalizedMessage = rawMessage.toLowerCase()
    const message = normalizedMessage.includes("email rate limit exceeded")
      ? "Limite temporario de envio de e-mails atingido no Supabase. Aguarde um pouco e tente novamente. Para evitar esse bloqueio em producao, configure um SMTP proprio no Supabase Auth."
      : rawMessage
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
