import { buildFichaUpdateWebhookPayload } from "@/lib/webhookService"
import type { ConsultorSession, FichaFormValues, FichaRecord } from "@/lib/ficha-types"

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload.error || "Erro inesperado na requisicao.")
  }

  return payload
}

export type UpdateFichaResult = {
  ficha: FichaRecord
  excelSaved: boolean
  webhookSent: boolean
  webhookError?: string
}

export async function updateFicha(id: string, data: FichaFormValues, consultor: ConsultorSession): Promise<UpdateFichaResult> {
  console.log("Iniciando atualizacao da ficha")

  const updateResponse = await fetch(`/api/fichas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, consultor }),
  })

  const updatePayload = await parseResponse<{ ficha: FichaRecord; excelSaved: boolean }>(updateResponse)

  console.log("Ficha atualizada no Supabase com sucesso")

  const webhookPayload = buildFichaUpdateWebhookPayload(updatePayload.ficha, consultor)

  try {
    console.log("Enviando webhook...", webhookPayload)

    const webhookResponse = await fetch("/api/ficha-update-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    })

    console.log("Resposta webhook status:", webhookResponse.status)

    await parseResponse<{ ok: boolean; status: number; body: string }>(webhookResponse)

    return {
      ficha: updatePayload.ficha,
      excelSaved: updatePayload.excelSaved,
      webhookSent: true,
    }
  } catch (error) {
    console.error("Erro ao acionar webhook:", error)

    return {
      ficha: updatePayload.ficha,
      excelSaved: updatePayload.excelSaved,
      webhookSent: false,
      webhookError: error instanceof Error ? error.message : "Erro ao enviar os dados para a automacao.",
    }
  }
}
