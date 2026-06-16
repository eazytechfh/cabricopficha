import { NextResponse } from "next/server"
import { getFichaById, updateFicha, updateFichaInExcel } from "@/lib/server-fichas"
import { canEditFicha } from "@/lib/ficha-utils"
import { createActivityLog } from "@/lib/server-activity-logs"
import type { ConsultorSession, FichaFormValues } from "@/lib/ficha-types"

type RouteContext = {
  params: Promise<{ id: string }>
}

const FIELD_LABELS: Record<keyof FichaFormValues, string> = {
  dataContrato: "Data do Contrato",
  prazoServico: "Prazo",
  nomeCliente: "Nome Completo",
  terceiros: "Terceiros",
  telefones: "Telefone(s)",
  endereco: "Endereco",
  cep: "CEP",
  cpfCnpj: "CPF/CNPJ",
  cnh: "CNH",
  dataNascimento: "Data de Nascimento",
  dataPrimeiraCnh: "Data da 1a CNH",
  nacionalidade: "Nacionalidade",
  estadoCivil: "Estado Civil",
  profissao: "Profissao",
  email: "E-mail",
  nomeConsultor: "Nome do Consultor",
  origem: "Origem",
  sne: "SNE",
  formaPagamento: "Forma de Pagamento",
  banco: "Banco",
  bancoOutro: "Outro Banco",
  valorTotal: "Valor Total",
  valorEntrada: "Valor de Entrada",
  valorRestante: "Valor Restante",
  observacaoValorRestante: "Observacao do Valor Restante",
  instanciaProcesso: "Instancia do Processo",
  tipoProcesso: "Tipo do Processo",
  numeroProcesso: "No do Processo",
  prazoProcesso: "Prazo do Processo",
  vistoJuridico: "Multas do Processo",
  assinaturaVistoJuridico: "Assinatura Visto Juridico",
  instanciaMulta: "Instancia da Multa",
  autoDetran: "Auto Detran",
  autoRenainf: "Auto Renainf",
  tipoMulta: "Tipo de Multa",
  placa: "Placa",
  placaProprietario: "Placa Proprietario",
  cpfProprietario: "CPF do Proprietario",
  renavam: "Renavam",
  prazoMulta: "Prazo da Multa",
  vistoJuridicoMulta: "Processo Vinculado da Multa",
  observacoes: "Observacoes",
}

function normalizeCompareValue(value: string) {
  return String(value || "").trim()
}

function summarizeFichaChanges(current: FichaFormValues, next: FichaFormValues) {
  const changedFields = (Object.keys(FIELD_LABELS) as Array<keyof FichaFormValues>).filter(
    (key) => normalizeCompareValue(current[key]) !== normalizeCompareValue(next[key])
  )

  if (!changedFields.length) return "Salvou a ficha sem alterar campos."

  return `Atualizou: ${changedFields.map((key) => FIELD_LABELS[key]).join(", ")}.`
}

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const ficha = await getFichaById(id)
    return NextResponse.json({ ficha })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao buscar ficha."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const { data, consultor } = (await request.json()) as {
      data: FichaFormValues
      consultor: ConsultorSession
    }

    console.log("Iniciando atualizacao da ficha", { id, consultorId: consultor.id })

    const current = await getFichaById(id)
    const allowed = canEditFicha(consultor.id, consultor.nivelAcesso, current)

    if (!allowed) {
      return NextResponse.json({ error: "Voce nao tem permissao para editar esta ficha." }, { status: 403 })
    }

    const ficha = await updateFicha(id, data, consultor)
    await createActivityLog({
      entityType: "ficha",
      entityId: ficha.id,
      entityLabel: current.nomeCliente || `Ficha ${ficha.id}`,
      action: "update",
      summary: summarizeFichaChanges(current, data),
      actorId: consultor.id,
      actorName: consultor.nome,
    })

    let excelSaved = true
    let excelError: string | undefined

    try {
      excelSaved = await updateFichaInExcel(ficha)
    } catch (error) {
      excelSaved = false
      excelError = error instanceof Error ? error.message : "Erro ao atualizar a planilha."
      console.error("Erro ao atualizar ficha no Excel:", error)
    }

    console.log("Ficha atualizada no Supabase com sucesso", {
      id: ficha.id,
      updatedAt: ficha.updatedAt,
      excelSaved,
      excelError,
    })

    return NextResponse.json({
      ficha,
      excelSaved,
      excelError,
    })
  } catch (error) {
    console.error("Erro ao atualizar ficha:", error)
    const message = error instanceof Error ? error.message : "Erro ao atualizar ficha."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
