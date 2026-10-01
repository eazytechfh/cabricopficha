# Banco de dados do CABRICOP Ficha

> Documento gerado a partir de `supabase/schema.sql`, das migrations em `supabase/` e do acesso realizado em `lib/server-*.ts`, em 01/10/2026.

## Visao geral

O banco e PostgreSQL gerenciado pelo Supabase. A aplicacao usa quatro tabelas publicas e a tabela gerenciada `auth.users`. O acesso principal ocorre no servidor pela REST API do Supabase usando `SUPABASE_SERVICE_ROLE_KEY`.

```text
auth.users
    1
    |
    1
user_profiles

fichas_venda -- client_group_id agrupa fichas do mesmo cliente
      |
      +---- activity_logs (relacao logica por entity_type + entity_id)

document_templates -- activity_logs (relacao logica)
```

Nao existem foreign keys entre `activity_logs` e as entidades auditadas. `entity_type` + `entity_id` formam uma referencia polimorfica mantida pela aplicacao.

## Fontes de verdade e ordem de aplicacao

`supabase/schema.sql` e um snapshot/base idempotente, mas esta atrasado em relacao a migrations posteriores: nao contem `client_group_id`, a versao mais nova da chave de cliente, a funcao de merge nem todos os indices. Para reconstruir o estado descrito neste documento:

1. aplique `supabase/schema.sql`;
2. aplique os arquivos SQL datados de `supabase/` em ordem cronologica;
3. aplique `supabase/migrations/20260902_ensure_third_party_owner_fields.sql`.

Como os nomes usam dois formatos (`2026-...` e `20260902_...`), a ordem deve ser controlada explicitamente. O ideal e consolidar o snapshot e mover todas as migrations para uma unica pasta/padrao.

## Tabela `public.fichas_venda`

Entidade central. Cada linha representa uma ficha/contrato, enquanto `client_group_id` permite agrupar varias fichas pertencentes ao mesmo cliente.

### Identificacao e auditoria

| Coluna | Tipo | Restricao/padrao | Finalidade |
|---|---|---|---|
| `id` | bigint | PK, identity | Identificador tecnico. |
| `client_group_id` | uuid | nullable, adicionada por migration | Agrupa fichas unificadas do mesmo cliente. |
| `numero_ficha` | integer | `> 0`, atribuida por trigger | Sequencia da ficha dentro do cliente. |
| `data_envio` | timestamptz | nullable | Data de envio no fluxo legado. |
| `created_at` | timestamptz | not null, `now()` | Criacao. |
| `updated_at` | timestamptz | not null, `now()` | Ultima alteracao, preenchida pela aplicacao. |
| `created_by_consultor_id` | text | nullable | ID do criador. |
| `updated_by_consultor_id` | text | nullable | ID do ultimo editor. |

### Cliente e contrato

| Coluna | Tipo | Restricao/padrao | Finalidade |
|---|---|---|---|
| `data_contrato` | date | nullable | Data do contrato. |
| `prazo_servico` | date | nullable | Prazo geral/legado. |
| `nome_cliente` | text | not null | Nome do cliente. |
| `cpf_cnpj` | text | nullable | Documento apresentado pela aplicacao. |
| `cpf_normalizado` | text | nullable | Documento somente com digitos para busca. |
| `cnh` | text | nullable | CNH. |
| `data_nascimento` | date | nullable | Data de nascimento. |
| `data_primeira_cnh` | date | nullable | Data da primeira habilitacao. |
| `nacionalidade` | text | nullable | Nacionalidade. |
| `estado_civil` | text | nullable | Estado civil. |
| `profissao` | text | nullable | Profissao. |
| `telefones` | text | nullable | Um ou mais telefones em texto. |
| `email` | text | nullable | E-mail. |
| `terceiros` | text | nullable | Nome de terceiro relacionado. |
| `telefone_terceiros` | text | nullable | Telefone do terceiro. |
| `email_terceiros` | text | nullable | E-mail do terceiro. |
| `endereco` | text | nullable | Logradouro. |
| `numero_endereco` | text | nullable | Numero. |
| `complemento_endereco` | text | nullable | Complemento. |
| `cep` | text | nullable | CEP. |
| `municipio` | text | nullable | Municipio. |
| `uf` | text | nullable | Unidade federativa. |
| `nome_consultor` | text | nullable | Nome exibido do consultor. |
| `origem` | text | nullable | Origem do cliente. |
| `sne` | text | nullable | Indicador/informacao SNE. |
| `clausula_adicional` | text | nullable | Campo presente no schema, sem mapeamento no tipo principal atual. |

