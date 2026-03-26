import type { ConsultorSession, FichaRecord } from "@/lib/ficha-types"

const FICHA_UPDATE_WEBHOOK_URL =
  "https://n8n.srv953248.hstgr.cloud/webhook/99dd7b30-08f1-48cd-be4b-2e4ccd769709"

export type FichaUpdateWebhookPayload = {
  ficha: {
    id: string
    data: string
    prazoGeral: string
    nome: string
    terceiros: string
    telefone: string
    email: string
    endereco: string
    cep: string
    cpfCnpj: string
    cnh: string
    nascimento: string
    data1Cnh: string
    consultor: string
    origem: string
    sne: string
    pagamentos: {
      formaPagamento: string
      banco: string
      valorTotal: string
      valorEntrada: string
      valorRestante: string
    }
    processos: {
      instancia: string
      tipo: string
      numero: string
      prazo: string
      vistoJuridico: string
      assinaturaVistoJuridico: string
    }
    multas: {
      instancia: string
      autoDetran: string
      autoRenainf: string
      tipo: string
      placa: string
      renavam: string
      prazo: string
      vistoJuridico: string
    }
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
  evento: "ficha_atualizada"
}

export function buildFichaUpdateWebhookPayload(
  ficha: FichaRecord,
  responsavel: ConsultorSession
): FichaUpdateWebhookPayload {
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
      cep: ficha.cep,
      cpfCnpj: ficha.cpfCnpj,
      cnh: ficha.cnh,
      nascimento: ficha.dataNascimento,
      data1Cnh: ficha.dataPrimeiraCnh,
      consultor: ficha.nomeConsultor,
      origem: ficha.origem,
      sne: ficha.sne,
      pagamentos: {
        formaPagamento: ficha.formaPagamento,
        banco: ficha.banco,
        valorTotal: ficha.valorTotal,
        valorEntrada: ficha.valorEntrada,
        valorRestante: ficha.valorRestante,
      },
      processos: {
        instancia: ficha.instanciaProcesso,
        tipo: ficha.tipoProcesso,
        numero: ficha.numeroProcesso,
        prazo: ficha.prazoProcesso,
        vistoJuridico: ficha.vistoJuridico,
        assinaturaVistoJuridico: ficha.assinaturaVistoJuridico,
      },
      multas: {
        instancia: ficha.instanciaMulta,
        autoDetran: ficha.autoDetran,
        autoRenainf: ficha.autoRenainf,
        tipo: ficha.tipoMulta,
        placa: ficha.placa,
        renavam: ficha.renavam,
        prazo: ficha.prazoMulta,
        vistoJuridico: ficha.vistoJuridicoMulta,
      },
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
    evento: "ficha_atualizada",
  }
}

export async function sendFichaUpdateWebhook(payload: FichaUpdateWebhookPayload) {
  const response = await fetch(FICHA_UPDATE_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(responseText || "Erro ao enviar os dados para a automacao.")
  }

  return {
    ok: true,
    status: response.status,
    body: responseText,
  }
}
