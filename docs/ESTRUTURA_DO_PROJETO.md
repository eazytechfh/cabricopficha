# Estrutura do projeto CABRICOP Ficha

> Documento gerado a partir do repositorio em 01/10/2026. Descreve a estrutura observada no codigo, sem presumir infraestrutura externa nao versionada.

## Visao geral

O projeto e uma aplicacao web interna para cadastrar, consultar, editar, agrupar e excluir fichas de venda da CABRICOP. Tambem gera PDFs, mantem modelos de contrato/procuracao, registra atividades, administra usuarios e envia webhooks de criacao e atualizacao.

A aplicacao usa o App Router do Next.js. A interface React chama Route Handlers em `app/api`; esses handlers usam modulos `lib/server-*.ts` para acessar Supabase Auth e PostgreSQL pela API REST. O cadastro de fichas tambem e espelhado em `storage/fichas.xlsx` no ambiente local ou em um diretorio temporario na Vercel.

```text
Navegador (React)
  -> /api/* (Next.js Route Handlers)
    -> lib/server-*.ts
      -> Supabase Auth + REST/PostgreSQL
      -> planilha XLSX local/temporaria
  -> geracao de PDF no cliente
  -> ViaCEP para preenchimento de endereco
  -> webhooks externos por rotas proxy do servidor
```

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16.2, App Router |
| Interface | React 19.2, TypeScript 5.7 |
| Estilos | Tailwind CSS 4, componentes Radix UI/shadcn |
| Formularios | React Hook Form e Zod |
| Banco e autenticacao | Supabase (PostgreSQL, REST e Auth) |
| PDF | jsPDF e html2canvas-pro |
| Planilhas | SheetJS (`xlsx`) |
| Graficos/UI auxiliar | Recharts, Lucide, Sonner |
| Analytics | Vercel Analytics |
| Testes | arquivos Node Test Runner (`*.test.mjs`) |

## Mapa de diretorios

```text
.
|-- app/                     # paginas, layout, CSS global e API server-side
|   |-- api/                 # Route Handlers HTTP
|   |-- globals.css
|   |-- layout.tsx           # metadados, fontes, analytics e shell HTML
|   `-- page.tsx             # monta FichasWorkspace
|-- components/              # telas, formularios, PDFs e biblioteca visual
|   `-- ui/                  # componentes reutilizaveis baseados em Radix UI
|-- hooks/                   # hooks compartilhados de viewport e notificacao
|-- lib/                     # dominio, clientes HTTP, servicos server-side e testes
|-- public/                  # logos, favicons e imagens estaticas
|-- styles/                  # folha global adicional/legada
|-- supabase/                # schema-base e migrations SQL
|   `-- migrations/          # migration adicional no formato timestamp
|-- types/                   # declaracoes TypeScript locais
|-- docs/                    # planos, auditorias e esta documentacao
|-- md/                      # documentacao de referencia/arquitetura anterior
|-- package.json             # scripts e dependencias
|-- next.config.mjs          # configuracao do Next.js
|-- tsconfig.json            # TypeScript estrito e alias @/*
`-- .env.example             # nomes das variaveis de ambiente
```

Diretorios gerados e nao pertencentes ao codigo-fonte: `.next/` e `node_modules/`. O arquivo `storage/fichas.xlsx` pode ser criado em execucao local e nao aparece no inventario atual.

## Entrada da aplicacao

- `app/layout.tsx`: define idioma `pt-BR`, fontes Geist, metadados, icones e Vercel Analytics.
- `app/page.tsx`: unica pagina versionada; renderiza `components/fichas-workspace.tsx`.
- `components/fichas-workspace.tsx`: orquestra login, pesquisa, cadastro, consulta, edicao, exclusao, uniao de cadastros, timeline, usuarios e modelos de documentos.
- `components/ficha-form.tsx`: formulario principal e integracao cliente com ViaCEP.
- `components/ficha-read-view.tsx`: visualizacao estruturada de uma ficha.
- `components/FichaPdf.tsx` e `components/DocumentTemplatePdf.tsx`: conteudo usado na geracao dos PDFs.

`components/sales-form.tsx` e `/api/submit-form` formam um fluxo alternativo/legado de submissao direta. A pagina principal atual nao importa `SalesForm`.

## Camada `lib`

### Dominio de fichas

