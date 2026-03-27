import { createFicha } from "@/lib/fichas-api"
import { downloadFichaPdf } from "@/lib/ficha-pdf-client"
import { buildFichaCreateWebhookPayload } from "@/lib/webhookService"
import type { ConsultorSession, FichaFormValues, FichaRecord } from "@/lib/ficha-types"

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload.error || "Erro inesperado na requisicao.")
  }

  return payload
}

export type CreateFichaResult = {
  ficha: FichaRecord
  excelSaved: boolean
  webhookSent: boolean
  webhookError?: string
}

export async function saveFichaWithPdfAndWebhook(
  data: FichaFormValues,
  consultor: ConsultorSession
): Promise<CreateFichaResult> {
  console.log("Iniciando salvamento da ficha")

  const saveResponse = await createFicha(data, consultor)

  console.log("Ficha salva com sucesso no Supabase", saveResponse.ficha)

  console.log("Gerando PDF")
  await downloadFichaPdf(data)
  console.log("PDF gerado com sucesso")

  const webhookPayload = buildFichaCreateWebhookPayload(saveResponse.ficha, consultor)

  try {
    console.log("Enviando webhook de criacao", webhookPayload)

    const webhookResponse = await fetch("/api/ficha-create-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    })

    console.log("Resposta webhook:", webhookResponse.status)

    await parseResponse<{ ok: boolean; status: number; body: string }>(webhookResponse)

    return {
      ficha: saveResponse.ficha,
      excelSaved: saveResponse.excelSaved,
      webhookSent: true,
    }
  } catch (error) {
    console.error("Erro no webhook de criacao:", error)

    return {
      ficha: saveResponse.ficha,
      excelSaved: saveResponse.excelSaved,
      webhookSent: false,
      webhookError: error instanceof Error ? error.message : "Erro ao enviar os dados para a automacao.",
    }
  }
}
