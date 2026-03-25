import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const tableName = process.env.SUPABASE_TABLE_NAME || 'fichas_venda'

export async function POST(request: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Variaveis do Supabase nao configuradas no servidor.' },
      { status: 500 }
    )
  }

  try {
    const data = await request.json()
    const payload = {
      data_contrato: data.dataContrato || null,
      prazo_servico: data.prazoServico || null,
      nome_cliente: data.nomeCliente || null,
      terceiros: data.terceiros || null,
      telefones: data.telefones || null,
      endereco: data.endereco || null,
      cep: data.cep || null,
      cpf_cnpj: data.cpfCnpj || null,
      cnh: data.cnh || null,
      data_nascimento: data.dataNascimento || null,
      data_primeira_cnh: data.dataPrimeiraCnh || null,
      email: data.email || null,
      nome_consultor: data.nomeConsultor || null,
      origem: data.origem || null,
      sne: data.sne || null,
      forma_pagamento: data.formaPagamento || null,
      banco: data.banco || null,
      valor_total: data.valorTotal || null,
      valor_entrada: data.valorEntrada || null,
      valor_restante: data.valorRestante || null,
      instancia_processo: data.instanciaProcesso || null,
      tipo_processo: data.tipoProcesso || null,
      numero_processo: data.numeroProcesso || null,
      prazo_processo: data.prazoProcesso || null,
      visto_juridico: data.vistoJuridico || null,
      assinatura_visto_juridico: data.assinaturaVistoJuridico || null,
      instancia_multa: data.instanciaMulta || null,
      auto_detran: data.autoDetran || null,
      auto_renainf: data.autoRenainf || null,
      tipo_multa: data.tipoMulta || null,
      placa: data.placa || null,
      renavam: data.renavam || null,
      prazo_multa: data.prazoMulta || null,
      visto_juridico_multa: data.vistoJuridicoMulta || null,
      observacoes: data.observacoes || null,
      data_envio: data.dataEnvio || new Date().toISOString(),
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[supabase] erro ao inserir registro:', errorText)

      return NextResponse.json(
        { error: `Erro ao salvar no Supabase: ${response.status} - ${errorText}` },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true, message: 'Dados salvos com sucesso!' })
  } catch (error) {
    console.error('[supabase] erro ao processar formulario:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'

    return NextResponse.json(
      { error: `Erro ao salvar dados: ${errorMessage}` },
      { status: 500 }
    )
  }
}


