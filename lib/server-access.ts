import type { ConsultorSession } from "@/lib/ficha-types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function ensureConfig() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Variaveis do Supabase nao configuradas para o acesso.")
  }
}

export async function getAccessByCode(codigoAcesso: string): Promise<ConsultorSession | null> {
  ensureConfig()

  const response = await fetch(
    `${supabaseUrl}/rest/v1/access_codes?codigo_acesso=eq.${encodeURIComponent(codigoAcesso)}&ativo=eq.true&select=id,nome_responsavel,codigo_acesso,nivel_acesso&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey as string,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  )

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Erro ao validar o código no Supabase.")
  }

  const [record] = payload as Array<Record<string, unknown>>
  if (!record) return null

  return {
    id: String(record.id ?? ""),
    nome: String(record.nome_responsavel ?? ""),
    codigoAcesso: String(record.codigo_acesso ?? ""),
    nivelAcesso: String(record.nivel_acesso ?? "consultor") as ConsultorSession["nivelAcesso"],
  }
}
