import { NextResponse } from 'next/server'

const N8N_WEBHOOK_URL = 'https://n8n.srv953248.hstgr.cloud/webhook/7a2f5a7c-3e8b-4266-bfb9-2ecddf843852'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    console.log('[v0] Dados recebidos:', JSON.stringify(data, null, 2))
    console.log('[v0] Enviando para webhook:', N8N_WEBHOOK_URL)

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    })

    console.log('[v0] Status da resposta:', response.status)
    const responseText = await response.text()
    console.log('[v0] Resposta do webhook:', responseText)

    if (!response.ok) {
      console.log('[v0] Erro - status não OK')
      return NextResponse.json(
        { error: `Erro do webhook: ${response.status} - ${responseText}` },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true, message: 'Dados salvos com sucesso!' })
  } catch (error) {
    console.error('[v0] Erro ao processar formulário:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json(
      { error: `Erro ao salvar dados: ${errorMessage}` },
      { status: 500 }
    )
  }
}
