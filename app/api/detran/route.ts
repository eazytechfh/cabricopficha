import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. Captura os dados enviados pelo botão do formulário
    const body = await request.json();
    const { cpf, cnh, uf, eh_pgu, consultor_id } = body;

    // Validação básica de segurança
    if (!cpf || !cnh) {
      return NextResponse.json(
        { status: 'erro', details: 'CPF e CNH são obrigatórios para a consulta.' },
        { status: 400 }
      );
    }

    // 2. Puxa o IP da sua VPS Contabo das variáveis de ambiente da Vercel
    const ipContabo = process.env.CONTABO_VPS_IP;

    if (!ipContabo) {
      console.error('[Detran API] Erro: A variável CONTABO_VPS_IP não está configurada na Vercel.');
      return NextResponse.json(
        { status: 'erro', details: 'Configuração do servidor indisponível (variável de ambiente ausente).' },
        { status: 500 }
      );
    }

    console.log(`[Next.js API] Encaminhando CPF ${cpf} para o robô na Contabo (${ipContabo}:8080)...`);

    // 3. Faz o disparo direto para a porta 8080 isolada da sua VPS Contabo
    const response = await fetch(`http://${ipContabo}:8080/v1/consultar-detran`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf, cnh, uf, eh_pgu, consultor_id }),
      // Configura um timeout de 60 segundos (o reCAPTCHA v2 do Detran pode levar de 15 a 45s)
      signal: AbortSignal.timeout(60000)
    });

    // 4. Captura a resposta vinda da VPS
    const data = await response.json().catch(() => null);

    if (!response.ok || !data || data.status === 'erro') {
      return NextResponse.json(
        { status: 'erro', details: data?.details || 'A VPS Contabo encontrou um erro ao processar o navegador.' },
        { status: response.status || 500 }
      );
    }

    // Retorna o sucesso para a interface do consultor
    return NextResponse.json(data);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno ao consultar o Detran.';
    console.error('[Next.js Detran API Error]:', message);

    // Tratamento amigável para caso a VPS demore mais de 60 segundos para responder
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { status: 'erro', details: 'O portal do Detran demorou muito para responder. Tente novamente em instantes.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { status: 'erro', details: message },
      { status: 500 }
    );
  }
}
