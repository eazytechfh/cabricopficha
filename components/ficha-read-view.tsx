"use client"

import type { FichaFormValues } from "@/lib/ficha-types"
import { formatCurrency, normalizeMultasProcessoLabels, parseCurrency, splitSerializedEntries } from "@/lib/ficha-utils"
import { parsePaymentEntries } from "@/lib/payment-details"
import type { ReactNode } from "react"

type FichaReadViewProps = {
  values: FichaFormValues
  actions?: ReactNode
  details?: ReactNode
}

function fallback(value: string) {
  return value?.trim() || "-"
}

function hasText(value: string) {
  return Boolean(value?.trim())
}

function hasAnyText(values: string[]) {
  return values.some(hasText)
}

function formatDate(value: string) {
  if (!value) return "-"
  if (value === "VENCIDA") return "Vencida"
  if (value === "Vencida" || value === "Revisão de Ato") return value
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function formatPaymentMethod(value: string) {
  const labels: Record<string, string> = {
    credito: "CRÉDITO",
    debito: "DÉBITO",
    pix: "PIX",
    transferencia: "TRANSFERÊNCIA",
    ted: "TED",
    especie: "ESPÉCIE",
    deposito: "DEPÓSITO",
    cheque: "CHEQUE",
  }

  return labels[value] || fallback(value).toLocaleUpperCase("pt-BR")
}

function formatBank(value: string) {
  const labels: Record<string, string> = {
    asaas: "ASAAS",
    rede: "REDE",
    itau: "ITAU",
    outros: "OUTROS",
  }

  return labels[value] || fallback(value)
}

function splitLines(value: string) {
  if (!value) return [""]
  return value.split("\n")
}

function getProcessoLines(values: FichaFormValues) {
  const instancias = splitLines(values.instanciaProcesso)
  const tipos = splitLines(values.tipoProcesso)
  const numeros = splitLines(values.numeroProcesso)
  const multas = splitLines(normalizeMultasProcessoLabels(values.vistoJuridico))
  const prazos = splitLines(values.prazoProcesso)
  const maxLength = Math.max(instancias.length, tipos.length, numeros.length, multas.length, prazos.length, 1)

  return Array.from({ length: maxLength }, (_, index) => ({
    instanciaProcesso: instancias[index] || "",
    tipoProcesso: tipos[index] || "",
    numeroProcesso: numeros[index] || "",
    multasProcesso: multas[index] || "",
    prazoProcesso: prazos[index] || "",
  }))
}

function getMultaBlocks(values: FichaFormValues) {
  const instancias = splitSerializedEntries(values.instanciaMulta)
  const autosDetran = splitSerializedEntries(values.autoDetran)
  const autosRenainf = splitSerializedEntries(values.autoRenainf)
  const tipos = splitSerializedEntries(values.tipoMulta)
  const placas = splitSerializedEntries(values.placa)
  const placasProprietario = splitSerializedEntries(values.placaProprietario)
  const cpfsProprietario = splitSerializedEntries(values.cpfProprietario)
  const renavams = splitSerializedEntries(values.renavam)
  const prazos = splitSerializedEntries(values.prazoMulta)
  const processosVinculados = splitSerializedEntries(values.vistoJuridicoMulta)

  const maxLength = Math.max(
    instancias.length,
    autosDetran.length,
    autosRenainf.length,
    tipos.length,
    placas.length,
    placasProprietario.length,
    cpfsProprietario.length,
    renavams.length,
    prazos.length,
    processosVinculados.length,
    1
  )

  return Array.from({ length: maxLength }, (_, index) => ({
    instanciaMulta: instancias[index] || "",
    autoDetran: autosDetran[index] || "",
    autoRenainf: autosRenainf[index] || "",
    tipoMulta: tipos[index] || "",
    placa: placas[index] || "",
    placaProprietario: placasProprietario[index] || "sim",
    cpfProprietario: cpfsProprietario[index] || "",
    renavam: renavams[index] || "",
    prazoMulta: prazos[index] || "",
    processoVinculado: processosVinculados[index] || "",
  }))
}

function getMultaLines(block: {
  instanciaMulta: string
  autoDetran: string
  autoRenainf: string
  tipoMulta: string
  prazoMulta: string
  processoVinculado: string
}) {
  const instancias = splitLines(block.instanciaMulta)
  const autosDetran = splitLines(block.autoDetran)
  const autosRenainf = splitLines(block.autoRenainf)
  const tipos = splitLines(block.tipoMulta)
  const prazos = splitLines(block.prazoMulta)
  const processosVinculados = splitLines(block.processoVinculado)
  const maxLength = Math.max(
    instancias.length,
    autosDetran.length,
    autosRenainf.length,
    tipos.length,
    prazos.length,
    processosVinculados.length,
    1
  )

  return Array.from({ length: maxLength }, (_, index) => ({
    instanciaMulta: instancias[index] || "",
    autoDetran: autosDetran[index] || "",
    autoRenainf: autosRenainf[index] || "",
    tipoMulta: tipos[index] || "",
    prazoMulta: prazos[index] || "",
    processoVinculado: processosVinculados[index] || "",
  }))
}

function ValueCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-slate-200 px-3 py-3 last:border-b-0 md:border-b-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium leading-5 text-slate-900">{fallback(value)}</p>
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="bg-[#214674] px-4 py-2 text-center text-sm font-bold uppercase tracking-wide text-white">{children}</h3>
}

function ReadSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden border-x border-b border-slate-300 bg-white first:border-t">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </section>
  )
}

function formatMoneyValue(value: string) {
  if (!value?.trim()) return "-"
  return formatCurrency(parseCurrency(value))
}

export function FichaReadView({ values, actions, details }: FichaReadViewProps) {
  const payments = parsePaymentEntries(values.pagamentos, values)
  const processoLines = getProcessoLines(values).filter((line) =>
    hasAnyText([line.instanciaProcesso, line.tipoProcesso, line.numeroProcesso, line.multasProcesso, line.prazoProcesso])
  )
  const multaBlocks = getMultaBlocks(values).filter((block) =>
    hasAnyText([
      block.instanciaMulta,
      block.autoDetran,
      block.autoRenainf,
      block.tipoMulta,
      block.placa,
      block.cpfProprietario,
      block.renavam,
      block.prazoMulta,
    ])
  )

  return (
    <div className="space-y-4">
      {actions ? <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">{actions}</div> : null}
      {details}

      <div className="overflow-hidden rounded-lg border border-slate-300 shadow-sm">
      <ReadSection title="Dados do Pagamento">
        <div className="grid grid-cols-1 divide-y divide-slate-200 md:grid-cols-3 md:divide-x md:divide-y-0">
          <ValueCell label="Valor Total" value={formatMoneyValue(values.valorTotal)} />
          <ValueCell label="Total Pago" value={formatMoneyValue(values.valorEntrada)} />
          <ValueCell label="Valor Restante" value={formatMoneyValue(values.valorRestante)} />
        </div>
        {payments.length > 0 ? (
          <div className="divide-y divide-slate-200 border-t border-slate-300">
            {payments.map((payment, index) => (
              <div key={payment.id} className="grid grid-cols-1 md:grid-cols-3 md:divide-x md:divide-slate-200">
                <ValueCell label={`Pagamento ${index + 1}`} value={formatPaymentMethod(payment.formaPagamento)} />
                <ValueCell label="Banco / Operadora" value={formatBank(payment.banco)} />
                <ValueCell label="Valor" value={formatMoneyValue(payment.valor)} />
              </div>
            ))}
          </div>
        ) : null}
        <div>
          {parseCurrency(values.valorRestante) > 0 && hasText(values.observacaoValorRestante) ? (
            <div className="border-t border-slate-200">
              <ValueCell label="Observacao do Valor Restante" value={values.observacaoValorRestante} />
            </div>
          ) : null}
        </div>
      </ReadSection>

      {processoLines.length > 0 ? (
        <ReadSection title="Processos">
          <div className="divide-y divide-slate-300">
            {processoLines.map((line, index) => (
              <div key={`processo-read-${index}`} className="grid grid-cols-1 bg-white md:grid-cols-2 xl:grid-cols-5 xl:divide-x xl:divide-slate-200">
                <ValueCell label="Instancia do Processo" value={line.instanciaProcesso} />
                <ValueCell label="Tipo do Processo" value={line.tipoProcesso} />
                <ValueCell label="No do Processo" value={line.numeroProcesso.toUpperCase()} />
                <ValueCell label="Multas do Processo" value={normalizeMultasProcessoLabels(line.multasProcesso, true)} />
                <ValueCell label="Prazo" value={formatDate(line.prazoProcesso)} />
              </div>
            ))}
          </div>
        </ReadSection>
      ) : null}

      {multaBlocks.length > 0 ? (
        <ReadSection title="Multas">
          <div className="divide-y divide-slate-300">
            {multaBlocks.map((block, index) => {
              const multaLines = getMultaLines(block).filter((line) =>
                hasAnyText([line.instanciaMulta, line.autoDetran, line.autoRenainf, line.tipoMulta, line.prazoMulta])
              )

              return (
                <div key={`multa-read-${index}`} className="bg-white">
                  <div className="grid grid-cols-1 bg-slate-50 md:grid-cols-2 md:divide-x md:divide-slate-200">
                    <ValueCell label="PLACA" value={block.placa.toUpperCase()} />
                    <ValueCell label="RENAVAM" value={block.renavam} />
                    {block.placaProprietario !== "sim" && hasText(block.cpfProprietario) ? (
                      <ValueCell label="CPF do Proprietario" value={block.cpfProprietario} />
                    ) : null}
                  </div>

                  {multaLines.map((line, lineIndex) => (
                    <div key={`multa-read-line-${index}-${lineIndex}`} className="grid grid-cols-1 border-t border-slate-200 xl:grid-cols-5 xl:divide-x xl:divide-slate-200">
                      <ValueCell label="Instancia da Multa" value={line.instanciaMulta} />
                      <ValueCell label="Detran" value={line.autoDetran} />
                      <ValueCell label="Renainf" value={line.autoRenainf} />
                      <ValueCell label="Tipo" value={line.tipoMulta} />
                      <ValueCell label="Prazo" value={formatDate(line.prazoMulta)} />
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </ReadSection>
      ) : null}

      <ReadSection title="Observações Adicionais">
        <p className="min-h-12 whitespace-pre-wrap px-4 py-3 text-sm leading-6 text-slate-900">{fallback(values.observacoes)}</p>
      </ReadSection>

      <ReadSection title="Cláusula Adicional">
        <p className="min-h-12 whitespace-pre-wrap px-4 py-3 text-sm leading-6 text-slate-900">{fallback(values.clausulaAdicional)}</p>
      </ReadSection>
      </div>
    </div>
  )
}
