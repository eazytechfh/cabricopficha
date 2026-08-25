import type { ConsultorSession, FichaRecord } from "@/lib/ficha-types"
import { splitSerializedEntries } from "@/lib/ficha-utils"
import { parsePaymentEntries } from "@/lib/payment-details"

const FICHA_CREATE_WEBHOOK_URL =
  "https://n8n.cabricop.com.br/webhook/afc80212-c243-4584-b009-b3cc73a4d217"
const FICHA_UPDATE_WEBHOOK_URL =
  "https://n8n.cabricop.com.br/webhook/c58b2323-ea91-4569-8401-d69ad37b656a"

type MultaWebhookItem = {
  instancia: string
  autoDetran: string
  autoRenainf: string
  tipo: string
  placa: string
  placaProprietario: string
  cpfProprietario: string
  renavam: string
  prazo: string
  processoVinculado: string
}

type FichaWebhookPayloadBase = {
  ficha: {
    id: string
    data: string
    prazoGeral: string
    nome: string
    terceiros: string
    telefone: string
    email: string
    endereco: string
    numeroEndereco: string
    complementoEndereco: string
    cep: string
    cpfCnpj: string
    cnh: string
    nascimento: string
    data1Cnh: string
    nacionalidade: string
    estadoCivil: string
    profissao: string
    consultor: string
    origem: string
    sne: string
    pagamentos: {
      itens: Array<{ formaPagamento: string; banco: string; valor: string }>
      formaPagamento: string
      banco: string
      valorTotal: string
      valorEntrada: string
      valorRestante: string
      observacaoValorRestante: string
    }
    processos: {
      instancia: string
      tipo: string
      numero: string
      multasProcesso: string
      prazo: string
      assinaturaVistoJuridico: string
    }
    outrosServicos: {
      tipoServico: string
      poderes: string
    }
    multas: MultaWebhookItem
    multasLista: MultaWebhookItem[]
    observacoes: string
    createdAt: string
    updatedAt: string
    createdByConsultorId: string
    updatedByConsultorId: string
  }
  responsavel: {
    id: string
    nome: string
    nivel: string
  }
  origem: "sistema_ficha_venda"
}

export type FichaCreateWebhookPayload = FichaWebhookPayloadBase & {
  evento: "ficha_criada"
}

export type FichaUpdateWebhookPayload = FichaWebhookPayloadBase & {
  evento: "ficha_atualizada"
}

function getMultasLista(ficha: FichaRecord): MultaWebhookItem[] {
  const instancias = splitSerializedEntries(ficha.instanciaMulta)
  const autosDetran = splitSerializedEntries(ficha.autoDetran)
  const autosRenainf = splitSerializedEntries(ficha.autoRenainf)
  const tipos = splitSerializedEntries(ficha.tipoMulta)
  const placas = splitSerializedEntries(ficha.placa)
  const placasProprietario = splitSerializedEntries(ficha.placaProprietario)
  const cpfsProprietario = splitSerializedEntries(ficha.cpfProprietario)
  const renavams = splitSerializedEntries(ficha.renavam)
  const prazos = splitSerializedEntries(ficha.prazoMulta)
  const processosVinculados = splitSerializedEntries(ficha.vistoJuridicoMulta)

  const maxLength = Math.max(
    instancias.length,
    autosDetran.length,
    autosRenainf.length,
    tipos.length,
    placas.length,
    placasProprietario.length,
    cpfsProprietario.length,
    renavams.length,
    prazos.length,
    processosVinculados.length,
    1
  )

  return Array.from({ length: maxLength }, (_, index) => ({
    instancia: instancias[index] || "",
    autoDetran: autosDetran[index] || "",
    autoRenainf: autosRenainf[index] || "",
    tipo: tipos[index] || "",
    placa: placas[index] || "",
    placaProprietario: placasProprietario[index] || "sim",
    cpfProprietario: cpfsProprietario[index] || "",
    renavam: renavams[index] || "",
    prazo: prazos[index] || "",
    processoVinculado: processosVinculados[index] || "",
  }))
}

