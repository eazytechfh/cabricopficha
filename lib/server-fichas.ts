import { mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import * as XLSX from "xlsx"
import type { ConsultorSession, FichaFormValues, FichaListItem, FichaRecord } from "@/lib/ficha-types"
import { normalizeCpfCnpj, normalizeFichaValues, stripNumericDecimalSuffix } from "@/lib/ficha-utils"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const fichasTableName = "fichas_venda"
const excelBaseDir = process.env.VERCEL ? path.join(tmpdir(), "cabricopficha") : path.join(process.cwd(), "storage")
const excelPath = path.join(excelBaseDir, "fichas.xlsx")
const VENCIDA_SENTINEL_DATE = "1900-01-01"
const REVISAO_ATO_SENTINEL_DATE = "1900-01-02"

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

function toDatabaseDate(value: string) {
  const normalizedValue = (value || "").trim()
  if (normalizedValue === "Vencida" || normalizedValue === "VENCIDA") {
    return VENCIDA_SENTINEL_DATE
  }
  if (normalizedValue === "Revisão de Ato" || normalizedValue === "Revisao de Ato") {
    return REVISAO_ATO_SENTINEL_DATE
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue) ? normalizedValue : null
}

function fromDatabaseDate(value: unknown) {
  const normalizedValue = String(value ?? "")
  if (normalizedValue === VENCIDA_SENTINEL_DATE) return "Vencida"
  if (normalizedValue === REVISAO_ATO_SENTINEL_DATE) return "Revisão de Ato"
  return normalizedValue
}

function firstLine(value: string) {
  return (value || "").split("\n")[0] || ""
}

function stripIdentifierSuffix(value: string) {
  return (value || "").trim().replace(/\s+\d{2}$/, "")
}

async function getFichaSequenceByCpf(cpf: string) {
  ensureSupabaseConfig()

  const cpfNormalizado = normalizeCpfCnpj(cpf)
  if (!cpfNormalizado) {
    return 1
  }

  const searchParams = new URLSearchParams({
    select: "id",
    or: `(cpf_cnpj.eq.${cpfNormalizado},cpf_cnpj.eq.${cpfNormalizado}.0,cpf_normalizado.eq.${cpfNormalizado})`,
  })

  const response = await fetch(`${supabaseUrl}/rest/v1/${fichasTableName}?${searchParams.toString()}`, {
    headers: headers(),
    cache: "no-store",
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Erro ao calcular identificador da ficha.")
  }

  return (payload as Array<Record<string, unknown>>).length + 1
}

function toPayload(data: FichaFormValues, consultor: ConsultorSession, mode: "create" | "update") {
  const now = new Date().toISOString()
  const normalizedData = normalizeFichaValues(data)

  return {
    data_contrato: toDatabaseDate(normalizedData.dataContrato),
    prazo_servico: toDatabaseDate(normalizedData.prazoServico),
    nome_cliente: normalizedData.nomeCliente || null,
    terceiros: normalizedData.terceiros || null,
    telefones: normalizedData.telefones || null,
    endereco: normalizedData.endereco || null,
    cep: normalizedData.cep || null,
    cpf_cnpj: normalizeCpfCnpj(normalizedData.cpfCnpj) || null,
    cpf_normalizado: normalizeCpfCnpj(normalizedData.cpfCnpj),
    cnh: normalizedData.cnh || null,
    data_nascimento: toDatabaseDate(normalizedData.dataNascimento),
    data_primeira_cnh: toDatabaseDate(normalizedData.dataPrimeiraCnh),
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
    prazo_processo: toDatabaseDate(firstLine(normalizedData.prazoProcesso)),
    visto_juridico: normalizedData.vistoJuridico || null,
    assinatura_visto_juridico: normalizedData.prazoProcesso || null,
    multas_processo: normalizedData.vistoJuridico || null,
    instancia_multa: normalizedData.instanciaMulta || null,
    auto_detran: normalizedData.autoDetran || null,
    auto_renainf: normalizedData.autoRenainf || null,
    tipo_multa: normalizedData.tipoMulta || null,
    placa: normalizedData.placa || null,
    placa_proprietario: normalizedData.placaProprietario || null,
    cpf_proprietario: normalizedData.cpfProprietario || null,
    renavam: normalizedData.renavam || null,
    prazo_multa: toDatabaseDate(normalizedData.prazoMulta),
    visto_juridico_multa: normalizedData.vistoJuridicoMulta || null,
    processo_vinculado_multa: normalizedData.vistoJuridicoMulta || null,
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

function getMissingSchemaColumn(payload: Record<string, unknown>) {
  const message = String(payload.message ?? payload.error ?? "")
  const match =
    message.match(/coluna ['"]([^'"]+)['"]/i) ||
    message.match(/column ['"]([^'"]+)['"]/i) ||
    message.match(/['"]([^'"]+)['"]\s+column/i)
  return match?.[1] || ""
}

function canRetryWithoutColumn(column: string) {
  return column !== "cpf_proprietario"
}

async function parseSupabasePayload(response: Response) {
  return (await response.json()) as Record<string, unknown> | Array<Record<string, unknown>>
}

async function sendFichaMutation(url: string, method: "POST" | "PATCH", payload: Record<string, unknown>) {
  let response = await fetch(url, {
    method,
    headers: {
      ...headers(),
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  let responsePayload = await parseSupabasePayload(response)
  let retries = 0

  while (!response.ok && !Array.isArray(responsePayload) && retries < 5) {
    const missingColumn = getMissingSchemaColumn(responsePayload)

    if (!missingColumn || !(missingColumn in payload) || !canRetryWithoutColumn(missingColumn)) {
      break
    }

    delete payload[missingColumn]
    retries += 1

    response = await fetch(url, {
      method,
      headers: {
        ...headers(),
        Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    })
    responsePayload = await parseSupabasePayload(response)
  }

  return { response, responsePayload }
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
    cpfCnpj: stripNumericDecimalSuffix(String(row.cpf_cnpj ?? "")),
    cpfNormalizado: String(row.cpf_normalizado ?? ""),
    cnh: stripNumericDecimalSuffix(String(row.cnh ?? "")),
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
    prazoProcesso: String(row.assinatura_visto_juridico ?? "") || fromDatabaseDate(row.prazo_processo),
    vistoJuridico: String(row.multas_processo ?? row.visto_juridico ?? ""),
    assinaturaVistoJuridico: String(row.assinatura_visto_juridico ?? ""),
    instanciaMulta: String(row.instancia_multa ?? ""),
    autoDetran: String(row.auto_detran ?? ""),
    autoRenainf: String(row.auto_renainf ?? ""),
    tipoMulta: String(row.tipo_multa ?? ""),
    placa: String(row.placa ?? ""),
    placaProprietario: String(row.placa_proprietario ?? ""),
    cpfProprietario: String(row.cpf_proprietario ?? ""),
    renavam: String(row.renavam ?? ""),
    prazoMulta: fromDatabaseDate(row.prazo_multa),
    vistoJuridicoMulta: String(row.processo_vinculado_multa ?? row.visto_juridico_multa ?? ""),
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

  const searchParams = new URLSearchParams({
    select,
    order: "updated_at.desc.nullslast,created_at.desc.nullslast",
    or: `(cpf_cnpj.eq.${cpfNormalizado},cpf_cnpj.eq.${cpfNormalizado}.0,cpf_normalizado.eq.${cpfNormalizado})`,
  })

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
    cpfCnpj: stripNumericDecimalSuffix(String(row.cpf_cnpj ?? "")),
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
    searchParams.set(
      "or",
      `(cpf_cnpj.eq.${cpfNormalizado},cpf_cnpj.eq.${cpfNormalizado}.0,cpf_normalizado.eq.${cpfNormalizado})`
    )
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
    cpfCnpj: stripNumericDecimalSuffix(String(row.cpf_cnpj ?? "")),
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
  const sequence = await getFichaSequenceByCpf(data.cpfCnpj)
  const baseNomeCliente = stripIdentifierSuffix(data.nomeCliente)
  const identifiedData = {
    ...data,
    nomeCliente: `${baseNomeCliente} ${String(sequence).padStart(2, "0")}`.trim(),
  }
  const payload: Record<string, unknown> = toPayload(identifiedData, consultor, "create")

  const { response, responsePayload } = await sendFichaMutation(`${supabaseUrl}/rest/v1/${fichasTableName}`, "POST", payload)

  if (!response.ok || !Array.isArray(responsePayload)) {
    throw new Error(
      !Array.isArray(responsePayload) ? String(responsePayload.message || responsePayload.error || "Erro ao criar ficha.") : "Erro ao criar ficha."
    )
  }

  return fromRow(responsePayload[0])
}

export async function updateFicha(id: string, data: FichaFormValues, consultor: ConsultorSession): Promise<FichaRecord> {
  const payload: Record<string, unknown> = toPayload(data, consultor, "update")

  const { response, responsePayload } = await sendFichaMutation(`${supabaseUrl}/rest/v1/${fichasTableName}?id=eq.${id}`, "PATCH", payload)

  if (!response.ok || !Array.isArray(responsePayload)) {
    throw new Error(
      !Array.isArray(responsePayload)
        ? String(responsePayload.message || responsePayload.error || "Erro ao atualizar ficha.")
        : "Erro ao atualizar ficha."
    )
  }

  return fromRow(responsePayload[0])
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
    placaProprietario: ficha.placaProprietario,
    cpfProprietario: ficha.cpfProprietario,
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
