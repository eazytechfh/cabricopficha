import type { ConsultorSession, FichaFormValues, FichaListItem, FichaRecord } from "@/lib/ficha-types"

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload.error || "Erro inesperado na requisicao.")
  }

  return payload
}

export async function loginWithAccessCode(codigoAcesso: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codigoAcesso }),
  })

  return parseResponse<{ consultor: ConsultorSession }>(response)
}

export async function getFichasByCpf(cpf: string) {
  const response = await fetch(`/api/fichas?cpf=${encodeURIComponent(cpf)}`)
  return parseResponse<{ fichas: FichaListItem[] }>(response)
}

export async function getFichaById(id: string) {
  const response = await fetch(`/api/fichas/${id}`)
  return parseResponse<{ ficha: FichaRecord }>(response)
}

export async function createFicha(data: FichaFormValues, consultor: ConsultorSession) {
  const response = await fetch("/api/fichas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, consultor }),
  })

  return parseResponse<{ ficha: FichaRecord; excelSaved: boolean }>(response)
}

export async function updateFicha(id: string, data: FichaFormValues, consultor: ConsultorSession) {
  const response = await fetch(`/api/fichas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, consultor }),
  })

  return parseResponse<{ ficha: FichaRecord; excelSaved: boolean }>(response)
}
