# Consulta e Edição da Ficha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar a consulta mais limpa e garantir que edição, prazos, data de criação e auditoria sejam confiáveis.

**Architecture:** Usar `created_at` como fonte imutável da Data da Ficha, manter Data do Contrato separada e persistir prazos completos em colunas de texto. Centralizar a comparação do log e manter uma única ação final de salvamento no formulário.

**Tech Stack:** Next.js, React, TypeScript, Supabase/PostgreSQL e Node Test Runner.

## Global Constraints

- O cabeçalho com logo, Data do Contrato e Prazo deve ser removido apenas da consulta.
- O PDF da ficha não deve perder essas informações por causa da alteração visual.
- A Data da Ficha deve usar a criação original e não a última edição.

---

### Task 1: Persistência e auditoria

**Files:**
- Modify: `lib/server-fichas.ts`
- Create: `lib/ficha-change-log.ts`
- Create: `supabase/2026-08-26-preserve-ficha-deadlines.sql`
- Test: `lib/server-fichas.test.mjs`
- Test: `lib/ficha-change-log.test.mjs`

- [x] Escrever testes que reproduzam prazo completo perdido e alteração falsa de proprietário.
- [x] Confirmar as falhas antes da implementação.
- [x] Persistir os prazos completos e normalizar valores legados equivalentes.
- [x] Executar os testes até passarem.

### Task 2: Data da Ficha e documentos

**Files:**
- Create: `lib/ficha-date.ts`
- Modify: `lib/document-templates.ts`
- Modify: `lib/document-pdf-client.tsx`
- Test: `lib/ficha-date.test.mjs`
- Test: `lib/document-templates.test.mjs`

- [x] Testar a data original no fuso de São Paulo.
- [x] Criar o placeholder `{{dataFicha}}` independente de `dataContrato`.
- [x] Encaminhar `createdAt` para preview e geração de documentos.

### Task 3: Consulta e edição

**Files:**
- Modify: `components/fichas-workspace.tsx`
- Modify: `components/ficha-read-view.tsx`
- Modify: `lib/ficha-read-layout.ts`
- Test: `components/fichas-workspace.test.mjs`
- Test: `lib/ficha-read-layout.test.mjs`

- [x] Remover o cabeçalho antigo da consulta e realocar Data do Contrato.
- [x] Exibir Consultor, Origem e SNE na mesma linha.
- [x] Mostrar Data da Ficha no seletor e retirar `Data:` das observações.
- [x] Posicionar o botão `+` após o lápis e manter um único salvar ao final.
- [x] Executar testes e lint dos arquivos alterados.
