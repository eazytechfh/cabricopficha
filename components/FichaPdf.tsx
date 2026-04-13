import type { CSSProperties, ReactNode } from "react"
import { splitSerializedEntries } from "@/lib/ficha-utils"

export type FichaPdfData = {
  dataContrato: string
  prazoServico: string
  nomeCliente: string
  terceiros: string
  telefones: string
  endereco: string
  cep: string
  cpfCnpj: string
  cnh: string
  dataNascimento: string
  dataPrimeiraCnh: string
  email: string
  nomeConsultor: string
  origem: string
  sne: string
  formaPagamento: string
  banco: string
  valorTotal: number
  valorEntrada: number
  valorRestante: number
  instanciaProcesso: string
  tipoProcesso: string
  numeroProcesso: string
  prazoProcesso: string
  assinaturaVistoJuridico: string
  instanciaMulta: string
  autoDetran: string
  autoRenainf: string
  tipoMulta: string
  placa: string
  renavam: string
  prazoMulta: string
  observacoes: string
}

type FichaPdfProps = {
  data: FichaPdfData
}

const colors = {
  navy: "#1d3f6f",
  orange: "#f29a17",
  line: "#9aa3b0",
  text: "#101828",
  muted: "#6b7280",
  paper: "#ffffff",
}

const pageStyle: CSSProperties = {
  width: 1120,
  minHeight: 1380,
  padding: 24,
  background: "#f3f4f6",
  color: colors.text,
  fontFamily: "Arial, sans-serif",
}

const sheetStyle: CSSProperties = {
  background: colors.paper,
  padding: 18,
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

function formatCurrency(value: number) {
  if (!value) return "-"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function formatCpfCnpj(value: string) {
  const digits = (value || "").replace(/\D/g, "")
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
  }
  return fallback(value)
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

function getProcessoLines(data: FichaPdfData) {
  const instancias = splitLines(data.instanciaProcesso)
  const tipos = splitLines(data.tipoProcesso)
  const numeros = splitLines(data.numeroProcesso)
  const prazos = splitLines(data.prazoProcesso)
  const maxLength = Math.max(instancias.length, tipos.length, numeros.length, prazos.length, 1)

  return Array.from({ length: maxLength }, (_, index) => ({
    instanciaProcesso: instancias[index] || "",
    tipoProcesso: tipos[index] || "",
    numeroProcesso: numeros[index] || "",
    prazoProcesso: prazos[index] || "",
  }))
}

function getMultaBlocks(data: FichaPdfData) {
  const instancias = splitSerializedEntries(data.instanciaMulta)
  const autosDetran = splitSerializedEntries(data.autoDetran)
  const autosRenainf = splitSerializedEntries(data.autoRenainf)
  const tipos = splitSerializedEntries(data.tipoMulta)
  const placas = splitSerializedEntries(data.placa)
  const renavams = splitSerializedEntries(data.renavam)
  const prazos = splitSerializedEntries(data.prazoMulta)
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

function section(title: string, children: ReactNode) {
  return (
    <section data-pdf-section="true" style={{ marginTop: 10 }}>
      <div
        style={{
          background: colors.navy,
          color: "#ffffff",
          fontSize: 17,
          fontWeight: 700,
          padding: "8px 14px",
          letterSpacing: 0.2,
          textAlign: "center",
        }}
      >
        {title}
      </div>
      <div>{children}</div>
    </section>
  )
}

function gridRow(columns: string, cells: ReactNode[], noBorder = false) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: columns,
        columnGap: 28,
        alignItems: "end",
        minHeight: 36,
        padding: "8px 6px 9px",
        borderBottom: noBorder ? "none" : `1px solid ${colors.line}`,
      }}
    >
      {cells}
    </div>
  )
}