- `ficha-types.ts`: tipos centrais (`FichaFormValues`, `FichaRecord`, sessao, logs e duplicidades).
- `ficha-utils.ts`: normalizacao, conversao entre formulario/registro e regras de permissao de edicao.
- `ficha-options.ts`, `prazo-servico.ts`, `ficha-date.ts`: opcoes e regras de datas/prazos.
- `payment-details.ts` e `payment-validation-context.ts`: pagamentos multiplos, conciliacao e validacao de valores.
- `ficha-duplicates.ts`, `ficha-client-name.ts`, `search-utils.ts`: deteccao de duplicidade e busca normalizada.
- `ficha-owner.ts`, `address-fields.ts`: compatibilidade e normalizacao de proprietario/endereco.
- `ficha-change-log.ts`: compara alteracoes para a auditoria.

### Clientes do navegador

- `fichas-api.ts`: login e chamadas CRUD/merge/duplicidade para `/api`.
- `fichaCreateService.ts` e `fichaService.ts`: fluxos compostos de criacao/atualizacao, PDF e webhook.
- `activity-log-client.ts`: leitura/escrita da timeline.
- `document-template-client.ts`: leitura e atualizacao de modelos.
- `ficha-pdf-client.tsx`, `document-pdf-client.tsx`, `generatePdf.ts`: montagem e download de PDFs.

### Servicos do servidor

- `server-fichas.ts`: mapeia camelCase para snake_case, executa CRUD e RPC, detecta duplicados e mantem a planilha XLSX.
- `server-access.ts`: integra Supabase Auth e `user_profiles`; cria, altera, remove e autentica usuarios.
- `server-document-templates.ts`: persiste modelos em `document_templates` e registra alteracoes.
- `server-activity-logs.ts`: persiste e consulta `activity_logs`.
- `webhookService.ts`: constroi os payloads enviados pelas rotas de webhook.

## API HTTP

| Rota | Metodos | Responsabilidade |
|---|---|---|
| `/api/auth/login` | POST | Autentica por e-mail/senha no Supabase e devolve o perfil ativo. |
| `/api/auth/forgot-password` | POST | Solicita e-mail de recuperacao no Supabase Auth. |
| `/api/auth/reset-password` | POST | Troca senha por token ou por e-mail + telefone. |
| `/api/fichas` | GET, POST | Pesquisa por CPF/nome e cria ficha, com verificacao de duplicidade. |
| `/api/fichas/[id]` | GET, PATCH, DELETE | Consulta, altera ou exclui uma ficha; atualiza XLSX e auditoria. |
| `/api/fichas/duplicates` | POST | Retorna possiveis duplicidades. |
| `/api/fichas/merge` | POST | Agrupa fichas via funcao SQL; exclusivo para administrador. |
| `/api/activity-logs` | POST | Lista logs ou consulta o log mais recente conforme a acao enviada. |
| `/api/access-codes` | POST | Lista ou cria usuarios; mantem o nome historico da rota. |
| `/api/access-codes/[id]` | PATCH, DELETE | Atualiza ou remove usuario do Auth e perfil. |
| `/api/document-templates` | POST | Le ou atualiza modelos; atualizacao exige administrador. |
| `/api/ficha-create-webhook` | POST | Encaminha evento de ficha criada. |
| `/api/ficha-update-webhook` | POST | Encaminha evento de ficha atualizada. |
| `/api/submit-form` | POST | Fluxo legado: insere diretamente na tabela configurada. |

As rotas usam `POST` com um campo `action` em alguns casos, em vez de endpoints REST separados.

## Fluxos principais

### Autenticacao

1. A interface envia e-mail e senha a `/api/auth/login`.
2. `server-access.ts` chama `/auth/v1/token?grant_type=password`.
3. O perfil correspondente e lido em `user_profiles`.
4. Usuarios inativos sao rejeitados; o ultimo login e atualizado.
5. A sessao retornada e mantida pela interface. Nao foi encontrado middleware nem cookie de sessao server-side no repositorio.

### Criacao de ficha

1. O formulario normaliza campos e consulta possiveis duplicidades.
2. Sem resolucao explicita, duplicidades retornam HTTP 409.
3. A API grava `fichas_venda`; o trigger do banco atribui `numero_ficha`.
4. O servidor tenta atualizar a planilha XLSX.
5. O navegador gera e baixa o PDF.
6. A rota proxy tenta enviar o webhook. Falha de XLSX ou webhook e informada separadamente e nao desfaz a gravacao no banco.

