import type { AccessCodeRecord, ConsultorSession } from "@/lib/ficha-types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

type UserProfileApiRecord = {
  id?: string
  nome_responsavel?: string
  email?: string
  telefone?: string
  nivel_acesso?: string
  ativo?: boolean
  must_change_password?: boolean
  password_plain?: string
  last_login_at?: string
  created_at?: string
  updated_at?: string
}

type AuthUserApiRecord = {
  id?: string
  email?: string
}

function normalizePhone(value: string) {
  return String(value || "").replace(/\D/g, "")
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

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload?.msg ||
      payload?.message ||
      payload?.error_description ||
      payload?.error ||
      fallbackMessage
    throw new Error(String(message))
  }

  return payload as T
}

function mapAccessCodeRecord(record: UserProfileApiRecord): AccessCodeRecord {
  return {
    id: String(record.id ?? ""),
    nomeResponsavel: String(record.nome_responsavel ?? ""),
    email: String(record.email ?? ""),
    telefone: String(record.telefone ?? ""),
    nivelAcesso: String(record.nivel_acesso ?? "consultor") as AccessCodeRecord["nivelAcesso"],
    ativo: Boolean(record.ativo ?? true),
    senha: record.password_plain ?? "",
    mustChangePassword: Boolean(record.must_change_password ?? false),
    lastLoginAt: String(record.last_login_at ?? ""),
    createdAt: String(record.created_at ?? ""),
    updatedAt: String(record.updated_at ?? ""),
  }
}

function mapConsultorSession(record: UserProfileApiRecord): ConsultorSession {
  return {
    id: String(record.id ?? ""),
    nome: String(record.nome_responsavel ?? ""),
    email: String(record.email ?? ""),
    telefone: String(record.telefone ?? ""),
    nivelAcesso: String(record.nivel_acesso ?? "consultor") as ConsultorSession["nivelAcesso"],
    ativo: Boolean(record.ativo ?? true),
  }
}

async function fetchProfileById(id: string) {
  ensureConfig()

  const response = await fetch(
    `${supabaseUrl}/rest/v1/user_profiles?id=eq.${encodeURIComponent(id)}&select=id,nome_responsavel,email,telefone,nivel_acesso,ativo,must_change_password,last_login_at,created_at,updated_at&limit=1`,
    {
      headers: getHeaders(),
      cache: "no-store",
    }
  )

  const payload = await parseJsonResponse<UserProfileApiRecord[]>(response, "Erro ao consultar perfil do usuario.")
  return payload[0] ?? null
}

export async function getAccessByCredentials(email: string, password: string): Promise<ConsultorSession | null> {
  ensureConfig()

  const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  })

  const tokenPayload = await parseJsonResponse<{ user?: AuthUserApiRecord }>(
    tokenResponse,
    "E-mail ou senha invalidos."
  )

  const authUserId = String(tokenPayload.user?.id ?? "")
  if (!authUserId) return null

  const profile = await fetchProfileById(authUserId)
  if (!profile || !profile.ativo) {
    return null
  }

  await touchLastLogin(authUserId)
  return mapConsultorSession(profile)
}

async function touchLastLogin(id: string) {
  ensureConfig()

  await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: getHeaders({
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    }),
    body: JSON.stringify({
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  }).catch(() => null)
}

export async function sendPasswordRecovery(email: string, redirectTo: string) {
  ensureConfig()

  const response = await fetch(`${supabaseUrl}/auth/v1/recover`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      email,
      redirect_to: redirectTo,
    }),
  })

  await parseJsonResponse(response, "Erro ao solicitar recuperacao de senha.")
}

async function fetchProfileByEmail(email: string) {
  ensureConfig()

  const normalizedEmail = String(email || "").trim().toLowerCase()
  const response = await fetch(
    `${supabaseUrl}/rest/v1/user_profiles?email=eq.${encodeURIComponent(normalizedEmail)}&select=id,nome_responsavel,email,telefone,nivel_acesso,ativo,must_change_password,last_login_at,created_at,updated_at&limit=1`,
    {
      headers: getHeaders(),
      cache: "no-store",
    }
  )

  const payload = await parseJsonResponse<UserProfileApiRecord[]>(response, "Erro ao consultar perfil do usuario.")
  return payload[0] ?? null
}

async function clearMustChangePassword(id: string, password?: string) {
  ensureConfig()

  await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: getHeaders({
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    }),
    body: JSON.stringify({
      must_change_password: false,
      updated_at: new Date().toISOString(),
      ...(password ? { password_plain: password } : {}),
    }),
  }).catch(() => null)
}

export async function updateAuthPassword(accessToken: string, password: string) {
  ensureConfig()

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: serviceRoleKey as string,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ password }),
  })

  const payload = await parseJsonResponse<{ id?: string; user?: { id?: string } }>(response, "Erro ao redefinir a senha.")
  const userId = String(payload.user?.id || payload.id || "")
  if (userId) {
    await clearMustChangePassword(userId, password)
  }
}

