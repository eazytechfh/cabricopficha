"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { FichaFormValues } from "@/lib/ficha-types"
import { splitSerializedEntries } from "@/lib/ficha-utils"

type FichaReadViewProps = {
  values: FichaFormValues
}

function fallback(value: string) {
  return value?.trim() || "-"
}

function formatDate(value: string) {
  if (!value) return "-"
  if (value === "VENCIDA") return "VENCIDA"
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function formatPaymentMethod(value: string) {
  const labels: Record<string, string> = {
    credito: "Credito",
    debito: "Debito",
    pix: "PIX",
    transferencia: "Transferencia",
    ted: "TED",
    especie: "Especie",
    deposito: "Deposito",
    cheque: "Cheque",
  }

  return labels[value] || fallback(value)
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
  const prazos = splitLines(values.prazoProcesso)
  const maxLength = Math.max(instancias.length, tipos.length, numeros.length, prazos.length, 1)

  return Array.from({ length: maxLength }, (_, index) => ({
    instanciaProcesso: instancias[index] || "",
    tipoProcesso: tipos[index] || "",
    numeroProcesso: numeros[index] || "",
    prazoProcesso: prazos[index] || "",
  }))
}

function getMultaBlocks(values: FichaFormValues) {
  const instancias = splitSerializedEntries(values.instanciaMulta)
  const autosDetran = splitSerializedEntries(values.autoDetran)
  const autosRenainf = splitSerializedEntries(values.autoRenainf)
  const tipos = splitSerializedEntries(values.tipoMulta)
  const placas = splitSerializedEntries(values.placa)
  const renavams = splitSerializedEntries(values.renavam)
  const prazos = splitSerializedEntries(values.prazoMulta)

  const maxLength = Math.max(instancias.length, autosDetran.length, autosRenainf.length, tipos.length, placas.length, renavams.length, prazos.length, 1)

  return Array.from({ length: maxLength }, (_, index) => ({
    instanciaMulta: instancias[index] || "",
    autoDetran: autosDetran[index] || "",
    autoRenainf: autosRenainf[index] || "",
    tipoMulta: tipos[index] || "",
    placa: placas[index] || "",
    renavam: renavams[index] || "",
    prazoMulta: prazos[index] || "",
  }))
}

function getMultaLines(block: {
  instanciaMulta: string
  autoDetran: string
  autoRenainf: string
  tipoMulta: string
  prazoMulta: string
}) {
  const instancias = splitLines(block.instanciaMulta)
  const autosDetran = splitLines(block.autoDetran)
  const autosRenainf = splitLines(block.autoRenainf)
  const tipos = splitLines(block.tipoMulta)
  const prazos = splitLines(block.prazoMulta)
  const maxLength = Math.max(instancias.length, autosDetran.length, autosRenainf.length, tipos.length, prazos.length, 1)

  return Array.from({ length: maxLength }, (_, index) => ({
    instanciaMulta: instancias[index] || "",
    autoDetran: autosDetran[index] || "",
    autoRenainf: autosRenainf[index] || "",
    tipoMulta: tipos[index] || "",
    prazoMulta: prazos[index] || "",
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

export function FichaReadView({ values }: FichaReadViewProps) {
  const processoLines = getProcessoLines(values)
  const multaBlocks = getMultaBlocks(values)

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-secondary shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-primary">Dados do Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <ValueCell label="Forma de Pagamento" value={formatPaymentMethod(values.formaPagamento)} />
          <ValueCell label="Banco" value={formatBank(values.banco)} />
          <ValueCell label="Valor Total" value={values.valorTotal} />
          <ValueCell label="Valor de Entrada" value={values.valorEntrada} />
          <ValueCell label="Valor Restante" value={values.valorRestante} />
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-primary shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-primary">Processos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {processoLines.map((line, index) => (
            <div key={`processo-read-${index}`} className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-slate-50/60 p-4 xl:grid-cols-4">
              <ValueCell label="Instancia do Processo" value={line.instanciaProcesso} />
              <ValueCell label="Tipo do Processo" value={line.tipoProcesso} />
              <ValueCell label="No do Processo" value={line.numeroProcesso.toUpperCase()} />
              <ValueCell label="Prazo" value={formatDate(line.prazoProcesso)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-secondary shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-primary">Multas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {multaBlocks.map((block, index) => (
            <div key={`multa-read-${index}`} className="space-y-3 rounded-xl border border-border bg-slate-50/60 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <ValueCell label="PLACA" value={block.placa.toUpperCase()} />
                <ValueCell label="RENAVAM" value={block.renavam} />
              </div>

              {getMultaLines(block).map((line, lineIndex) => (
                <div key={`multa-read-line-${index}-${lineIndex}`} className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-background p-3 xl:grid-cols-5">
                  <ValueCell label="Instancia da Multa" value={line.instanciaMulta} />
                  <ValueCell label="Detran" value={line.autoDetran} />
                  <ValueCell label="Renainf" value={line.autoRenainf} />
                  <ValueCell label="Tipo" value={line.tipoMulta} />
                  <ValueCell label="Prazo" value={formatDate(line.prazoMulta)} />
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

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
