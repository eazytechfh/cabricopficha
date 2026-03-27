import { NextResponse } from "next/server"
import { sendFichaCreateWebhook, type FichaCreateWebhookPayload } from "@/lib/webhookService"

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as FichaCreateWebhookPayload

    console.log("Enviando webhook de criacao...", payload)

    const response = await sendFichaCreateWebhook(payload)

    console.log("Resposta webhook de criacao:", response.status)

    return NextResponse.json({
      ok: true,
      status: response.status,
      body: response.body,
    })
  } catch (error) {
    console.error("Erro no webhook de criacao:", error)
    const message = error instanceof Error ? error.message : "Erro ao enviar os dados para a automacao."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
