import { mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import * as XLSX from "xlsx"
import type { ConsultorSession, FichaFormValues, FichaListItem, FichaRecord } from "@/lib/ficha-types"
import { normalizeCpfCnpj, normalizeFichaValues } from "@/lib/ficha-utils"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const fichasTableName = "fichas_venda"
const excelBaseDir = process.env.VERCEL ? path.join(tmpdir(), "cabricopficha") : path.join(process.cwd(), "storage")
const excelPath = path.join(excelBaseDir, "fichas.xlsx")

function ensureSupabaseConfig() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Variaveis do Supabase nao configuradas no servidor.")
  }
}

function headers() {
  ensureSupabaseConfig()

  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    apikey: serviceRoleKey as string,
    Authorization: `Bearer ${serviceRoleKey}`,
  }
}

function toPayload(data: FichaFormValues, consultor: ConsultorSession, mode: "create" | "update") {
  const now = new Date().toISOString()
  const normalizedData = normalizeFichaValues(data)

  return {
    data_contrato: normalizedData.dataContrato || null,
    prazo_servico: normalizedData.prazoServico || null,
    nome_cliente: normalizedData.nomeCliente || null,
    terceiros: normalizedData.terceiros || null,
    telefones: normalizedData.telefones || null,
    endereco: normalizedData.endereco || null,
    cep: normalizedData.cep || null,
    cpf_cnpj: normalizeCpfCnpj(normalizedData.cpfCnpj) || null,
    cpf_normalizado: normalizeCpfCnpj(normalizedData.cpfCnpj),
    cnh: normalizedData.cnh || null,
    data_nascimento: normalizedData.dataNascimento || null,
    data_primeira_cnh: normalizedData.dataPrimeiraCnh || null,
    email: normalizedData.email || null,
    nome_consultor: normalizedData.nomeConsultor || consultor.nome,
    origem: normalizedData.origem || null,
    sne: normalizedData.sne || null,
    forma_pagamento: normalizedData.formaPagamento || null,
    banco: normalizedData.banco || null,
    valor_total: normalizedData.valorTotal || null,
    valor_entrada: normalizedData.valorEntrada || null,
    valor_restante: normalizedData.valorRestante || null,
    instancia_processo: normalizedData.instanciaProcesso || null,
    tipo_processo: normalizedData.tipoProcesso || null,
    numero_processo: normalizedData.numeroProcesso || null,
    prazo_processo: normalizedData.prazoProcesso || null,
    visto_juridico: normalizedData.vistoJuridico || null,
    assinatura_visto_juridico: normalizedData.assinaturaVistoJuridico || null,
    instancia_multa: normalizedData.instanciaMulta || null,
    auto_detran: normalizedData.autoDetran || null,
    auto_renainf: normalizedData.autoRenainf || null,
    tipo_multa: normalizedData.tipoMulta || null,
    placa: normalizedData.placa || null,
    renavam: normalizedData.renavam || null,
    prazo_multa: normalizedData.prazoMulta || null,
    visto_juridico_multa: normalizedData.vistoJuridicoMulta || null,
    observacoes: normalizedData.observacoes || null,
    updated_at: now,
    updated_by_consultor_id: consultor.id,
    ...(mode === "create"
      ? {
          created_at: now,
          created_by_consultor_id: consultor.id,
        }
      : {}),
  }
}

