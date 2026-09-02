# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Usuários internos da CABRICOP: consultores/vendedores e administradores. Fazem login no sistema (e-mail/senha) e usam níveis de acesso (`consultor`, `andamento`, `admin`). Não há área voltada ao cliente final — o cliente nunca acessa o app diretamente.

## Product Purpose

CRM interno para a CABRICOP, especialista em defesas de trânsito (multas, pontos na CNH, suspensão de habilitação). O consultor cadastra a "ficha" do cliente (dados pessoais, CPF/CNPJ, contatos, poderes/procuração), gera contrato e documentos (PDF) para o serviço contratado, e acompanha o andamento do processo de defesa por status/etapas ao longo do tempo. Sucesso = ficha completa, contrato/documentos corretos gerados, e status do processo mantido atualizado até a resolução.

## Positioning

Especialistas em Defesas de Trânsito — foco exclusivo em defesa administrativa/jurídica contra multas de trânsito, perda de pontos na CNH e suspensão do direito de dirigir. Não abrange outros serviços jurídicos ou administrativos fora desse escopo.

## Operating Context

- Fluxo principal: cadastro da ficha → contrato → geração de documentos (PDF) → acompanhamento do processo por status até a resolução.
- Um mesmo cliente pode ter múltiplos contratos/fichas (fusão de cadastros — "mergeFichaClients").
- Consultores possuem níveis de acesso distintos que definem permissões (quem pode editar cada ficha, `canEditFicha`).
- Existe editor de templates de documento (admin) para personalizar textos gerados em PDF.
- Auditorias técnicas periódicas do sistema são conduzidas via prompts próprios (ver `md/README.md`), cobrindo arquitetura, segurança, LGPD, multi-tenancy, performance, etc.

## Capabilities and Constraints

- Stack: Next.js (App Router), React, TypeScript, Tailwind, Radix UI, Supabase (banco/auth), deploy na Vercel.
- Multi-tenant via Row-Level Security no Supabase (padrão documentado no template `md/CLAUDE.md`, ainda não confirmado como preenchido para este projeto especificamente).
- Webhooks de criação/atualização de ficha (`ficha-create-webhook`, `ficha-update-webhook`) e endpoint de submissão externa (`submit-form`) indicam possível integração com formulário externo ou automações — origem exata não confirmada.
- LGPD é preocupação ativa (dados pessoais de clientes — CPF/CNPJ, contato, procuração).

## Brand Commitments

- Nome: CABRICOP.
- Tagline usada no app: "Especialistas em Defesas de Trânsito".
- Título de página atual: "Ficha de Venda - CABRICOP".

## Evidence on Hand

- Não há PRODUCT.md ou DESIGN.md anteriores; templates de auditoria em `md/` são genéricos (não preenchidos para este projeto).
- Nenhuma logomarca, screenshot de referência ou dado de cliente real fornecido nesta sessão — não inventar esses ativos em trabalhos futuros.

## Product Principles

- O sistema é uma ferramenta de trabalho interna (Operate), não uma vitrine — precisão, velocidade e clareza para o consultor superam qualquer apelo de marketing.
- Dados sensíveis de clientes (CPF/CNPJ, procuração) exigem tratamento cuidadoso na interface (evitar exposição desnecessária, respeitar LGPD).
- Fluxo de ficha → contrato → documento → acompanhamento de status deve permanecer coeso e previsível entre as telas.
- Permissões por nível de acesso (consultor/andamento/admin) devem ser respeitadas visualmente e funcionalmente em qualquer nova tela.

## Accessibility & Inclusion

Nenhum requisito específico de acessibilidade foi confirmado pelo usuário nesta sessão.
