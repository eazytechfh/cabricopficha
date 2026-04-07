import type { AccessCodeRecord, ConsultorSession } from "@/lib/ficha-types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

type AccessCodeApiRecord = {
  id?: string
  nome_responsavel?: string
  codigo_acesso?: string
  nivel_acesso?: string
  ativo?: boolean
  created_at?: string
  updated_at?: string
}

function ensureConfig() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Variaveis do Supabase nao configuradas para o acesso.")
  }
}

function getHeaders(extraHeaders?: HeadersInit) {
  return {
    apikey: serviceRoleKey as string,
    Authorization: `Bearer ${serviceRoleKey}`,
    Accept: "application/json",
    ...extraHeaders,
  }
}

function mapAccessCodeRecord(record: AccessCodeApiRecord): AccessCodeRecord {
  return {
    id: String(record.id ?? ""),
    nomeResponsavel: String(record.nome_responsavel ?? ""),
    codigoAcesso: String(record.codigo_acesso ?? ""),
    nivelAcesso: String(record.nivel_acesso ?? "consultor") as AccessCodeRecord["nivelAcesso"],
    ativo: Boolean(record.ativo ?? true),
    createdAt: String(record.created_at ?? ""),
    updatedAt: String(record.updated_at ?? ""),
  }
}

function mapConsultorSession(record: AccessCodeApiRecord): ConsultorSession {
  return {
    id: String(record.id ?? ""),
    nome: String(record.nome_responsavel ?? ""),
    codigoAcesso: String(record.codigo_acesso ?? ""),
    nivelAcesso: String(record.nivel_acesso ?? "consultor") as ConsultorSession["nivelAcesso"],
  }
}

async function parseSupabaseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload?.message || payload?.error_description || payload?.error || "Erro ao consultar o Supabase."
    throw new Error(String(message))
  }

  return payload as T
}

export async function getAccessByCode(codigoAcesso: string): Promise<ConsultorSession | null> {
  ensureConfig()

  const response = await fetch(
    `${supabaseUrl}/rest/v1/access_codes?codigo_acesso=eq.${encodeURIComponent(codigoAcesso)}&ativo=eq.true&select=id,nome_responsavel,codigo_acesso,nivel_acesso&limit=1`,
    {
      headers: getHeaders(),
      cache: "no-store",
    }
  )

  const payload = await parseSupabaseResponse<AccessCodeApiRecord[]>(response)
  const [record] = payload
  if (!record) return null

  return mapConsultorSession(record)
}

export async function assertAdminAccess(consultor: ConsultorSession | null | undefined) {
  if (!consultor?.codigoAcesso) {
    throw new Error("Acesso nao autorizado.")
  }

  const currentAccess = await getAccessByCode(consultor.codigoAcesso)

  if (!currentAccess || currentAccess.nivelAcesso !== "admin") {
    throw new Error("Acesso restrito ao administrador.")
  }

  return currentAccess
}

export async function getAccessCodes() {
  ensureConfig()

  const response = await fetch(
    `${supabaseUrl}/rest/v1/access_codes?select=id,nome_responsavel,codigo_acesso,nivel_acesso,ativo,created_at,updated_at&order=created_at.desc`,
    {
      headers: getHeaders(),
      cache: "no-store",
    }
  )

  const payload = await parseSupabaseResponse<AccessCodeApiRecord[]>(response)
  return payload.map(mapAccessCodeRecord)
}

export async function createAccessCode(input: {
  nomeResponsavel: string
  codigoAcesso: string
  nivelAcesso: AccessCodeRecord["nivelAcesso"]
}) {
  ensureConfig()

  const response = await fetch(`${supabaseUrl}/rest/v1/access_codes`, {
    method: "POST",
    headers: getHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify({
      nome_responsavel: input.nomeResponsavel,
      codigo_acesso: input.codigoAcesso,
      nivel_acesso: input.nivelAcesso,
      ativo: true,
    }),
  })

  const payload = await parseSupabaseResponse<AccessCodeApiRecord[]>(response)
  const [record] = payload

  if (!record) {
    throw new Error("Nao foi possivel criar o usuario.")
  }

  return mapAccessCodeRecord(record)
}

export async function deleteAccessCode(id: string) {
  ensureConfig()

  const response = await fetch(`${supabaseUrl}/rest/v1/access_codes?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getHeaders({
      Prefer: "return=minimal",
    }),
  })

  if (!response.ok) {
    await parseSupabaseResponse(response)
  }
}