export async function resetPasswordWithEmailAndPhone(input: {
  email: string
  telefone: string
  password: string
}) {
  ensureConfig()

  const normalizedEmail = String(input.email || "").trim().toLowerCase()
  const normalizedPhone = normalizePhone(input.telefone)
  const normalizedPassword = String(input.password || "")

  if (!normalizedEmail || !normalizedPhone || !normalizedPassword) {
    throw new Error("E-mail, telefone e nova senha sao obrigatorios.")
  }

  const profile = await fetchProfileByEmail(normalizedEmail)

  if (!profile || !profile.ativo) {
    throw new Error("Nao encontramos um usuario ativo com os dados informados.")
  }

  const profilePhone = normalizePhone(String(profile.telefone || ""))
  if (!profilePhone || profilePhone !== normalizedPhone) {
    throw new Error("E-mail e telefone nao conferem.")
  }

  const userId = String(profile.id || "")
  if (!userId) {
    throw new Error("Nao foi possivel localizar o usuario para redefinir a senha.")
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      password: normalizedPassword,
      email_confirm: true,
    }),
  })

  await parseJsonResponse(response, "Erro ao redefinir a senha.")
  await clearMustChangePassword(userId, normalizedPassword)
}

export async function assertAdminAccess(consultor: ConsultorSession | null | undefined) {
  if (!consultor?.id) {
    throw new Error("Acesso nao autorizado.")
  }

  const currentAccess = await fetchProfileById(consultor.id)

  if (!currentAccess || !currentAccess.ativo || currentAccess.nivel_acesso !== "admin") {
    throw new Error("Acesso restrito ao administrador.")
  }

  return mapConsultorSession(currentAccess)
}

export async function getAccessCodes() {
  ensureConfig()

  const response = await fetch(
    `${supabaseUrl}/rest/v1/user_profiles?select=id,nome_responsavel,email,telefone,nivel_acesso,ativo,must_change_password,password_plain,last_login_at,created_at,updated_at&order=created_at.desc`,
    {
      headers: getHeaders(),
      cache: "no-store",
    }
  )

  const payload = await parseJsonResponse<UserProfileApiRecord[]>(response, "Erro ao consultar usuarios.")
  return payload.map(mapAccessCodeRecord)
}

async function createAuthUser(email: string, password: string) {
  ensureConfig()

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  })

  return parseJsonResponse<{ id?: string; user?: AuthUserApiRecord }>(response, "Erro ao criar usuario de acesso.")
}

async function updateAuthUser(id: string, input: { email: string; password?: string }) {
  ensureConfig()

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      email: input.email,
      email_confirm: true,
      ...(input.password ? { password: input.password } : {}),
    }),
  })

  await parseJsonResponse(response, "Nao foi possivel atualizar o usuario de autenticacao.")
}

export async function createAccessCode(input: {
  nomeResponsavel: string
  email: string
  telefone: string
  nivelAcesso: AccessCodeRecord["nivelAcesso"]
  password: string
  appOrigin?: string
}) {
  ensureConfig()

  if (input.password.length < 6) {
    throw new Error("A senha deve ter pelo menos 6 caracteres.")
  }

  const authPayload = await createAuthUser(input.email, input.password)
  const authUserId = String(authPayload.user?.id || authPayload.id || "")

  if (!authUserId) {
    throw new Error("Nao foi possivel criar o usuario de autenticacao.")
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
    method: "POST",
    headers: getHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify({
      id: authUserId,
      nome_responsavel: input.nomeResponsavel,
      email: input.email,
      telefone: input.telefone,
      nivel_acesso: input.nivelAcesso,
      ativo: true,
      must_change_password: false,
      password_plain: input.password,
    }),
  })

  const payload = await parseJsonResponse<UserProfileApiRecord[]>(response, "Nao foi possivel criar o perfil do usuario.")
  const [record] = payload

  if (!record) {
    throw new Error("Nao foi possivel criar o usuario.")
  }

  return mapAccessCodeRecord(record)
}

export async function deleteAccessCode(id: string) {
  ensureConfig()

  const authDelete = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getHeaders(),
  })

  if (!authDelete.ok && authDelete.status !== 404) {
    await parseJsonResponse(authDelete, "Erro ao remover usuario de autenticacao.")
  }

  const profileDelete = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getHeaders({ Prefer: "return=minimal" }),
  })

  if (!profileDelete.ok) {
    await parseJsonResponse(profileDelete, "Erro ao remover perfil do usuario.")
  }
}

export async function updateAccessCode(
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
  ensureConfig()

  if (input.password && input.password.length < 6) {
    throw new Error("A nova senha deve ter pelo menos 6 caracteres.")
  }

  await updateAuthUser(id, { email: input.email, password: input.password })

  const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: getHeaders({
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify({
      nome_responsavel: input.nomeResponsavel,
      email: input.email,
      telefone: input.telefone,
      nivel_acesso: input.nivelAcesso,
      ativo: input.ativo,
      updated_at: new Date().toISOString(),
      ...(input.password ? { password_plain: input.password } : {}),
    }),
  })

  const payload = await parseJsonResponse<UserProfileApiRecord[]>(response, "Nao foi possivel atualizar o usuario.")
  const [record] = payload

  if (!record) {
    throw new Error("Nao foi possivel atualizar o usuario.")
  }

  return mapAccessCodeRecord(record)
}
