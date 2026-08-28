# Multiple Contract Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que uma ficha registre duas ou mais formas de pagamento com valores individuais, mantendo a soma conciliada com o valor total.

**Architecture:** Os pagamentos serão serializados em JSON no formulário e persistidos em uma coluna `pagamentos` JSONB. Uma camada pura fará parsing compatível com fichas antigas, soma, cálculo do restante e validação; formulário, consulta, PDF, documentos, Excel e webhook consumirão a mesma representação.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase/PostgreSQL, Node test runner.

## Global Constraints

- Preservar leitura e edição de fichas antigas com uma única forma de pagamento.
- Não permitir soma negativa ou superior ao valor total.
- Calcular automaticamente `valorEntrada` e `valorRestante` a partir das linhas.
- Exibir a composição completa em consulta, PDF, documentos, Excel e webhook.

---

### Task 1: Regras de domínio dos pagamentos

**Files:**
- Create: `lib/payment-details.ts`
- Create: `lib/payment-details.test.mjs`

**Interfaces:**
- Produces: `PaymentEntry`, `parsePaymentEntries`, `serializePaymentEntries`, `sumPaymentEntries`, `reconcilePaymentValues`, `validatePaymentEntries`.

- [ ] Escrever testes para múltiplos pagamentos, compatibilidade legada, soma e excesso sobre o total.
- [ ] Executar `node --experimental-strip-types --test lib/payment-details.test.mjs` e confirmar falha.
- [ ] Implementar parsing JSON, fallback legado, soma monetária e conciliação.
- [ ] Reexecutar o teste e confirmar aprovação.

### Task 2: Modelo e persistência

**Files:**
- Modify: `lib/ficha-types.ts`
- Modify: `lib/ficha-utils.ts`
- Modify: `lib/server-fichas.ts`
- Modify: `supabase/schema.sql`
- Create: `supabase/2026-08-24-add-multiple-payments.sql`

**Interfaces:**
- Consumes: funções de `lib/payment-details.ts`.
- Produces: campo `pagamentos` em `FichaFormValues` e coluna JSONB homônima.

- [ ] Adicionar `pagamentos: string` ao modelo e valor vazio padrão.
- [ ] Normalizar soma, entrada e restante antes de qualquer gravação.
- [ ] Mapear JSONB no payload e na leitura, com fallback das colunas antigas.
- [ ] Criar migração aditiva com backfill das fichas existentes.

### Task 3: Formulário e validação

**Files:**
- Modify: `components/ficha-form.tsx`
- Modify: `components/fichas-workspace.tsx`

**Interfaces:**
- Consumes: `PaymentEntry`, serialização, soma e validação.

- [ ] Substituir os campos únicos de forma/banco/entrada por linhas adicionáveis e removíveis.
- [ ] Manter `Valor Total`, `Total Pago` e `Valor Restante` como resumo calculado.
- [ ] Exibir erro quando a soma ultrapassar o total e bloquear criação/atualização.
- [ ] Preservar observação do restante quando houver saldo.

### Task 4: Saídas e integrações

**Files:**
- Modify: `components/ficha-read-view.tsx`
- Modify: `components/FichaPdf.tsx`
- Modify: `lib/document-templates.ts`
- Modify: `lib/server-fichas.ts`
- Modify: `lib/webhookService.ts`
- Modify: `app/api/submit-form/route.ts`

**Interfaces:**
- Consumes: pagamentos normalizados.

- [ ] Mostrar cada forma e valor na consulta.
- [ ] Mostrar a composição no PDF e placeholders de documentos.
- [ ] Incluir pagamentos no Excel e webhook sem remover campos legados.
- [ ] Normalizar também o endpoint legado de envio.

### Task 5: Verificação final

**Files:**
- Test: `lib/*.test.mjs`

- [ ] Executar todos os testes Node.
- [ ] Executar `npx tsc --noEmit --incremental false`.
- [ ] Executar `npm run lint`.
- [ ] Executar `npm run build`.
- [ ] Executar `git diff --check` e revisar a migração antes da entrega.
