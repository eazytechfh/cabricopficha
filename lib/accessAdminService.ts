"use client"

import type { AccessCodeRecord, ConsultorSession } from "@/lib/ficha-types"

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload.error || "Erro ao processar a requisicao de usuarios.")
  }

  return payload
}

export async function getAccessUsers(consultor: ConsultorSession) {
  const response = await fetch("/api/access-codes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "list",
      consultor,
    }),
  })

  return parseResponse<{ users: AccessCodeRecord[] }>(response)
}

export async function createAccessUser(
  consultor: ConsultorSession,
  input: {
    nomeResponsavel: string
    codigoAcesso: string
    nivelAcesso: AccessCodeRecord["nivelAcesso"]
  }
) {
  const response = await fetch("/api/access-codes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create",
      consultor,
      input,
    }),
  })

  return parseResponse<{ user: AccessCodeRecord }>(response)
}

export async function deleteAccessUser(consultor: ConsultorSession, id: string) {
  const response = await fetch(`/api/access-codes/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ consultor }),
  })

  return parseResponse<{ success: boolean }>(response)
}
