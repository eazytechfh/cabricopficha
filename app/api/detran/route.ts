import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: Request) {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Configuração do banco indisponível.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const cpf = (searchParams.get('cpf') || '').replace(/\D/g, '');
    const cnh = (searchParams.get('cnh') || '').replace(/\D/g, '');

    if (!cpf || !cnh) {
      return NextResponse.json({ error: 'CPF e CNH são obrigatórios.' }, { status: 400 });
    }

    const params = new URLSearchParams({
      select: 'resultado_tabelas,possui_suspensao_ativa,possui_cassacao_ativa,consultor_id,created_at,infracoes_5_anos,infracoes_pontuaveis_julgadas_5_anos',
      cpf_condutor: `eq.${cpf}`,
      cnh_condutor: `eq.${cnh}`,
      order: 'created_at.desc',
    });
    const response = await fetch(`${supabaseUrl}/rest/v1/historico_consultas_cnh?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: 'no-store',
    });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error('[Detran API] Erro ao consultar histórico:', data);
      return NextResponse.json({ error: 'Não foi possível carregar o histórico da CNH.' }, { status: 502 });
    }

    return NextResponse.json({ consultas: Array.isArray(data) ? data : [] });
  } catch (error) {
    console.error('[Detran API] Erro ao consultar histórico:', error);
    return NextResponse.json({ error: 'Não foi possível carregar o histórico da CNH.' }, { status: 500 });
  }
}

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
      signal: AbortSignal.timeout(120000)
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

    // Tratamento amigável para consultas que excedam o tempo limite total
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