### Atualizacao e exclusao

1. A API carrega a ficha e verifica `canEditFicha`.
2. Na atualizacao, calcula diferencas, grava o banco, cria log e tenta sincronizar o XLSX.
3. Na exclusao, remove banco e XLSX e tenta registrar a atividade.
4. O espelho XLSX nao participa de transacao com o PostgreSQL.

### Agrupamento de clientes

Administradores podem escolher duas ou mais fichas e uma ficha principal. A API chama a funcao PostgreSQL `merge_ficha_clients`, que preserva todas as fichas, copia a identidade do cliente principal, atribui um `client_group_id` comum, renumera as fichas e cria logs.

## Permissoes funcionais

Os niveis aceitos sao:

- `admin`: administracao de usuarios e modelos, merge e acesso amplo.
- `consultor`: operacao normal; regras de edicao dependem de autoria e da funcao `canEditFicha`.
- `andamento`: nivel adicional voltado ao acompanhamento, tambem tratado pelas regras da interface/dominio.

Importante: varias APIs recebem o objeto `consultor` no corpo e fazem autorizacao a partir dele. Consulte os alertas em `BANCO_DE_DADOS.md`.

## Variaveis de ambiente

| Variavel | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase usada no servidor e no fluxo legado. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave publica declarada no exemplo; nao foi identificada no fluxo server-side principal. |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave privilegiada usada exclusivamente pelos Route Handlers/servicos do servidor. |
| `SUPABASE_TABLE_NAME` | Nome da tabela no endpoint legado `/api/submit-form`; padrao `fichas_venda`. |
| `AUTH_COOKIE_SECRET` | Declarada no exemplo, mas nao foi localizado consumo no codigo atual. |
| `NEXT_PUBLIC_APP_URL` | Fallback opcional para o redirect de recuperacao de senha. |

As URLs dos webhooks de criacao e atualizacao nao sao variaveis de ambiente no codigo atual: estao definidas diretamente em `lib/webhookService.ts`. Para separar configuracao de codigo e facilitar a troca por ambiente, recomenda-se migra-las para variaveis server-side.

Nunca versionar `.env.local` nem registrar seus valores na documentacao.

## Comandos de desenvolvimento

```powershell
npm install
npm run dev
npm run lint
npm run build
```

O repositorio possui `package-lock.json` e `pnpm-lock.yaml`; a equipe deve escolher um unico gerenciador para evitar divergencia entre locks. Nao ha script `test` no `package.json`; os testes `*.test.mjs` podem ser executados com o Node Test Runner conforme o padrao de cada arquivo.

## Convencoes relevantes

- Alias TypeScript: `@/*` aponta para a raiz.
- TypeScript opera em modo `strict` e `noEmit`.
- Campos da interface usam camelCase; colunas PostgreSQL usam snake_case. A conversao central esta em `server-fichas.ts`.
- Datas especiais de prazo usam sentinelas no banco: `1900-01-01` (Vencida), `1900-01-02` (Revisao de Ato) e `1900-01-03` (AG Penalidade).
- PDFs sao gerados no navegador; o banco guarda dados e modelos HTML, nao os arquivos PDF.
- Em producao Vercel, o XLSX fica no diretorio temporario e nao deve ser considerado armazenamento persistente.

## Onde alterar cada assunto

| Necessidade | Arquivos principais |
|---|---|
| Campo novo de ficha | `lib/ficha-types.ts`, formulario, `lib/server-fichas.ts`, SQL e PDFs |
| Regra de permissao | `lib/ficha-utils.ts`, API correspondente e interface |
| Regra de pagamentos | `lib/payment-details.ts` e testes associados |
| Novo endpoint | `app/api/**/route.ts` e cliente em `lib/` |
| Modelo de contrato/procuracao | `lib/document-templates.ts`, editor, PDF e `document_templates` |
| Alteracao de schema | nova migration em `supabase/` e atualizacao de `supabase/schema.sql` |
| Auditoria | `lib/server-activity-logs.ts`, `lib/ficha-change-log.ts` e `activity_logs` |

## Documentos relacionados

- [Banco de dados](./BANCO_DE_DADOS.md)
- [Contexto do produto](../PRODUCT.md)
- [Sistema de design](../DESIGN.md)
