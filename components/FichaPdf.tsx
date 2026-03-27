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
      <section style={{ ...cardStyle, position: "relative", marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", minHeight: 300 }}>
          <div style={{ position: "relative", padding: "34px 40px 36px 40px", overflow: "hidden" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(135deg, rgba(242,140,24,0.20) 0%, rgba(255,255,255,0.92) 35%, rgba(255,255,255,0.98) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: -30,
                top: -40,
                bottom: -40,
                width: 46,
                background: `linear-gradient(180deg, ${colors.orange}, ${colors.orangeDark})`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 14,
                top: 0,
                bottom: 0,
                width: 10,
                backgroundImage: `repeating-linear-gradient(180deg, transparent 0 18px, ${colors.navy} 18px 24px)`,
                opacity: 0.45,
              }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "18px 22px",
                  borderRadius: 18,
                  background: colors.navy,
                  boxShadow: "0 10px 22px rgba(18, 61, 111, 0.18)",
                }}
              >
                <img
                  src="/logo.png"
                  alt="CABRICOP"
                  crossOrigin="anonymous"
                  style={{ width: 300, maxWidth: "100%", objectFit: "contain" }}
                />
              </div>
              <div
                style={{
                  marginTop: 28,
                  width: 420,
                  maxWidth: "100%",
                  borderTop: `4px solid ${colors.navy}`,
                  paddingTop: 18,
                }}
              >
                <div style={{ fontSize: 38, fontWeight: 900, color: colors.navy, letterSpacing: 0.6, textTransform: "uppercase" }}>FICHA DE VENDA</div>
                <div style={{ marginTop: 8, fontSize: 16, color: colors.muted }}>
                  Documento administrativo com dados completos do atendimento e do processo.
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              position: "relative",
              overflow: "hidden",
              background:
                "radial-gradient(circle at 74% 30%, rgba(255,221,170,0.96) 0%, rgba(242,140,24,0.74) 28%, rgba(18,61,111,0.96) 100%)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.12) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 70,
                top: 46,
                width: 240,
                height: 240,
                borderRadius: "50%",
                border: "18px solid rgba(255,255,255,0.32)",
                boxShadow: "0 0 0 18px rgba(255,255,255,0.08)",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 158,
                top: 132,
                width: 70,
                height: 70,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.88)",
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 178,
                top: 170,
                width: 230,
                height: 14,
                transform: "rotate(-18deg)",
                transformOrigin: "left center",
                background: "rgba(255,255,255,0.88)",
                borderRadius: 999,
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 24,
                top: 54,
                width: 150,
                height: 150,
                borderRadius: 22,
                border: "2px solid rgba(255,255,255,0.28)",
                transform: "rotate(14deg)",
                opacity: 0.55,
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 118,
                bottom: 20,
                width: 320,
                height: 100,
                borderRadius: 999,
                background: "rgba(255,255,255,0.12)",
                filter: "blur(14px)",
              }}
            />
          </div>
        </div>
      </section>

      <section style={{ ...cardStyle, marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "420px 1fr 150px 1fr", minHeight: 78 }}>
          <div
            style={{
              padding: "20px 24px",
              background: `linear-gradient(90deg, ${colors.orangeDark}, ${colors.orange})`,
              color: "#ffffff",
              fontSize: 24,
              fontWeight: 800,
              textAlign: "center",
              borderRight: `1px solid ${colors.line}`,
            }}
          >
            DATA DO CONTRATO
          </div>
          <div style={{ padding: "20px 24px", fontSize: 24, borderRight: `1px solid ${colors.line}` }}>{formatDate(data.dataContrato)}</div>
          <div
            style={{
              padding: "20px 24px",
              fontSize: 24,
              fontWeight: 800,
              color: colors.navy,
              borderRight: `1px solid ${colors.line}`,
              textAlign: "center",
            }}
          >
            PRAZO
          </div>
          <div style={{ padding: "20px 24px", fontSize: 24 }}>{formatDate(data.prazoServico)}</div>
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