function fromRow(row: Record<string, unknown>): FichaRecord {
  return {
    id: String(row.id ?? ""),
    dataContrato: String(row.data_contrato ?? ""),
    prazoServico: String(row.prazo_servico ?? ""),
    nomeCliente: String(row.nome_cliente ?? ""),
    terceiros: String(row.terceiros ?? ""),
    telefones: String(row.telefones ?? ""),
    endereco: String(row.endereco ?? ""),
    cep: String(row.cep ?? ""),
    cpfCnpj: String(row.cpf_cnpj ?? ""),
    cpfNormalizado: String(row.cpf_normalizado ?? ""),
    cnh: String(row.cnh ?? ""),
    dataNascimento: String(row.data_nascimento ?? ""),
    dataPrimeiraCnh: String(row.data_primeira_cnh ?? ""),
    email: String(row.email ?? ""),
    nomeConsultor: String(row.nome_consultor ?? ""),
    origem: String(row.origem ?? ""),
    sne: String(row.sne ?? ""),
    formaPagamento: String(row.forma_pagamento ?? ""),
    banco: String(row.banco ?? ""),
    valorTotal: String(row.valor_total ?? ""),
    valorEntrada: String(row.valor_entrada ?? ""),
    valorRestante: String(row.valor_restante ?? ""),
    instanciaProcesso: String(row.instancia_processo ?? ""),
    tipoProcesso: String(row.tipo_processo ?? ""),
    numeroProcesso: String(row.numero_processo ?? ""),
    prazoProcesso: String(row.prazo_processo ?? ""),
    vistoJuridico: String(row.visto_juridico ?? ""),
    assinaturaVistoJuridico: String(row.assinatura_visto_juridico ?? ""),
    instanciaMulta: String(row.instancia_multa ?? ""),
    autoDetran: String(row.auto_detran ?? ""),
    autoRenainf: String(row.auto_renainf ?? ""),
    tipoMulta: String(row.tipo_multa ?? ""),
    placa: String(row.placa ?? ""),
    renavam: String(row.renavam ?? ""),
    prazoMulta: String(row.prazo_multa ?? ""),
    vistoJuridicoMulta: String(row.visto_juridico_multa ?? ""),
    observacoes: String(row.observacoes ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    createdByConsultorId: String(row.created_by_consultor_id ?? ""),
    updatedByConsultorId: String(row.updated_by_consultor_id ?? ""),
  }
}

export async function getFichasByCpf(cpf: string): Promise<FichaListItem[]> {
  ensureSupabaseConfig()

  const cpfNormalizado = normalizeCpfCnpj(cpf)
  if (!cpfNormalizado) {
    return []
  }

  const select = [
    "id",
    "nome_cliente",
    "cpf_cnpj",
    "telefones",
    "endereco",
    "data_contrato",
    "nome_consultor",
    "created_at",
    "updated_at",
    "created_by_consultor_id",
    "updated_by_consultor_id",
  ].join(",")

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${fichasTableName}?cpf_cnpj=eq.${encodeURIComponent(cpfNormalizado)}&select=${select}&order=updated_at.desc.nullslast,created_at.desc.nullslast`,
    {
      headers: headers(),
      cache: "no-store",
    }
  )

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Erro ao consultar fichas no Supabase.")
  }

  return (payload as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ""),
    nomeCliente: String(row.nome_cliente ?? ""),
    cpfCnpj: String(row.cpf_cnpj ?? ""),
    telefones: String(row.telefones ?? ""),
    endereco: String(row.endereco ?? ""),
    dataContrato: String(row.data_contrato ?? ""),
    nomeConsultor: String(row.nome_consultor ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    createdByConsultorId: String(row.created_by_consultor_id ?? ""),
    updatedByConsultorId: String(row.updated_by_consultor_id ?? ""),
  }))
}

export async function getFichasByFilters(filters: { cpf?: string; nome?: string }): Promise<FichaListItem[]> {
  ensureSupabaseConfig()

  const cpfNormalizado = normalizeCpfCnpj(filters.cpf || "")
  const nome = (filters.nome || "").trim()

  if (!cpfNormalizado && !nome) {
    return []
  }

  const select = [
    "id",
    "nome_cliente",
    "cpf_cnpj",
    "telefones",
    "endereco",
    "data_contrato",
    "nome_consultor",
    "created_at",
    "updated_at",
    "created_by_consultor_id",
    "updated_by_consultor_id",
  ].join(",")

  const searchParams = new URLSearchParams({
    select,
    order: "updated_at.desc.nullslast,created_at.desc.nullslast",
  })

  if (cpfNormalizado) {
    searchParams.set("cpf_cnpj", `eq.${cpfNormalizado}`)
  }

  if (nome) {
    searchParams.set("nome_cliente", `ilike.*${nome}*`)
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${fichasTableName}?${searchParams.toString()}`, {
    headers: headers(),
    cache: "no-store",
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Erro ao consultar fichas no Supabase.")
  }

  return (payload as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ""),
    nomeCliente: String(row.nome_cliente ?? ""),
    cpfCnpj: String(row.cpf_cnpj ?? ""),
    telefones: String(row.telefones ?? ""),
    endereco: String(row.endereco ?? ""),
    dataContrato: String(row.data_contrato ?? ""),
    nomeConsultor: String(row.nome_consultor ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    createdByConsultorId: String(row.created_by_consultor_id ?? ""),
    updatedByConsultorId: String(row.updated_by_consultor_id ?? ""),
  }))
}

