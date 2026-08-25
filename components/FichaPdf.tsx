import type { CSSProperties, ReactNode } from "react"
import { normalizeMultasProcessoLabels, splitSerializedEntries } from "@/lib/ficha-utils"
import { parsePaymentEntries, parsePaymentAmount } from "@/lib/payment-details"

export type FichaPdfData = {
  dataContrato: string
  prazoServico: string
  nomeCliente: string
  terceiros: string
  telefones: string
  endereco: string
  numeroEndereco: string
  complementoEndereco: string
  cep: string
  municipio: string
  uf: string
  cpfCnpj: string
  cnh: string
  dataNascimento: string
  dataPrimeiraCnh: string
  nacionalidade: string
  estadoCivil: string
  profissao: string
  email: string
  nomeConsultor: string
  origem: string
  sne: string
  formaPagamento: string
  banco: string
  pagamentos: string
  valorTotal: number
  valorEntrada: number
  valorRestante: number
  observacaoValorRestante: string
  clausulaAdicional: string
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
  placaProprietario: string
  cpfProprietario: string
  renavam: string
  prazoMulta: string
  vistoJuridicoMulta: string
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

function fallback(value?: string) {
  return value?.trim() || "-"
}

function formatDate(value: string) {
  if (!value) return "-"
  if (value === "VENCIDA") return "Vencida"
  if (value === "Vencida" || value === "Revisão de Ato" || value === "AG Penalidade") return value
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

function formatAddress(value: string, numero?: string, complemento?: string, municipio?: string, uf?: string) {
  const parts = [fallback(value), fallback(numero), fallback(complemento), fallback(municipio), fallback(uf)]
    .filter((part, index) => part && part !== "-" ? true : index === 0)
  return parts.join(" - ")
}

function splitLines(value: string) {
  if (!value) return [""]
  return value.split("\n")
}

function getProcessoLines(data: FichaPdfData) {
  const instancias = splitLines(data.instanciaProcesso)
  const tipos = splitLines(data.tipoProcesso)
  const numeros = splitLines(data.numeroProcesso)
  const multas = splitLines(normalizeMultasProcessoLabels(data.vistoJuridico))
  const prazos = splitLines(data.prazoProcesso)
  const maxLength = Math.max(instancias.length, tipos.length, numeros.length, multas.length, prazos.length, 1)

  return Array.from({ length: maxLength }, (_, index) => ({
    instanciaProcesso: instancias[index] || "",
    tipoProcesso: tipos[index] || "",
    numeroProcesso: numeros[index] || "",
    multasProcesso: multas[index] || "",
    prazoProcesso: prazos[index] || "",
  }))
}

function getMultaBlocks(data: FichaPdfData) {
  const instancias = splitSerializedEntries(data.instanciaMulta)
  const autosDetran = splitSerializedEntries(data.autoDetran)
  const autosRenainf = splitSerializedEntries(data.autoRenainf)
  const tipos = splitSerializedEntries(data.tipoMulta)
  const placas = splitSerializedEntries(data.placa)
  const placasProprietario = splitSerializedEntries(data.placaProprietario)
  const cpfsProprietario = splitSerializedEntries(data.cpfProprietario)
  const renavams = splitSerializedEntries(data.renavam)
  const prazos = splitSerializedEntries(data.prazoMulta)
  const processosVinculados = splitSerializedEntries(data.vistoJuridicoMulta)
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

function section(title: string, children: ReactNode) {
  const sectionBarHeight = 38

  return (
    <section data-pdf-section="true" style={{ marginTop: 10 }}>
      <div
        style={{
          background: colors.navy,
          color: "#ffffff",
          fontSize: 16.5,
          fontWeight: 700,
          height: sectionBarHeight,
          padding: "0 14px",
          letterSpacing: 0.2,
          position: "relative",
        }}
      >
        <span
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            textAlign: "center",
            lineHeight: `${sectionBarHeight - 4}px`,
            paddingTop: 1,
            whiteSpace: "nowrap",
            boxSizing: "border-box",
          }}
        >
          {title}
        </span>
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

function nowrapField(label: string, value: string) {
  return (
    <div style={{ minWidth: 0, lineHeight: 1.45, whiteSpace: "nowrap" }}>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{label}: </span>
      <span style={{ fontSize: 13.5, color: value?.trim() ? colors.text : colors.muted }}>
        {fallback(value)}
      </span>
    </div>
  )
}

function centeredField(label: string, value: string) {
  return (
    <div style={{ minWidth: 0, lineHeight: 1.35, textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
      <div
        style={{
          marginTop: 3,
          fontSize: 13.5,
          color: value?.trim() ? colors.text : colors.muted,
          whiteSpace: "pre-wrap",
        }}
      >
        {fallback(value)}
      </div>
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
  const paymentLines = parsePaymentEntries(data.pagamentos, { formaPagamento: data.formaPagamento, banco: data.banco, valorEntrada: String(data.valorEntrada) })
  const processoLines = getProcessoLines(data)
  const multaBlocks = getMultaBlocks(data)

  return (
    <div style={pageStyle}>
      <div style={sheetStyle}>
        <section data-pdf-section="true" style={{ marginBottom: 14, borderBottom: `1px solid #d1d5db`, paddingBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 24, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.6 }}>
                Data do Contrato
              </div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: colors.navy }}>
                {formatDate(data.dataContrato)}
              </div>
            </div>

            <div
              style={{
                background: colors.navy,
                borderRadius: 12,
                padding: "12px 24px",
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

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.6 }}>
                Prazo
              </div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: colors.navy }}>
                {formatDate(data.prazoServico)}
              </div>
            </div>
          </div>
        </section>

        {section("DADOS DO CLIENTE", (
          <>
            {gridRow("1.1fr 1fr", [field("Nome Completo", data.nomeCliente), field("Terceiros", data.terceiros)])}
            {gridRow("1fr 1fr", [field("Telefone", data.telefones), field("E-mail", data.email)])}
            {gridRow("0.7fr 1.3fr", [field("CEP", data.cep), field("Endereço", formatAddress(data.endereco, data.numeroEndereco, data.complementoEndereco, data.municipio, data.uf))])}
            {gridRow("0.75fr 1.05fr 0.2fr", [field("CPF/CNPJ", formatCpfCnpj(data.cpfCnpj)), field("CNH", data.cnh), field("UF", data.uf)])}
            {gridRow("1fr 1fr", [field("Município", data.municipio), field("Nascimento", formatDate(data.dataNascimento))])}
            {gridRow("1fr", [field("Data da 1ª CNH", formatDate(data.dataPrimeiraCnh))])}
            {gridRow("1fr 1fr 1fr", [field("Nacionalidade", data.nacionalidade), field("Estado Civil", data.estadoCivil), field("Profissão", data.profissao)])}
            {gridRow("1fr 1fr 1fr", [field("Nome do Consultor", data.nomeConsultor), field("Origem", data.origem), field("SNE", data.sne)], true)}
          </>
        ))}

        {section("DADOS DO PAGAMENTO", (
          <>
            {paymentLines.map((payment, index) => gridRow("1.1fr 1fr 1fr", [field(`Pagamento ${index + 1}`, formatPaymentMethod(payment.formaPagamento)), field("Banco / Operadora", formatBank(payment.banco)), field("Valor", formatCurrency(parsePaymentAmount(payment.valor)))], false))}
            {gridRow(
              "1fr 1fr 1fr",
              [
                field("Valor Total", formatCurrency(data.valorTotal)),
                field("Total Pago", formatCurrency(data.valorEntrada)),
                field("Valor Restante", formatCurrency(data.valorRestante)),
              ],
              !data.observacaoValorRestante?.trim()
            )}
            {data.valorRestante > 0 && data.observacaoValorRestante?.trim()
              ? gridRow("1fr", [field("Observação Valor Restante", data.observacaoValorRestante)], true)
              : null}
          </>
        ))}

        {section("PROCESSOS", (
          <>
            {processoLines.map((line, index) => (
              <div key={`processo-${index}`}>
                {gridRow("1.15fr 1fr 0.95fr 1fr 0.72fr 0.72fr", [nowrapField("Instância", line.instanciaProcesso), field("Tipo do Processo", line.tipoProcesso), field("Nº", line.numeroProcesso.toUpperCase()), field("Multas do Processo", normalizeMultasProcessoLabels(line.multasProcesso, true)), field("Prazo", formatDate(line.prazoProcesso)), signatureField("Visto")], index === processoLines.length - 1)}
              </div>
            ))}
          </>
        ))}

        {section("MULTAS", (
          <>
            {multaBlocks.map((block, blockIndex) => (
              <div key={`multa-${blockIndex}`}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 32,
                    minHeight: 36,
                    padding: "8px 6px 9px",
                    borderBottom: `1px solid ${colors.line}`,
                  }}
                >
                  <div style={{ width: 170 }}>{centeredField("PLACA", block.placa)}</div>
                  {block.placaProprietario !== "sim" ? (
                    <div style={{ width: 190 }}>{centeredField("CPF PROPRIETARIO", block.cpfProprietario)}</div>
                  ) : null}
                  <div style={{ width: 170 }}>{centeredField("RENAVAM", block.renavam)}</div>
                </div>
                {getMultaLines(block).map((line, lineIndex) => (
                  <div key={`multa-line-${blockIndex}-${lineIndex}`}>
                    {gridRow("1fr 0.9fr 0.9fr 0.9fr 0.75fr 0.8fr", [field("Instância", line.instanciaMulta), field("Tipo", line.tipoMulta), field("Detran", line.autoDetran), field("Renainf", line.autoRenainf), field("Prazo", formatDate(line.prazoMulta)), signatureField("Visto")], blockIndex === multaBlocks.length - 1 && lineIndex === getMultaLines(block).length - 1)}
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
          </>
        ))}

        {section("CLÁUSULA ADICIONAL", (
          <>
            <div
              style={{
                minHeight: 42,
                padding: "6px 0",
                borderBottom: `1px solid ${colors.line}`,
                fontSize: 11.5,
                color: data.clausulaAdicional?.trim() ? colors.text : colors.muted,
                whiteSpace: "pre-wrap",
              }}
            >
              {fallback(data.clausulaAdicional)}
            </div>
          </>
        ))}
      </div>
    </div>
  )
}
