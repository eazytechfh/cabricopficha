import { mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import * as XLSX from "xlsx"
import type { ConsultorSession, FichaDuplicateMatch, FichaFormValues, FichaListItem, FichaRecord } from "@/lib/ficha-types"
import { normalizeCpfCnpj, normalizeFichaValues, parseCurrency, stripNumericDecimalSuffix } from "@/lib/ficha-utils"
import { buildAccentInsensitivePattern } from "@/lib/search-utils"
import { readAddressFields } from "@/lib/address-fields"
import { calculatePrazoServico } from "@/lib/prazo-servico"
import { parsePaymentEntries, reconcilePaymentValues, serializePaymentEntries, validatePaymentEntries } from "@/lib/payment-details"
import { findDuplicateReasons } from "@/lib/ficha-duplicates"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const fichasTableName = "fichas_venda"
const excelBaseDir = process.env.VERCEL ? path.join(tmpdir(), "cabricopficha") : path.join(process.cwd(), "storage")
const excelPath = path.join(excelBaseDir, "fichas.xlsx")
const VENCIDA_SENTINEL_DATE = "1900-01-01"
const REVISAO_ATO_SENTINEL_DATE = "1900-01-02"
const AG_PENALIDADE_SENTINEL_DATE = "1900-01-03"

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
  if (normalizedValue === "AG Penalidade") {
    return AG_PENALIDADE_SENTINEL_DATE
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue) ? normalizedValue : null
}

function fromDatabaseDate(value: unknown) {
  const normalizedValue = String(value ?? "")
  if (normalizedValue === VENCIDA_SENTINEL_DATE) return "Vencida"
  if (normalizedValue === REVISAO_ATO_SENTINEL_DATE) return "Revisão de Ato"
  if (normalizedValue === AG_PENALIDADE_SENTINEL_DATE) return "AG Penalidade"
  return normalizedValue
}

function firstLine(value: string) {
  return (value || "").split("\n")[0] || ""
}

function stripIdentifierSuffix(value: string) {
  return (value || "").trim().replace(/\s+\d{1,2}$/, "")
}