export async function getFichaById(id: string): Promise<FichaRecord> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${fichasTableName}?id=eq.${id}&select=*`, {
    headers: headers(),
    cache: "no-store",
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Erro ao consultar ficha.")
  }

  const [row] = payload as Array<Record<string, unknown>>
  if (!row) {
    throw new Error("Ficha nao encontrada.")
  }

  return fromRow(row)
}

export async function createFicha(data: FichaFormValues, consultor: ConsultorSession): Promise<FichaRecord> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${fichasTableName}`, {
    method: "POST",
    headers: {
      ...headers(),
      Prefer: "return=representation",
    },
    body: JSON.stringify(toPayload(data, consultor, "create")),
    cache: "no-store",
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Erro ao criar ficha.")
  }

  return fromRow(payload[0])
}

export async function updateFicha(id: string, data: FichaFormValues, consultor: ConsultorSession): Promise<FichaRecord> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${fichasTableName}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      ...headers(),
      Prefer: "return=representation",
    },
    body: JSON.stringify(toPayload(data, consultor, "update")),
    cache: "no-store",
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Erro ao atualizar ficha.")
  }

  return fromRow(payload[0])
}

async function readWorkbookRows() {
  try {
    const workbook = XLSX.readFile(excelPath)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)
    return { workbook, rows }
  } catch {
    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.json_to_sheet([])
    XLSX.utils.book_append_sheet(workbook, sheet, "Fichas")
    return { workbook, rows: [] as Array<Record<string, unknown>> }
  }
}

function fichaToExcelRow(ficha: FichaRecord) {
  return {
    id: ficha.id,
    data: ficha.dataContrato,
    prazoGeral: ficha.prazoServico,
    nome: ficha.nomeCliente,
    cpfCnpj: ficha.cpfCnpj,
    cpfNormalizado: ficha.cpfNormalizado,
    telefone: ficha.telefones,
    email: ficha.email,
    endereco: ficha.endereco,
    consultor: ficha.nomeConsultor,
    origem: ficha.origem,
    createdAt: ficha.createdAt,
    updatedAt: ficha.updatedAt,
    createdByConsultorId: ficha.createdByConsultorId,
    updatedByConsultorId: ficha.updatedByConsultorId,
    formaPagamento: ficha.formaPagamento,
    banco: ficha.banco,
    valorTotal: ficha.valorTotal,
    valorEntrada: ficha.valorEntrada,
    valorRestante: ficha.valorRestante,
    tipoProcesso: ficha.tipoProcesso,
    numeroProcesso: ficha.numeroProcesso,
    instanciaProcesso: ficha.instanciaProcesso,
    prazoProcesso: ficha.prazoProcesso,
    tipoMulta: ficha.tipoMulta,
    placa: ficha.placa,
    renavam: ficha.renavam,
    observacoes: ficha.observacoes,
  }
}

async function writeWorkbookRows(rows: Array<Record<string, unknown>>) {
  await mkdir(path.dirname(excelPath), { recursive: true })
  const workbook = XLSX.utils.book_new()
  const sheet = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(workbook, sheet, "Fichas")
  XLSX.writeFile(workbook, excelPath)
}

export async function saveFichaToExcel(ficha: FichaRecord) {
  const { rows } = await readWorkbookRows()
  rows.push(fichaToExcelRow(ficha))
  await writeWorkbookRows(rows)
  return true
}

export async function updateFichaInExcel(ficha: FichaRecord) {
  const { rows } = await readWorkbookRows()
  const nextRows = rows.map((row) => (String(row.id ?? "") === ficha.id ? fichaToExcelRow(ficha) : row))
  const hasRow = nextRows.some((row) => String(row.id ?? "") === ficha.id)

  if (!hasRow) {
    nextRows.push(fichaToExcelRow(ficha))
  }

  await writeWorkbookRows(nextRows)
  return true
}