### Valores e pagamentos

| Coluna | Tipo | Restricao/padrao | Finalidade |
|---|---|---|---|
| `forma_pagamento` | text | nullable | Forma legada/primeiro pagamento. |
| `banco` | text | nullable | Banco legado/primeiro pagamento. |
| `pagamentos` | jsonb | not null, `[]` | Lista de pagamentos. |
| `valor_total` | numeric(12,2) | nullable | Valor total. |
| `valor_entrada` | numeric(12,2) | nullable | Entrada/valor pago. |
| `valor_restante` | numeric(12,2) | nullable | Saldo. |
| `observacao_valor_restante` | text | nullable | Observacao quando ha saldo. |

Formato produzido para cada item de `pagamentos`:

```json
{
  "id": "identificador-do-item",
  "formaPagamento": "...",
  "banco": "...",
  "valor": "..."
}
```

### Processo, multa e outros servicos

| Coluna | Tipo | Finalidade |
|---|---|---|
| `instancia_processo` | text | Instancia do processo. |
| `tipo_processo` | text | Tipo do processo. |
| `numero_processo` | text | Numero do processo. |
| `prazo_processo` | date | Primeira data ou data-sentinela. |
| `prazos_processo_texto` | text | Representacao completa, inclusive multiplos prazos. |
| `visto_juridico` | text | Campo legado. |
| `assinatura_visto_juridico` | text | Campo legado/fallback de prazo no leitor atual. |
| `multas_processo` | text | Multas vinculadas ao processo; preferido pelo mapeamento atual. |
| `instancia_multa` | text | Instancia da multa. |
| `auto_detran` | text | Auto DETRAN. |
| `auto_renainf` | text | Auto RENAINF. |
| `tipo_multa` | text | Tipo de multa. |
| `placa` | text | Placa do veiculo. |
| `placa_proprietario` | text | Indicador se a placa pertence ao cliente. |
| `cpf_proprietario` | text | CPF do proprietario terceiro. |
| `renavam` | text | RENAVAM. |
| `prazo_multa` | date | Data ou data-sentinela. |
| `prazos_multa_texto` | text | Representacao textual completa do prazo. |
| `visto_juridico_multa` | text | Campo legado. |
| `processo_vinculado_multa` | text | Processo vinculado; preferido pelo leitor atual. |
| `tipo_outro_servico` | text | Tipo de servico adicional. |
| `poderes_outro_servico` | text | Poderes/texto do servico adicional. |
| `observacoes` | text | Observacoes gerais. |

As colunas `date` usam tres valores sentinela traduzidos no servidor: `1900-01-01` = Vencida, `1900-01-02` = Revisao de Ato e `1900-01-03` = AG Penalidade.

## Tabela `public.user_profiles`

Perfil complementar em relacao 1:1 com `auth.users`.

| Coluna | Tipo | Restricao/padrao |
|---|---|---|
| `id` | uuid | PK, FK para `auth.users(id)`, delete cascade |
| `nome_responsavel` | text | not null |
| `email` | text | not null, unique |
| `telefone` | text | not null |
| `nivel_acesso` | text | not null, `admin`, `consultor` ou `andamento` |
| `ativo` | boolean | not null, default true |
| `must_change_password` | boolean | not null, default false |
| `password_plain` | text | nullable; copia de senha em texto puro |
| `created_at` | timestamptz | not null, default `now()` |
| `updated_at` | timestamptz | not null, default `now()`; mantido por trigger |
| `last_login_at` | timestamptz | nullable |

O login real e validado pelo Supabase Auth. O perfil define habilitacao e nivel funcional.

## Tabela `public.access_codes`

Tabela legada de codigos de acesso. O servico atual administra `auth.users` + `user_profiles`, apesar de as rotas ainda se chamarem `/api/access-codes`.

| Coluna | Tipo | Restricao/padrao |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `nome_responsavel` | text | not null |
| `codigo_acesso` | text | not null, unique |
| `nivel_acesso` | text | not null, `admin`, `consultor` ou `andamento` |
| `ativo` | boolean | not null, default true |
| `created_at` | timestamptz | not null, default `now()` |
| `updated_at` | timestamptz | not null, default `now()` |