async function getFichaSequenceByClient(cpf: string, nomeCliente: string) {
  ensureSupabaseConfig()

  const cpfNormalizado = normalizeCpfCnpj(cpf)
  const searchParams = new URLSearchParams({
    select: "numero_ficha",
    order: "numero_ficha.desc",
    limit: "1",
  })

  if (cpfNormalizado) {
    searchParams.set("or", `(cpf_cnpj.eq.${cpfNormalizado},cpf_cnpj.eq.${cpfNormalizado}.0,cpf_normalizado.eq.${cpfNormalizado})`)
  } else {
    const baseName = stripIdentifierSuffix(nomeCliente)
    if (!baseName) return 1
    searchParams.set("nome_cliente", `imatch.${buildAccentInsensitivePattern(baseName)}`)
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${fichasTableName}?${searchParams.toString()}`, {
    headers: headers(),
    cache: "no-store",
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Erro ao calcular identificador da ficha.")
  }

  const rows = payload as Array<Record<string, unknown>>
  const highestSequence = Number(rows[0]?.numero_ficha ?? 0)
  return highestSequence + 1
}

function toPayload(data: FichaFormValues, consultor: ConsultorSession, mode: "create" | "update") {
  const now = new Date().toISOString()
  const normalizedData = normalizeFichaValues(data)
  const payments = parsePaymentEntries(normalizedData.pagamentos)
  const paymentError = validatePaymentEntries(normalizedData.valorTotal, payments)
  if (paymentError && (mode === "create" || reconcilePaymentValues(normalizedData.valorTotal, payments).exceedsTotal)) {
    throw new Error(paymentError)
  }

  return {
    data_contrato: toDatabaseDate(normalizedData.dataContrato),
    prazo_servico: toDatabaseDate(normalizedData.prazoServico),
    nome_cliente: normalizedData.nomeCliente || null,
    terceiros: normalizedData.terceiros || null,
    telefones: normalizedData.telefones || null,
    endereco: normalizedData.endereco || null,
    numero_endereco: normalizedData.numeroEndereco || null,
    complemento_endereco: normalizedData.complementoEndereco || null,
    cep: normalizedData.cep || null,
    municipio: normalizedData.municipio || null,
    uf: normalizedData.uf || null,
    cpf_cnpj: normalizeCpfCnpj(normalizedData.cpfCnpj) || null,
    cpf_normalizado: normalizeCpfCnpj(normalizedData.cpfCnpj),
    cnh: normalizedData.cnh || null,
    data_nascimento: toDatabaseDate(normalizedData.dataNascimento),
    data_primeira_cnh: toDatabaseDate(normalizedData.dataPrimeiraCnh),
    nacionalidade: normalizedData.nacionalidade || null,
    estado_civil: normalizedData.estadoCivil || null,
    profissao: normalizedData.profissao || null,
    email: normalizedData.email || null,
    nome_consultor: normalizedData.nomeConsultor || consultor.nome,
    origem: normalizedData.origem || null,
    sne: normalizedData.sne || null,
    forma_pagamento: normalizedData.formaPagamento || null,
    banco: normalizedData.banco || null,
    pagamentos: payments,
    valor_total: normalizedData.valorTotal || null,
    valor_entrada: normalizedData.valorEntrada || null,
    valor_restante: normalizedData.valorRestante || null,
    observacao_valor_restante: parseCurrency(normalizedData.valorRestante) > 0 ? normalizedData.observacaoValorRestante || null : null,
    instancia_processo: normalizedData.instanciaProcesso || null,
    tipo_processo: normalizedData.tipoProcesso || null,
    numero_processo: normalizedData.numeroProcesso || null,
    prazo_processo: toDatabaseDate(firstLine(normalizedData.prazoProcesso)),
    prazos_processo_texto: normalizedData.prazoProcesso || null,
    visto_juridico: normalizedData.vistoJuridico || null,
    assinatura_visto_juridico: normalizedData.prazoProcesso || null,
    tipo_outro_servico: normalizedData.tipoOutroServico || null,
    poderes_outro_servico: normalizedData.poderesOutroServico || null,
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
    prazos_multa_texto: normalizedData.prazoMulta || null,
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
  return !["prazos_processo_texto", "prazos_multa_texto", "cpf_proprietario"].includes(column)
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
  const address = readAddressFields(row)
  const prazoProcesso = String(row.prazos_processo_texto ?? row.assinatura_visto_juridico ?? "") || fromDatabaseDate(row.prazo_processo)
  const prazoMulta = String(row.prazos_multa_texto ?? "") || fromDatabaseDate(row.prazo_multa)
  const pagamentos = parsePaymentEntries(row.pagamentos, {
    formaPagamento: String(row.forma_pagamento ?? ""),
    banco: String(row.banco ?? ""),
    valorEntrada: String(row.valor_entrada ?? ""),
  })

  return {
    id: String(row.id ?? ""),
    numeroFicha: Number(row.numero_ficha ?? 0),
    dataContrato: String(row.data_contrato ?? ""),
    prazoServico: calculatePrazoServico(prazoProcesso, prazoMulta),
    nomeCliente: String(row.nome_cliente ?? ""),
    terceiros: String(row.terceiros ?? ""),
    telefones: String(row.telefones ?? ""),
    endereco: address.endereco,
    numeroEndereco: address.numeroEndereco,
    complementoEndereco: address.complementoEndereco,
    cep: String(row.cep ?? ""),
    municipio: String(row.municipio ?? ""),
    uf: String(row.uf ?? ""),
    cpfCnpj: stripNumericDecimalSuffix(String(row.cpf_cnpj ?? "")),
    cpfNormalizado: String(row.cpf_normalizado ?? ""),
    cnh: stripNumericDecimalSuffix(String(row.cnh ?? "")),
    dataNascimento: String(row.data_nascimento ?? ""),
    dataPrimeiraCnh: String(row.data_primeira_cnh ?? ""),
    nacionalidade: String(row.nacionalidade ?? "Brasileira"),
    estadoCivil: String(row.estado_civil ?? ""),
    profissao: String(row.profissao ?? ""),
    email: String(row.email ?? ""),
    nomeConsultor: String(row.nome_consultor ?? ""),
    origem: String(row.origem ?? ""),
    sne: String(row.sne ?? ""),
    formaPagamento: String(row.forma_pagamento ?? ""),
    banco: String(row.banco ?? ""),
    bancoOutro: "",
    pagamentos: serializePaymentEntries(pagamentos),
    valorTotal: String(row.valor_total ?? ""),
    valorEntrada: String(row.valor_entrada ?? ""),
    valorRestante: String(row.valor_restante ?? ""),
    observacaoValorRestante: String(row.observacao_valor_restante ?? ""),
    instanciaProcesso: String(row.instancia_processo ?? ""),
    tipoProcesso: String(row.tipo_processo ?? ""),
    numeroProcesso: String(row.numero_processo ?? ""),
    prazoProcesso,
    vistoJuridico: String(row.multas_processo ?? row.visto_juridico ?? ""),
    assinaturaVistoJuridico: String(row.assinatura_visto_juridico ?? ""),
    tipoOutroServico: String(row.tipo_outro_servico ?? ""),
    poderesOutroServico: String(row.poderes_outro_servico ?? ""),
    instanciaMulta: String(row.instancia_multa ?? ""),
    autoDetran: String(row.auto_detran ?? ""),
    autoRenainf: String(row.auto_renainf ?? ""),
    tipoMulta: String(row.tipo_multa ?? ""),
    placa: String(row.placa ?? ""),
    placaProprietario: String(row.placa_proprietario ?? ""),
    cpfProprietario: String(row.cpf_proprietario ?? ""),
    renavam: String(row.renavam ?? ""),
    prazoMulta,
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
    "numero_ficha",
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
    numeroFicha: Number(row.numero_ficha ?? 0),
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
    "numero_ficha",
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
    order: "updated_at.desc.nullslast,created_at.desc.nullslast,id.desc",
  })

  if (cpfNormalizado) {
    searchParams.set(
      "or",
      `(cpf_cnpj.eq.${cpfNormalizado},cpf_cnpj.eq.${cpfNormalizado}.0,cpf_normalizado.eq.${cpfNormalizado})`
    )
  }

  if (nome) {
    searchParams.set("nome_cliente", `imatch.${buildAccentInsensitivePattern(nome)}`)
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
    numeroFicha: Number(row.numero_ficha ?? 0),
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

function safeFilterValue(value: string) {
  return String(value || "").replace(/[(),*]/g, "").trim()
}

export async function findPotentialDuplicateFichas(data: FichaFormValues): Promise<FichaDuplicateMatch[]> {
  ensureSupabaseConfig()

  const filters: string[] = []
  const cpf = normalizeCpfCnpj(data.cpfCnpj)
  const cnh = safeFilterValue(data.cnh).replace(/\D/g, "")
  const email = safeFilterValue(data.email).toLowerCase()
  const name = safeFilterValue(stripIdentifierSuffix(data.nomeCliente))
  const phone = (data.telefones.match(/\d/g) || []).join("").slice(-4)

  if (cpf) filters.push(`cpf_normalizado.eq.${cpf}`, `cpf_cnpj.eq.${cpf}`, `cpf_cnpj.eq.${cpf}.0`)
  if (cnh) filters.push(`cnh.eq.${cnh}`, `cnh.eq.${cnh}.0`)
  if (email) filters.push(`email.ilike.${email}`)
  if (name) filters.push(`nome_cliente.imatch.${buildAccentInsensitivePattern(name)}`)
  if (phone.length === 4) filters.push(`telefones.ilike.*${phone}*`)

  if (!filters.length) return []

  const searchParams = new URLSearchParams({
    select: "*",
    or: `(${filters.join(",")})`,
    order: "updated_at.desc.nullslast,created_at.desc.nullslast",
    limit: "200",
  })
  const response = await fetch(`${supabaseUrl}/rest/v1/${fichasTableName}?${searchParams.toString()}`, {
    headers: headers(),
    cache: "no-store",
  })
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload.message || payload.error || "Erro ao verificar cadastros semelhantes.")
  }

  return (payload as Array<Record<string, unknown>>)
    .map(fromRow)
    .map((candidate) => ({ candidate, reasons: findDuplicateReasons(data, candidate) }))
    .filter(({ reasons }) => reasons.length > 0)
    .map(({ candidate, reasons }) => ({
      id: candidate.id,
      nomeCliente: candidate.nomeCliente,
      cpfCnpj: candidate.cpfCnpj,
      telefones: candidate.telefones,
      numeroEndereco: candidate.numeroEndereco,
      email: candidate.email,
      cnh: candidate.cnh,
      dataContrato: candidate.dataContrato,
      nomeConsultor: candidate.nomeConsultor,
      reasons,
    }))
}

export async function deleteFicha(id: string) {
  ensureSupabaseConfig()
  const response = await fetch(`${supabaseUrl}/rest/v1/${fichasTableName}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: headers(),
    cache: "no-store",
  })
  if (!response.ok) {
    const payload = await response.json()
    throw new Error(payload.message || payload.error || "Erro ao excluir ficha.")
  }
}