function buildFichaWebhookBase(ficha: FichaRecord, responsavel: ConsultorSession): FichaWebhookPayloadBase {
  const multasLista = getMultasLista(ficha)

  return {
    ficha: {
      id: ficha.id,
      data: ficha.dataContrato,
      prazoGeral: ficha.prazoServico,
      nome: ficha.nomeCliente,
      terceiros: ficha.terceiros,
      telefone: ficha.telefones,
      email: ficha.email,
      endereco: ficha.endereco,
      numeroEndereco: ficha.numeroEndereco,
      complementoEndereco: ficha.complementoEndereco,
      cep: ficha.cep,
      cpfCnpj: ficha.cpfCnpj,
      cnh: ficha.cnh,
      nascimento: ficha.dataNascimento,
      data1Cnh: ficha.dataPrimeiraCnh,
      nacionalidade: ficha.nacionalidade,
      estadoCivil: ficha.estadoCivil,
      profissao: ficha.profissao,
      consultor: ficha.nomeConsultor,
      origem: ficha.origem,
      sne: ficha.sne,
      pagamentos: {
        itens: parsePaymentEntries(ficha.pagamentos, ficha).map(({ formaPagamento, banco, valor }) => ({ formaPagamento, banco, valor })),
        formaPagamento: ficha.formaPagamento,
        banco: ficha.banco,
        valorTotal: ficha.valorTotal,
        valorEntrada: ficha.valorEntrada,
        valorRestante: ficha.valorRestante,
        observacaoValorRestante: ficha.observacaoValorRestante,
      },
      processos: {
        instancia: ficha.instanciaProcesso,
        tipo: ficha.tipoProcesso,
        numero: ficha.numeroProcesso,
        multasProcesso: ficha.vistoJuridico,
        prazo: ficha.prazoProcesso,
        assinaturaVistoJuridico: "",
      },
      outrosServicos: {
        tipoServico: ficha.tipoOutroServico,
        poderes: ficha.poderesOutroServico,
      },
      multas: multasLista[0] || {
        instancia: "",
        autoDetran: "",
        autoRenainf: "",
        tipo: "",
        placa: "",
        placaProprietario: "sim",
        cpfProprietario: "",
        renavam: "",
        prazo: "",
        processoVinculado: "",
      },
      multasLista,
      observacoes: ficha.observacoes,
      createdAt: ficha.createdAt,
      updatedAt: ficha.updatedAt,
      createdByConsultorId: ficha.createdByConsultorId,
      updatedByConsultorId: ficha.updatedByConsultorId,
    },
    responsavel: {
      id: responsavel.id,
      nome: responsavel.nome,
      nivel: responsavel.nivelAcesso,
    },
    origem: "sistema_ficha_venda",
  }
}

export function buildFichaCreateWebhookPayload(
  ficha: FichaRecord,
  responsavel: ConsultorSession
): FichaCreateWebhookPayload {
  return {
    ...buildFichaWebhookBase(ficha, responsavel),
    evento: "ficha_criada",
  }
}

export function buildFichaUpdateWebhookPayload(
  ficha: FichaRecord,
  responsavel: ConsultorSession
): FichaUpdateWebhookPayload {
  return {
    ...buildFichaWebhookBase(ficha, responsavel),
    evento: "ficha_atualizada",
  }
}

async function postWebhook(url: string, payload: FichaCreateWebhookPayload | FichaUpdateWebhookPayload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(responseText || `Erro ao enviar webhook: ${response.status}`)
  }

  return {
    ok: true,
    status: response.status,
    body: responseText,
  }
}

export async function sendFichaCreateWebhook(payload: FichaCreateWebhookPayload) {
  return postWebhook(FICHA_CREATE_WEBHOOK_URL, payload)
}

export async function sendFichaUpdateWebhook(payload: FichaUpdateWebhookPayload) {
  return postWebhook(FICHA_UPDATE_WEBHOOK_URL, payload)
}