O schema inclui um seed com codigo conhecido. Esta tabela deve ser removida ou saneada se o fluxo legado nao for mais usado.

## Tabela `public.document_templates`

| Coluna | Tipo | Restricao/padrao |
|---|---|---|
| `key` | text | PK |
| `content` | text | not null; HTML/conteudo editavel |
| `created_at` | timestamptz | not null, default `now()` |
| `updated_at` | timestamptz | not null, default `now()` |

Chaves criadas pelas migrations: `contract`, `procuration`, `other-services-contract` e `other-services-procuration`.

## Tabela `public.activity_logs`

| Coluna | Tipo | Restricao/padrao |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `entity_type` | text | not null, `ficha` ou `document_template` |
| `entity_id` | text | not null |
| `entity_label` | text | not null |
| `action` | text | not null |
| `summary` | text | not null |
| `actor_id` | text | not null |
| `actor_name` | text | not null |
| `details` | jsonb | not null, default `[]` |
| `created_at` | timestamptz | not null, default `now()` |

`details` armazena itens com `field`, `before` e `after`. A ausencia de FK preserva logs apos exclusao, mas tambem permite referencias invalidas.

## Indices e restricoes

| Objeto | Definicao/finalidade |
|---|---|
| `fichas_venda_pkey` | PK de `id`. |
| `fichas_venda_cpf_normalizado_idx` | Acelera busca por CPF normalizado. |
| `fichas_venda_client_group_id_idx` | Acelera busca por grupo de cliente. |
| `fichas_venda_client_numero_ficha_uidx` | Unicidade parcial de `numero_ficha` por chave de cliente calculada. Substitui o indice antigo baseado apenas em CPF. |
| `activity_logs_entity_idx` | `(entity_type, entity_id, created_at desc)` para historico por entidade. |
| uniques implicitos | `user_profiles.email` e `access_codes.codigo_acesso`. |

A funcao `ficha_client_key` usa, em ordem, CPF normalizado, CPF/CNPJ limpo e nome normalizado. Isso permite sequenciar clientes sem CPF, mas nomes iguais podem compartilhar chave.

## Funcoes e triggers

### `public.ficha_client_key(cpf_normalizado_value, cpf_cnpj_value, nome_cliente_value)`

Retorna a chave estavel usada para numeracao: documento normalizado quando disponivel; caso contrario, nome normalizado.

### `public.assign_ficha_number()` + trigger `assign_ficha_number`

Executada antes do `INSERT` em `fichas_venda`. Adquire `pg_advisory_xact_lock` da chave do cliente e atribui `max(numero_ficha) + 1`, reduzindo colisao entre inclusoes concorrentes.

### `public.merge_ficha_clients(primary_ficha_id, selected_ficha_ids, actor_id_value, actor_name_value)`

Valida a selecao, copia os dados pessoais da ficha principal para as demais, atribui um UUID de grupo, renumera todas as fichas cronologicamente e cria logs de merge. A execucao e revogada de `public`, `anon` e `authenticated` e concedida apenas a `service_role`.

### `public.set_user_profiles_updated_at()` + trigger homonimo

Define `updated_at = now()` antes de cada atualizacao em `user_profiles`.

## RLS e acesso

O schema habilita Row Level Security em `fichas_venda` e `user_profiles`, com politica irrestrita apenas para `service_role`. O codigo principal usa essa role no servidor, portanto ignora as restricoes destinadas a clientes comuns.

Nao ha declaracoes RLS versionadas para `access_codes`, `document_templates` ou `activity_logs`. Como o acesso normal ocorre com service role, isso nao bloqueia a aplicacao, mas o posture de seguranca depende das configuracoes reais do Supabase e da exposicao das tabelas pela API.

## Historico de migrations

