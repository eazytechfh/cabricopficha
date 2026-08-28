"use client"

import type { AccessCodeRecord, ConsultorSession } from "@/lib/ficha-types"

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(payload?.error || "Erro ao processar a requisicao de usuarios.")
  }

  if (!payload) {
    throw new Error("Resposta invalida ao processar a requisicao de usuarios.")
  }

  return payload as T
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
    email: string
    telefone: string
    nivelAcesso: AccessCodeRecord["nivelAcesso"]
    password: string
    appOrigin?: string
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

export async function updateAccessUser(
  consultor: ConsultorSession,
  id: string,
  input: {
    nomeResponsavel: string
    email: string
    telefone: string
    nivelAcesso: AccessCodeRecord["nivelAcesso"]
    ativo: boolean
    password?: string
  }
) {
  const response = await fetch(`/api/access-codes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      consultor,
      input,
    }),
  })

  return parseResponse<{ user: AccessCodeRecord }>(response)
}
