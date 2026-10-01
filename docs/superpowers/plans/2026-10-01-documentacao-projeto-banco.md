# Documentacao do Projeto e Banco de Dados Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar em Markdown a arquitetura do sistema CABRICOP Ficha e o modelo de dados Supabase/PostgreSQL observado no repositorio.

**Architecture:** A documentacao sera separada em dois arquivos: um orientado ao codigo e aos fluxos da aplicacao, outro orientado ao schema e sua evolucao. O conteudo sera derivado dos pontos de entrada, APIs, servicos, tipos, schema-base e migrations existentes.

**Tech Stack:** Markdown, Next.js 16, React 19, TypeScript, Supabase/PostgreSQL, Tailwind CSS 4.

## Global Constraints

- Nao alterar codigo-fonte nem schema.
- Nao registrar valores reais de segredos presentes em arquivos locais.
- Distinguir o schema-base das alteracoes aplicadas por migrations posteriores.

---

### Task 1: Documentar a estrutura do projeto

**Files:**
- Create: `docs/ESTRUTURA_DO_PROJETO.md`

**Interfaces:**
- Consumes: `package.json`, `app/`, `components/`, `lib/`, `hooks/`, `public/`, `styles/`, `supabase/` e `types/`.
- Produces: mapa de arquitetura, diretorios, rotas HTTP, fluxos principais e instrucoes operacionais.

- [x] **Step 1: Inventariar os arquivos versionados**

Run: `rg --files -g '!node_modules/**' -g '!.git/**' -g '!.next/**'`

Expected: lista dos arquivos do aplicativo, testes, SQL e documentacao.

- [x] **Step 2: Identificar pontos de entrada e dependencias**

Run: `Get-Content package.json,app/page.tsx,app/layout.tsx`

Expected: Next.js App Router, React, TypeScript e pagina principal `FichasWorkspace`.

- [x] **Step 3: Registrar modulos, APIs e fluxos**

Documentar os caminhos reais, responsabilidades, metodos HTTP e relacoes entre UI, API, servicos e Supabase.

- [x] **Step 4: Validar referencias**

Run: `rg -n "export async function|export default function" app components lib`

Expected: os componentes e handlers citados existem.

### Task 2: Documentar o banco de dados

**Files:**
- Create: `docs/BANCO_DE_DADOS.md`

**Interfaces:**
- Consumes: `supabase/schema.sql`, todos os arquivos `supabase/**/*.sql` e os adaptadores `lib/server-*.ts`.
- Produces: catalogo de tabelas, colunas, relacionamentos, objetos SQL, seguranca, migrations e riscos conhecidos.

- [x] **Step 1: Catalogar tabelas e colunas**

Run: `rg -n -i "create table|add column" supabase -g '*.sql'`

Expected: quatro tabelas publicas e campos adicionados por migrations.

- [x] **Step 2: Catalogar objetos auxiliares**

Run: `rg -n -i "create.*(index|function|trigger|policy)" supabase -g '*.sql'`

Expected: indices, funcoes, triggers e politicas RLS listados.

- [x] **Step 3: Conferir uso no codigo**

Run: `rg -n "rest/v1|auth/v1|rpc/" lib app/api`

Expected: acesso server-side via Supabase REST/Auth com service role.

- [x] **Step 4: Registrar divergencias e cuidados**

Documentar que `schema.sql` nao inclui todas as migrations posteriores e destacar armazenamento de senha em texto puro e seed conhecido.