export async function mergeFichaClients(primaryFichaId: string, fichaIds: string[], consultor: ConsultorSession) {
  ensureSupabaseConfig()
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/merge_ficha_clients`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      primary_ficha_id: Number(primaryFichaId),
      selected_ficha_ids: fichaIds.map(Number),
      actor_id_value: consultor.id,
      actor_name_value: consultor.nome,
    }),
    cache: "no-store",
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || "Não foi possível juntar os cadastros.")
  }
  return Number(payload ?? 0)
}

export async function createFicha(data: FichaFormValues, consultor: ConsultorSession): Promise<FichaRecord> {
  const sequence = await getFichaSequenceByClient(data.cpfCnpj, data.nomeCliente)
  const baseNomeCliente = stripIdentifierSuffix(data.nomeCliente)
  const identifiedData = {
    ...data,
    nomeCliente: baseNomeCliente,
  }
  const payload: Record<string, unknown> = toPayload(identifiedData, consultor, "create")
  payload.numero_ficha = sequence

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
    numeroFicha: ficha.numeroFicha,
    data: ficha.dataContrato,
    prazoGeral: ficha.prazoServico,
    nome: ficha.nomeCliente,
    cpfCnpj: ficha.cpfCnpj,
    cpfNormalizado: ficha.cpfNormalizado,
    telefone: ficha.telefones,
    email: ficha.email,
    endereco: ficha.endereco,
    numeroEndereco: ficha.numeroEndereco,
    complementoEndereco: ficha.complementoEndereco,
    nacionalidade: ficha.nacionalidade,
    estadoCivil: ficha.estadoCivil,
    profissao: ficha.profissao,
    consultor: ficha.nomeConsultor,
    origem: ficha.origem,
    createdAt: ficha.createdAt,
    updatedAt: ficha.updatedAt,
    createdByConsultorId: ficha.createdByConsultorId,
    updatedByConsultorId: ficha.updatedByConsultorId,
    formaPagamento: ficha.formaPagamento,
    banco: ficha.banco,
    pagamentos: ficha.pagamentos,
    valorTotal: ficha.valorTotal,
    valorEntrada: ficha.valorEntrada,
    valorRestante: ficha.valorRestante,
    observacaoValorRestante: ficha.observacaoValorRestante,
    tipoProcesso: ficha.tipoProcesso,
    numeroProcesso: ficha.numeroProcesso,
    instanciaProcesso: ficha.instanciaProcesso,
    tipoOutroServico: ficha.tipoOutroServico,
    poderesOutroServico: ficha.poderesOutroServico,
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

export async function deleteFichaFromExcel(id: string) {
  const { rows } = await readWorkbookRows()
  await writeWorkbookRows(rows.filter((row) => String(row.id ?? "") !== id))
  return true
}