function field(label: string, value: string) {
  return (
    <div style={{ minWidth: 0, lineHeight: 1.45 }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{label}: </span>
      <span style={{ fontSize: 13.5, color: value?.trim() ? colors.text : colors.muted, whiteSpace: "pre-wrap" }}>
        {fallback(value)}
      </span>
    </div>
  )
}

function signatureField(label: string) {
  return (
    <div style={{ display: "flex", alignItems: "end", gap: 10, minWidth: 0 }}>
      <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap" }}>{label}</span>
      <div style={{ flex: 1, borderBottom: `1px solid ${colors.line}`, height: 18 }} />
    </div>
  )
}

export default function FichaPdf({ data }: FichaPdfProps) {
  const processoLines = getProcessoLines(data)
  const multaBlocks = getMultaBlocks(data)

  return (
    <div style={pageStyle}>
      <div style={sheetStyle}>
        <section data-pdf-section="true" style={{ marginBottom: 14, borderBottom: `1px solid #d1d5db`, paddingBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 24, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ width: 8, height: 54, background: colors.orange }} />
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: colors.navy }}>FICHA DE VENDA</div>
                <div style={{ marginTop: 8, fontSize: 12.5, color: colors.muted }}>
                  Documento administrativo com dados completos da ficha.
                </div>
              </div>
            </div>

            <div style={{ borderLeft: `1px solid #d1d5db`, paddingLeft: 20 }}>
              <div
                style={{
                  background: colors.navy,
                  borderRadius: 12,
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <img
                  src="/logo.png"
                  alt="CABRICOP"
                  crossOrigin="anonymous"
                  style={{ height: 46, width: "auto", objectFit: "contain", display: "block" }}
                />
              </div>
            </div>
          </div>
        </section>

        {section("DADOS DO CLIENTE", (
          <>
            {gridRow("1.1fr 1fr", [field("Nome Completo", data.nomeCliente), field("Terceiros", data.terceiros)])}
            {gridRow("1fr 1fr", [field("Telefone", data.telefones), field("E-mail", data.email)])}
            {gridRow("1fr", [field("Endereço", data.endereco)])}
            {gridRow("0.7fr 1.3fr", [field("CEP", data.cep), field("CPF/CNPJ", formatCpfCnpj(data.cpfCnpj))])}
            {gridRow("0.9fr 1.1fr", [field("CNH", data.cnh), field("Nascimento", formatDate(data.dataNascimento))])}
            {gridRow("1fr", [field("Data da 1ª CNH", formatDate(data.dataPrimeiraCnh))])}
            {gridRow("1fr 1fr 1fr", [field("Nome do Consultor", data.nomeConsultor), field("Origem", data.origem), field("SNE", data.sne)], true)}
          </>
        ))}

        {section("DADOS DO PAGAMENTO", (
          <>
            {gridRow(
              "1fr 1fr",
              [
                field("Data do Contrato", formatDate(data.dataContrato)),
                field("Prazo", formatDate(data.prazoServico)),
              ]
            )}
            {gridRow(
              "1.1fr 1fr",
              [
                field("Forma", formatPaymentMethod(data.formaPagamento)),
                field("Banco", formatBank(data.banco)),
              ]
            )}
            {gridRow(
              "1fr 1fr 1fr",
              [
                field("Valor Total", formatCurrency(data.valorTotal)),
                field("Valor Entrada", formatCurrency(data.valorEntrada)),
                field("Valor Restante", formatCurrency(data.valorRestante)),
              ],
              true
            )}
          </>
        ))}

        {section("PROCESSOS", (
          <>
            {processoLines.map((line, index) => (
              <div key={`processo-${index}`}>
                {gridRow("0.95fr 1.1fr 0.95fr 0.8fr 0.9fr", [field("Instância", line.instanciaProcesso), field("Tipo do Processo", line.tipoProcesso), field("Nº do Processo", line.numeroProcesso), field("Data", formatDate(line.prazoProcesso)), signatureField("Visto")], index === processoLines.length - 1)}
              </div>
            ))}
          </>
        ))}

        {section("MULTAS", (
          <>
            {multaBlocks.map((block, blockIndex) => (
              <div key={`multa-${blockIndex}`}>
                {gridRow("0.9fr 1.1fr", [field("Placa", block.placa), field("RENAVAM", block.renavam)])}
                {getMultaLines(block).map((line, lineIndex) => (
                  <div key={`multa-line-${blockIndex}-${lineIndex}`}>
                    {gridRow("1fr 1fr 1fr 1fr 0.8fr 0.9fr", [field("Instância da Multa", line.instanciaMulta), field("Tipo de Multa", line.tipoMulta), field("Auto DETRAN", line.autoDetran), field("Auto RENAINF", line.autoRenainf), field("Prazo", formatDate(line.prazoMulta)), signatureField("Visto")], blockIndex === multaBlocks.length - 1 && lineIndex === getMultaLines(block).length - 1)}
                  </div>
                ))}
              </div>
            ))}
          </>
        ))}

        {section("OBSERVAÇÕES ADICIONAIS", (
          <>
            <div
              style={{
                minHeight: 42,
                padding: "6px 0",
                borderBottom: `1px solid ${colors.line}`,
                fontSize: 11.5,
                color: data.observacoes?.trim() ? colors.text : colors.muted,
                whiteSpace: "pre-wrap",
              }}
            >
              {fallback(data.observacoes)}
            </div>
            <div style={{ paddingTop: 8 }}>
              {gridRow("1fr 0.9fr", [<div key="empty" />, signatureField("Assinatura")], true)}
            </div>
          </>
        ))}
      </div>
    </div>
  )
}
