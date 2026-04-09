import type { CSSProperties, ReactNode } from "react"
import { splitSerializedEntries } from "@/lib/ficha-utils"

type FichaPdfData = {
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
  navy: "#123d6f",
  navyDark: "#0a2c52",
  orange: "#f28c18",
  orangeDark: "#d97100",
  line: "#d8c7b0",
  text: "#183153",
  muted: "#6b7280",
  panel: "#ffffff",
}

const pageStyle: CSSProperties = {
  width: 1120,
  minHeight: 1580,
  padding: 26,
  background: "linear-gradient(180deg, #f7f7f9 0%, #f2f0ec 100%)",
  color: colors.text,
  fontFamily: "Arial, sans-serif",
}

const cardStyle: CSSProperties = {
  background: colors.panel,
  border: `1px solid ${colors.line}`,
  borderRadius: 20,
  overflow: "hidden",
  boxShadow: "0 10px 24px rgba(16, 37, 63, 0.08)",
}

const sectionTitleLineStyle: CSSProperties = {
  flex: 1,
  height: 2,
  opacity: 0.35,
  background: "rgba(255,255,255,0.85)",
}

const formLineCardStyle: CSSProperties = {
  margin: 20,
  border: `1px solid ${colors.line}`,
  borderRadius: 16,
  background: "#fbfdff",
  overflow: "hidden",
}

const formLineHeaderStyle: CSSProperties = {
  display: "grid",
  gap: 0,
  background: "#ffffff",
}

const formLineCellStyle: CSSProperties = {
  padding: "12px 14px",
  borderRight: `1px solid ${colors.line}`,
  borderBottom: `1px solid ${colors.line}`,
  background: "#ffffff",
}

const formLineLabelStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: colors.text,
  marginBottom: 8,
}

const formLineValueStyle: CSSProperties = {
  fontSize: 16,
  color: colors.text,
  whiteSpace: "pre-wrap",
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
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0)
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

function sectionHeader(title: string, tone: "navy" | "orange" = "navy") {
  const background =
    tone === "navy"
      ? `linear-gradient(90deg, ${colors.navyDark}, ${colors.navy})`
      : `linear-gradient(90deg, ${colors.orangeDark}, ${colors.orange})`

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "16px 26px",
        background,
        color: "#ffffff",
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: 0.4,
      }}
    >
      <span>{title}</span>
      <div style={sectionTitleLineStyle} />
    </div>
  )
}

function infoCell(label: string, value: string, options?: { span?: number; minHeight?: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        minHeight: options?.minHeight || 66,
        borderRight: `1px solid ${colors.line}`,
        borderBottom: `1px solid ${colors.line}`,
        gridColumn: options?.span ? `span ${options.span}` : undefined,
      }}
    >
      <div
        style={{
          padding: "16px 18px",
          background: "linear-gradient(180deg, #fff2df 0%, #ffe4c2 100%)",
          borderRight: `1px solid ${colors.line}`,
          fontSize: 17,
          fontWeight: 700,
          color: colors.text,
        }}
      >
        {label}
      </div>
      <div
        style={{
          padding: "16px 18px",
          background: "rgba(255,255,255,0.92)",
          fontSize: 17,
          color: value?.trim() ? colors.text : colors.muted,
          whiteSpace: "pre-wrap",
        }}
      >
        {fallback(value)}
      </div>
    </div>
  )
}

function sectionCard(title: string, tone: "navy" | "orange", children: ReactNode) {
  return (
    <section data-pdf-section="true" style={{ ...cardStyle, marginTop: 24 }}>
      {sectionHeader(title, tone)}
      {children}
    </section>
  )
}

