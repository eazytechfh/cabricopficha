import type { CSSProperties, ReactNode } from "react"

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
  vistoJuridico: string
  assinaturaVistoJuridico: string
  instanciaMulta: string
  autoDetran: string
  autoRenainf: string
  tipoMulta: string
  placa: string
  renavam: string
  prazoMulta: string
  vistoJuridicoMulta: string
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
  cream: "#fff8ef",
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
  fontFamily: 'Arial, sans-serif',
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

function fallback(value: string) {
  return value?.trim() || "-"
}

function formatDate(value: string) {
  if (!value) return "-"
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
  const background = tone === "navy" ? `linear-gradient(90deg, ${colors.navyDark}, ${colors.navy})` : `linear-gradient(90deg, ${colors.orangeDark}, ${colors.orange})`

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
        }}
      >
        {fallback(value)}
      </div>
    </div>
  )
}

function sectionCard(title: string, tone: "navy" | "orange", children: ReactNode) {
  return (
    <section style={{ ...cardStyle, marginTop: 24 }}>
      {sectionHeader(title, tone)}
      {children}
    </section>
  )
}

export default function FichaPdf({ data }: FichaPdfProps) {
  return (
    <div style={pageStyle}>
            <section style={{ ...cardStyle, marginBottom: 24, borderRadius: 16 }}>
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
          {infoCell("Valor de Entrada", formatCurrency(data.valorEntrada))}
          {infoCell("Valor Restante", formatCurrency(data.valorRestante), { span: 2 })}
        </div>
      )}

      {sectionCard(
        "PROCESSO",
        "navy",
        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 0.9fr" }}>
          <div style={{ borderRight: `1px solid ${colors.line}` }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              {infoCell("Instancia do Processo", data.instanciaProcesso)}
              {infoCell("Tipo do Processo", data.tipoProcesso)}
              {infoCell("No do Processo", data.numeroProcesso)}
              {infoCell("Prazo do Processo", formatDate(data.prazoProcesso))}
              {infoCell("Visto Juridico", data.vistoJuridico, { span: 2, minHeight: 78 })}
            </div>
          </div>

          <div style={{ padding: 24, background: "linear-gradient(180deg, #fffdfa 0%, #f6f2ea 100%)" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: colors.text, marginBottom: 14 }}>Assinatura Digital do Visto Juridico</div>
            <div
              style={{
                height: 214,
                border: `1px solid ${colors.line}`,
                borderRadius: 18,
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {data.assinaturaVistoJuridico ? (
                <img
                  src={data.assinaturaVistoJuridico}
                  alt="Assinatura digital"
                  crossOrigin="anonymous"
                  style={{ width: "100%", height: "100%", objectFit: "contain", background: "#ffffff" }}
                />
              ) : (
                <div style={{ textAlign: "center", color: colors.muted, fontSize: 18 }}>
                  <div style={{ marginBottom: 12 }}>Sem assinatura preenchida</div>
                  <div style={{ width: 220, borderTop: `2px solid ${colors.line}`, margin: "0 auto 10px" }} />
                  <div>Assinatura</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {sectionCard(
        "MAIS INFORMACOES (MULTAS)",
        "orange",
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {infoCell("Instancia da Multa", data.instanciaMulta)}
          {infoCell("Auto DETRAN", data.autoDetran)}
          {infoCell("Auto RENAINF", data.autoRenainf)}
          {infoCell("Tipo de Multa", data.tipoMulta)}
          {infoCell("Placa", data.placa)}
          {infoCell("RENAVAM", data.renavam)}
          {infoCell("Prazo da Multa", formatDate(data.prazoMulta))}
          {infoCell("Visto Juridico da Multa", data.vistoJuridicoMulta)}
        </div>
      )}

      {sectionCard(
        "OBSERVACOES ADICIONAIS",
        "orange",
        <div style={{ padding: 26, minHeight: 220, background: "rgba(255,255,255,0.96)", fontSize: 18, color: data.observacoes?.trim() ? colors.text : colors.muted, whiteSpace: "pre-wrap" }}>
          {fallback(data.observacoes)}
        </div>
      )}
    </div>
  )
}