| Data | Arquivo | Alteracao principal |
|---|---|---|
| 2026-05-19 | `2026-05-19-add-process-multa-columns.sql` | Campos de multas/processo. |
| 2026-05-22 | `2026-05-22-add-client-contract-fields.sql` | Nacionalidade, estado civil e profissao. |
| 2026-05-22 | `2026-05-22-add-remaining-value-observation.sql` | Observacao do saldo. |
| 2026-06-15 | `2026-06-15-add-document-templates.sql` | Modelos de contrato e procuracao. |
| 2026-06-16 | `2026-06-16-add-activity-logs.sql` | Auditoria e indice por entidade. |
| 2026-06-16 | `2026-06-16-add-activity-log-details.sql` | Detalhes JSON das alteracoes. |
| 2026-06-16 | `2026-06-16-add-andamento-access-level.sql` | Nivel `andamento`. |
| 2026-06-19 | migrations de clausula/endereco | Clausula adicional, municipio e UF. |
| 2026-08-05 | migrations de usuarios | `user_profiles`, trigger, RLS e `password_plain`. |
| 2026-08-24 | migrations de endereco/pagamentos | Separa numero/complemento e migra pagamento legado para JSON. |
| 2026-08-25 | `2026-08-25-add-outros-servicos.sql` | Outros servicos e seus modelos. |
| 2026-08-26 | migrations de numero/prazos | Sequencia por cliente e preservacao do texto dos prazos. |
| 2026-08-28 | migrations de terceiros/merge | Contatos de terceiros, grupos, merge e chave de cliente revisada. |
| 2026-09-02 | `migrations/20260902_ensure_third_party_owner_fields.sql` | Garante campos do proprietario e corrige flags existentes. |

## Mapeamento aplicacao -> banco

| Aplicacao | Banco |
|---|---|
| `FichaRecord` / `FichaFormValues` | `fichas_venda` |
| `AccessCodeRecord` / `ConsultorSession` | `auth.users` + `user_profiles` |
| `ActivityLogRecord` | `activity_logs` |
| `DocumentTemplateKind` | `document_templates.key` |

O mapeamento completo e bidirecional de fichas esta nas funcoes `toPayload` e `fromRow` de `lib/server-fichas.ts`.

## Backup, restauracao e manutencao

- Fazer backup pelo mecanismo do Supabase/PostgreSQL; a planilha XLSX e apenas espelho e pode estar incompleta.
- Aplicar migrations primeiro em ambiente de homologacao e conferir funcoes/triggers com transacoes concorrentes.
- Depois de cada alteracao, atualizar `supabase/schema.sql` para que um ambiente novo nao dependa de conhecimento manual.
- Antes de remover colunas legadas, conferir os fallbacks de `fromRow` e os dados historicos.
- Tratar CPF/CNPJ, telefone, endereco, CNH e dados processuais como dados pessoais protegidos; limitar logs, exports e acesso administrativo.

## Alertas tecnicos e de seguranca

1. **Senha em texto puro:** `user_profiles.password_plain` armazena uma copia recuperavel da senha e e lida pela listagem administrativa. Senhas devem existir apenas no Supabase Auth em forma nao recuperavel; recomenda-se migrar/remover essa coluna e nunca exibi-la.
2. **Credencial seed conhecida:** `schema.sql` insere `ADMIN123` em `access_codes`. Mesmo sendo fluxo legado, um segredo conhecido nao deve ser criado por migration.
3. **Autorizacao baseada no corpo:** rotas recebem `consultor` fornecido pelo navegador. `assertAdminAccess` consulta o ID no banco, mas outras operacoes usam dados do corpo e nao ha sessao server-side/middleware visivel. A autorizacao deve derivar de token Supabase validado pelo servidor.
4. **Service role privilegiada:** a chave deve permanecer apenas no servidor. O prefixo `NEXT_PUBLIC_` da URL e aceitavel, mas a service role nunca pode ser enviada ao cliente.
5. **RLS incompleta no repositorio:** faltam politicas versionadas para tres tabelas publicas. Confirmar e versionar o estado real.
6. **Schema divergente:** `schema.sql` nao contem todo o estado final. Uma instalacao que aplique somente esse arquivo falhara em consultas a `client_group_id` e no RPC de merge.
7. **Sem transacao entre armazenamentos:** PostgreSQL, auditoria, webhook e XLSX podem divergir em falhas parciais.
8. **Webhooks fixos no codigo:** os endpoints externos estao definidos diretamente em `lib/webhookService.ts`; devem ser configuracao server-side e tratados como informacao operacional sensivel.

## Consultas uteis para verificacao

```sql
-- Tabelas publicas
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

-- Colunas da tabela principal
select ordinal_position, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'fichas_venda'
order by ordinal_position;

-- Politicas RLS
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- Indices
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;
```

## Documentos relacionados

- [Estrutura do projeto](./ESTRUTURA_DO_PROJETO.md)
- [Schema-base](../supabase/schema.sql)
