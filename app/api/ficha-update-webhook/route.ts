import { NextResponse } from "next/server"
import { sendFichaUpdateWebhook, type FichaUpdateWebhookPayload } from "@/lib/webhookService"

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as FichaUpdateWebhookPayload

    console.log("Enviando webhook...", payload)

    const response = await sendFichaUpdateWebhook(payload)

    console.log("Resposta webhook status:", response.status)

    return NextResponse.json({
      ok: true,
      status: response.status,
      body: response.body,
    })
  } catch (error) {
    console.error("Erro ao acionar webhook:", error)
    const message = error instanceof Error ? error.message : "Erro ao enviar os dados para a automacao."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
