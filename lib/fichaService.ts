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

export async function updateFicha(id: string, data: FichaFormValues, consultor: ConsultorSession) {
  const response = await fetch(`/api/fichas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, consultor }),
  })

  return parseResponse<UpdateFichaResult>(response)
}
