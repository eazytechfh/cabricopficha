import type { ConsultorSession, DuplicateResolution, FichaDuplicateMatch, FichaFormValues, FichaListItem, FichaRecord } from "@/lib/ficha-types"

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload.error || "Erro inesperado na requisicao.")
  }

  return payload
}

export async function loginWithPassword(email: string, password: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  return parseResponse<{ consultor: ConsultorSession }>(response)
}

export async function getFichas(params: { cpf?: string; nome?: string }) {
  const searchParams = new URLSearchParams()

  if (params.cpf) {
    searchParams.set("cpf", params.cpf)
  }

  if (params.nome) {
    searchParams.set("nome", params.nome)
  }

  const response = await fetch(`/api/fichas?${searchParams.toString()}`)
  return parseResponse<{ fichas: FichaListItem[] }>(response)
}

export async function getFichasByCpf(cpf: string) {
  return getFichas({ cpf })
}

export async function getFichaById(id: string) {
  const response = await fetch(`/api/fichas/${id}`)
  return parseResponse<{ ficha: FichaRecord }>(response)
}

export async function createFicha(data: FichaFormValues, consultor: ConsultorSession, resolution?: DuplicateResolution) {
  const response = await fetch("/api/fichas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, consultor, resolution }),
  })

  return parseResponse<{ ficha: FichaRecord; excelSaved: boolean }>(response)
}

export async function checkFichaDuplicates(data: FichaFormValues) {
  const response = await fetch("/api/fichas/duplicates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  })
  return parseResponse<{ matches: FichaDuplicateMatch[] }>(response)
}

export async function deleteFicha(id: string, consultor: ConsultorSession) {
  const response = await fetch(`/api/fichas/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ consultor }),
  })
  return parseResponse<{ ok: boolean; excelSaved: boolean }>(response)
}

export async function mergeFichaClients(primaryFichaId: string, fichaIds: string[], consultor: ConsultorSession) {
  const response = await fetch("/api/fichas/merge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ primaryFichaId, fichaIds, consultor }),
  })
  return parseResponse<{ ok: boolean; mergedCount: number }>(response)
}

export async function updateFicha(id: string, data: FichaFormValues, consultor: ConsultorSession) {
  const response = await fetch(`/api/fichas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, consultor }),
  })

  return parseResponse<{ ficha: FichaRecord; excelSaved: boolean }>(response)
}
