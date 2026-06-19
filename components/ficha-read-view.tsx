"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { FichaFormValues } from "@/lib/ficha-types"
import { formatCurrency, normalizeMultasProcessoLabels, parseCurrency, splitSerializedEntries } from "@/lib/ficha-utils"
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
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-foreground">{fallback(value)}</p>
    </div>
  )
}

function formatMoneyValue(value: string) {
  if (!value?.trim()) return "-"
  return formatCurrency(parseCurrency(value))
}

export function FichaReadView({ values, actions, details }: FichaReadViewProps) {
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
    <div className="space-y-6">
      {actions ? <div className="flex flex-wrap gap-4">{actions}</div> : null}
      {details}

      <Card className="border-l-4 border-l-secondary shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-primary">Dados do Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <ValueCell label="Forma de Pagamento" value={formatPaymentMethod(values.formaPagamento)} />
          <ValueCell label="Banco" value={formatBank(values.banco)} />
          <ValueCell label="Valor Total" value={formatMoneyValue(values.valorTotal)} />
          <ValueCell label="Valor de Entrada" value={formatMoneyValue(values.valorEntrada)} />
          <ValueCell label="Valor Restante" value={formatMoneyValue(values.valorRestante)} />
          {parseCurrency(values.valorRestante) > 0 && hasText(values.observacaoValorRestante) ? (
            <div className="md:col-span-2 xl:col-span-5">
              <ValueCell label="Observacao do Valor Restante" value={values.observacaoValorRestante} />
            </div>
          ) : null}
          {hasText(values.clausulaAdicional) ? (
            <div className="md:col-span-2 xl:col-span-5">
              <ValueCell label="Clausula Adicional" value={values.clausulaAdicional} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {processoLines.length > 0 ? (
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-primary">Processos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {processoLines.map((line, index) => (
              <div key={`processo-read-${index}`} className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-slate-50/60 p-4 xl:grid-cols-5">
                <ValueCell label="Instancia do Processo" value={line.instanciaProcesso} />
                <ValueCell label="Tipo do Processo" value={line.tipoProcesso} />
                <ValueCell label="No do Processo" value={line.numeroProcesso.toUpperCase()} />
                <ValueCell label="Multas do Processo" value={normalizeMultasProcessoLabels(line.multasProcesso, true)} />
                <ValueCell label="Prazo" value={formatDate(line.prazoProcesso)} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {multaBlocks.length > 0 ? (
        <Card className="border-l-4 border-l-secondary shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-primary">Multas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {multaBlocks.map((block, index) => {
              const multaLines = getMultaLines(block).filter((line) =>
                hasAnyText([line.instanciaMulta, line.autoDetran, line.autoRenainf, line.tipoMulta, line.prazoMulta])
              )

              return (
                <div key={`multa-read-${index}`} className="space-y-3 rounded-xl border border-border bg-slate-50/60 p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <ValueCell label="PLACA" value={block.placa.toUpperCase()} />
                    <ValueCell label="RENAVAM" value={block.renavam} />
                    {block.placaProprietario !== "sim" && hasText(block.cpfProprietario) ? (
                      <ValueCell label="CPF do Proprietario" value={block.cpfProprietario} />
                    ) : null}
                  </div>

                  {multaLines.map((line, lineIndex) => (
                    <div key={`multa-read-line-${index}-${lineIndex}`} className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-background p-3 xl:grid-cols-5">
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
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-l-4 border-l-muted shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-primary">Observacoes Adicionais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border bg-background px-4 py-3">
            <p className="whitespace-pre-wrap text-sm font-medium text-foreground">{fallback(values.observacoes)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
