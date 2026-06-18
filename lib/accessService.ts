"use client"

import type { ConsultorSession } from "@/lib/ficha-types"

const SESSION_KEY = "cabricop_consultor_session"

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || "Erro ao validar acesso.")
  }
  return payload as T
}

export async function loginWithPassword(email: string, password: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  const payload = await parseResponse<{ consultor: ConsultorSession }>(response)
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(payload.consultor))
  return payload.consultor
}

export async function requestPasswordRecovery(email: string) {
  const response = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })

  return parseResponse<{ success: boolean; message: string }>(response)
}

export async function resetPassword(accessToken: string, password: string) {
  const response = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, password }),
  })

  return parseResponse<{ success: boolean; message: string }>(response)
}

export function getCurrentAccess() {
  if (typeof window === "undefined") return null

  const raw = window.localStorage.getItem(SESSION_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as ConsultorSession
  } catch {
    window.localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function logout() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(SESSION_KEY)
}

export function hasAdminAccess(access: ConsultorSession | null) {
  return access?.nivelAcesso === "admin"
}