function getMultaBlocks(data: FichaPdfData) {
  const instancias = splitSerializedEntries(data.instanciaMulta)
  const autosDetran = splitSerializedEntries(data.autoDetran)
  const autosRenainf = splitSerializedEntries(data.autoRenainf)
  const tipos = splitSerializedEntries(data.tipoMulta)
  const placas = splitSerializedEntries(data.placa)
  const renavams = splitSerializedEntries(data.renavam)
  const prazos = splitSerializedEntries(data.prazoMulta)

  const maxLength = Math.max(
    instancias.length,
    autosDetran.length,
    autosRenainf.length,
    tipos.length,
    placas.length,
    renavams.length,
    prazos.length,
    1
  )

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

function getProcessoLines(data: FichaPdfData) {
  const instancias = data.instanciaProcesso ? data.instanciaProcesso.split("\n") : [""]
  const tipos = data.tipoProcesso ? data.tipoProcesso.split("\n") : [""]
  const numeros = data.numeroProcesso ? data.numeroProcesso.split("\n") : [""]
  const prazos = data.prazoProcesso ? data.prazoProcesso.split("\n") : [""]

  const maxLength = Math.max(instancias.length, tipos.length, numeros.length, prazos.length, 1)

  return Array.from({ length: maxLength }, (_, index) => ({
    instanciaProcesso: instancias[index] || "",
    tipoProcesso: tipos[index] || "",
    numeroProcesso: numeros[index] || "",
    prazoProcesso: prazos[index] || "",
  }))
}

function getMultaDetailLines(block: {
  instanciaMulta: string
  autoDetran: string
  autoRenainf: string
  tipoMulta: string
  prazoMulta: string
}) {
  const instancias = block.instanciaMulta ? block.instanciaMulta.split("\n") : [""]
  const autosDetran = block.autoDetran ? block.autoDetran.split("\n") : [""]
  const autosRenainf = block.autoRenainf ? block.autoRenainf.split("\n") : [""]
  const tipos = block.tipoMulta ? block.tipoMulta.split("\n") : [""]
  const prazos = block.prazoMulta ? block.prazoMulta.split("\n") : [""]

  const maxLength = Math.max(instancias.length, autosDetran.length, autosRenainf.length, tipos.length, prazos.length, 1)

  return Array.from({ length: maxLength }, (_, index) => ({
    instanciaMulta: instancias[index] || "",
    autoDetran: autosDetran[index] || "",
    autoRenainf: autosRenainf[index] || "",
    tipoMulta: tipos[index] || "",
    prazoMulta: prazos[index] || "",
  }))
}

function lineField(label: string, value: string, style?: CSSProperties) {
  return (
    <div style={{ ...formLineCellStyle, ...style }}>
      <div style={formLineLabelStyle}>{label}</div>
      <div style={{ ...formLineValueStyle, color: value?.trim() ? colors.text : colors.muted }}>{fallback(value)}</div>
    </div>
  )
}

function blankSignatureBox(title: string) {
  return (
    <div
      style={{
        ...formLineCardStyle,
        background: "#fffdfa",
      }}
    >
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${colors.line}` }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>{title}</div>
      </div>
      <div style={{ padding: 18 }}>
        <div
          style={{
            height: 150,
            border: `1px solid ${colors.line}`,
            borderRadius: 16,
            background: "#ffffff",
          }}
        />
      </div>
    </div>
  )
}

export default function FichaPdf({ data }: FichaPdfProps) {
  const multaBlocks = getMultaBlocks(data)
  const processoLines = getProcessoLines(data)

  return (
    <div style={pageStyle}>
      <section data-pdf-section="true" style={{ ...cardStyle, marginBottom: 24, borderRadius: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 86,
            padding: "16px 24px",
            background: "#ffffff",
            borderBottom: `1px solid ${colors.line}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 12,
                alignSelf: "stretch",
                borderRadius: 999,
                background: `linear-gradient(180deg, ${colors.orange}, ${colors.orangeDark})`,
              }}
            />
            <div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: colors.navy,
                  letterSpacing: 0.4,
                }}
              >
                FICHA DE VENDA
              </div>
              <div style={{ marginTop: 6, fontSize: 14, color: colors.muted }}>
                Documento administrativo com dados completos da ficha.
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingLeft: 24,
              marginLeft: 24,
              borderLeft: `1px solid ${colors.line}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 210,
                padding: "10px 16px",
                borderRadius: 14,
                background: `linear-gradient(90deg, ${colors.navyDark}, ${colors.navy})`,
              }}
            >
              <img
                src="/logo.png"
                alt="CABRICOP"
                crossOrigin="anonymous"
                style={{ height: 50, width: "auto", objectFit: "contain", display: "block" }}
              />
            </div>
          </div>
        </div>
      </section>

      {sectionCard(
        "DADOS DO CLIENTE",
        "navy",
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {infoCell("Nome Completo", data.nomeCliente, { span: 2 })}
          {infoCell("Terceiros", data.terceiros)}
          {infoCell("E-mail", data.email)}
          {infoCell("Telefone(s)", data.telefones)}
          {infoCell("Endereco", data.endereco)}
          {infoCell("CEP", data.cep)}
          {infoCell("CPF / CNPJ", formatCpfCnpj(data.cpfCnpj))}
          {infoCell("CNH", data.cnh)}
          {infoCell("Data de Nascimento", formatDate(data.dataNascimento))}
          {infoCell("Data da 1a CNH", formatDate(data.dataPrimeiraCnh))}
        </div>
      )}

      {sectionCard(
        "DADOS DO CONSULTOR",
        "orange",
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {infoCell("Nome do Consultor", data.nomeConsultor)}
          {infoCell("Origem", data.origem)}
          {infoCell("SNE", data.sne, { span: 2 })}
        </div>
      )}

      {sectionCard(
        "DADOS DO PAGAMENTO",
        "orange",
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {infoCell("Forma de Pagamento", formatPaymentMethod(data.formaPagamento))}
          {infoCell("Valor Total", formatCurrency(data.valorTotal))}
          {infoCell("Banco", formatBank(data.banco))}
          {infoCell("Valor de Entrada", data.valorEntrada ? formatCurrency(data.valorEntrada) : "-")}
          {infoCell("Valor Restante", data.valorRestante ? formatCurrency(data.valorRestante) : "-", { span: 2 })}
        </div>
      )}

      {sectionCard(
        "PROCESSOS",
        "navy",
        <div style={{ paddingBottom: 4 }}>
          {processoLines.map((line, index) => (
            <div key={`processo-pdf-${index}`} style={formLineCardStyle}>
              <div
                style={{
                  ...formLineHeaderStyle,
                  gridTemplateColumns: "1.1fr 1.2fr 1.1fr 0.9fr",
                }}
              >
                {lineField("Instancia do Processo", line.instanciaProcesso)}
                {lineField("Tipo do Processo", line.tipoProcesso)}
                {lineField("No do Processo", line.numeroProcesso)}
                {lineField("Prazo", formatDate(line.prazoProcesso), { borderRight: "none" })}
              </div>
            </div>
          ))}

          {blankSignatureBox("Assinatura Digital do Visto Juridico")}
        </div>
      )}

      {sectionCard(
        "MULTAS",
        "orange",
        <div>
          {multaBlocks.map((block, index) => (
            <div
              key={`multa-pdf-${index}`}
              style={{ paddingBottom: 4 }}
            >
              <div style={formLineCardStyle}>
                <div
                  style={{
                    ...formLineHeaderStyle,
                    gridTemplateColumns: "1fr 1fr",
                  }}
                >
                  {lineField("Placa", block.placa)}
                  {lineField("RENAVAM", block.renavam, { borderRight: "none" })}
                </div>

                {getMultaDetailLines(block).map((line, lineIndex, allLines) => (
                  <div
                    key={`multa-line-${index}-${lineIndex}`}
                    style={{
                      ...formLineHeaderStyle,
                      gridTemplateColumns: "1fr 1fr 1fr 1fr 0.95fr",
                    }}
                  >
                    {lineField("Instancia da Multa", line.instanciaMulta, { borderBottom: lineIndex === allLines.length - 1 ? "none" : formLineCellStyle.borderBottom })}
                    {lineField("Auto DETRAN", line.autoDetran, { borderBottom: lineIndex === allLines.length - 1 ? "none" : formLineCellStyle.borderBottom })}
                    {lineField("Auto RENAINF", line.autoRenainf, { borderBottom: lineIndex === allLines.length - 1 ? "none" : formLineCellStyle.borderBottom })}
                    {lineField("Tipo de Multa", line.tipoMulta, { borderBottom: lineIndex === allLines.length - 1 ? "none" : formLineCellStyle.borderBottom })}
                    {lineField("Prazo", formatDate(line.prazoMulta), { borderRight: "none", borderBottom: lineIndex === allLines.length - 1 ? "none" : formLineCellStyle.borderBottom })}
                  </div>
                ))}
              </div>

              {blankSignatureBox("Assinatura Digital")}
            </div>
          ))}
        </div>
      )}

      {sectionCard(
        "OBSERVACOES ADICIONAIS",
        "orange",
        <div
          style={{
            padding: 26,
            minHeight: 220,
            background: "rgba(255,255,255,0.96)",
            fontSize: 18,
            color: data.observacoes?.trim() ? colors.text : colors.muted,
            whiteSpace: "pre-wrap",
          }}
        >
          {fallback(data.observacoes)}
        </div>
      )}
    </div>
  )
}
