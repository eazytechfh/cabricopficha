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
  navy: "#193a67",
  orange: "#f29a17",
  line: "#8f99a8",
  text: "#1a1f2d",
  muted: "#6b7280",
  paper: "#ffffff",
}

const pageStyle: CSSProperties = {
  width: 1120,
  minHeight: 1580,
  padding: 28,
  background: "#f5f5f5",
  color: colors.text,
  fontFamily: "Arial, sans-serif",
}

const sheetStyle: CSSProperties = {
  background: colors.paper,
  padding: 8,
}

const topCardStyle: CSSProperties = {
  borderBottom: `1px solid #d4d8df`,
  paddingBottom: 18,
  marginBottom: 18,
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

function sectionTitle(title: string) {
  return (
    <div
      style={{
        background: colors.navy,
        color: "#ffffff",
        fontSize: 20,
        fontWeight: 700,
        padding: "8px 12px",
        marginTop: 18,
        marginBottom: 10,
      }}
    >
      {title}
    </div>
  )
}

function lineRow(items: Array<{ label: string; value: string; flex?: number }>, options?: { noBorder?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 16,
        minHeight: 42,
        padding: "6px 0 8px",
        borderBottom: options?.noBorder ? "none" : `1px solid ${colors.line}`,
      }}
    >
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} style={{ flex: item.flex || 1, minWidth: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: colors.text }}>{item.label}: </span>
          <span style={{ fontSize: 17, color: item.value?.trim() ? colors.text : colors.muted, whiteSpace: "pre-wrap" }}>
            {fallback(item.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

function signatureLine(label: string) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, minWidth: 220 }}>
      <span style={{ fontSize: 17, fontWeight: 700 }}>{label}</span>
      <div style={{ flex: 1, borderBottom: `2px solid ${colors.line}`, height: 28 }} />
    </div>
  )
}

function sectionBlock(children: ReactNode) {
  return (
    <section data-pdf-section="true">
      {children}
    </section>
  )
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

export default function FichaPdf({ data }: FichaPdfProps) {
  const processoLines = getProcessoLines(data)
  const multaBlocks = getMultaBlocks(data)

  return (
    <div style={pageStyle}>
      <div style={sheetStyle}>
        {sectionBlock(
          <div style={topCardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 18, flex: 1 }}>
                <div style={{ width: 10, height: 92, background: colors.orange }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 34, fontWeight: 800, color: colors.navy }}>FICHA DE VENDA</div>
                  <div style={{ marginTop: 12, fontSize: 14, color: colors.muted }}>
                    Documento administrativo com dados completos da Ficha.
                  </div>
                </div>
              </div>

              <div
                style={{
                  paddingLeft: 28,
                  marginLeft: 8,
                  borderLeft: `1px solid #c8cdd6`,
                }}
              >
                <div
                  style={{
                    background: colors.navy,
                    borderRadius: 18,
                    padding: "14px 24px",
                    minWidth: 250,
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src="/logo.png"
                    alt="CABRICOP"
                    crossOrigin="anonymous"
                    style={{ height: 56, width: "auto", objectFit: "contain", display: "block" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {sectionBlock(
          <div>
            {sectionTitle("DADOS DO CLIENTE")}
            {lineRow([
              { label: "Nome Completo", value: data.nomeCliente, flex: 1.2 },
              { label: "Terceiros", value: data.terceiros, flex: 1 },
            ])}
            {lineRow([{ label: "Telefone", value: data.telefones }, { label: "E-mail", value: data.email }])}
            {lineRow([{ label: "Endereço", value: data.endereco }])}
            {lineRow([{ label: "CEP", value: data.cep }, { label: "CPF/CNPJ", value: formatCpfCnpj(data.cpfCnpj) }])}
            {lineRow([{ label: "CNH", value: data.cnh }, { label: "Nascimento", value: formatDate(data.dataNascimento) }])}
            {lineRow([{ label: "Data da 1ª CNH", value: formatDate(data.dataPrimeiraCnh) }])}
          </div>
        )}

        {sectionBlock(
          <div>
            {sectionTitle("DADOS DO CONSULTOR")}
            {lineRow([{ label: "Consultor", value: data.nomeConsultor }])}
            {lineRow([{ label: "Origem", value: data.origem }])}
            {lineRow([{ label: "SNE", value: data.sne }])}
          </div>
        )}

        {sectionBlock(
          <div>
            {sectionTitle("DADOS DO PAGAMENTO")}
            {lineRow([
              { label: "Forma", value: formatPaymentMethod(data.formaPagamento) },
              { label: "Banco", value: formatBank(data.banco) },
              { label: "Valor Total", value: formatCurrency(data.valorTotal) },
              { label: "Valor Entrada", value: formatCurrency(data.valorEntrada) },
            ])}
            {lineRow([
              { label: "Valor Restante", value: formatCurrency(data.valorRestante), flex: 1.1 },
              { label: "Data do Contrato", value: formatDate(data.dataContrato) },
              { label: "Prazo", value: formatDate(data.prazoServico) },
            ])}
          </div>
        )}

        {sectionBlock(
          <div>
            {sectionTitle("PROCESSOS")}
            {processoLines.map((line, index) => (
              <div key={`processo-${index}`} style={{ marginBottom: 2 }}>
                {lineRow([
                  { label: "Instância", value: line.instanciaProcesso },
                  { label: "Tipo do Processo", value: line.tipoProcesso, flex: 1.4 },
                ])}
                {lineRow(
                  [
                    { label: "Nº do Processo", value: line.numeroProcesso },
                    { label: "Data", value: formatDate(line.prazoProcesso) },
                    { label: "Assinatura Digital", value: "", flex: 1.1 },
                  ],
                  { noBorder: index === processoLines.length - 1 }
                )}
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -30, marginBottom: 6 }}>
              {signatureLine("")}
            </div>
          </div>
        )}

        {sectionBlock(
          <div>
            {sectionTitle("MULTAS")}
            {multaBlocks.map((block, blockIndex) => (
              <div key={`multa-${blockIndex}`} style={{ marginBottom: 8 }}>
                {lineRow([
                  { label: "Placa", value: block.placa },
                  { label: "RENAVAM", value: block.renavam },
                ])}

                {getMultaLines(block).map((line, lineIndex) => (
                  <div key={`multa-line-${blockIndex}-${lineIndex}`}>
                    {lineRow([
                      { label: "Instância da Multa", value: line.instanciaMulta },
                      { label: "Tipo de Multa", value: line.tipoMulta },
                      { label: "Assinatura Digital", value: "", flex: 1.1 },
                    ])}
                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -30, marginBottom: 6 }}>
                      {signatureLine("")}
                    </div>
                    {lineRow([{ label: "Auto DETRAN", value: line.autoDetran }])}
                    {lineRow([{ label: "Auto RENAINF", value: line.autoRenainf }])}
                    {lineRow(
                      [{ label: "Prazo", value: formatDate(line.prazoMulta) }],
                      { noBorder: blockIndex === multaBlocks.length - 1 && lineIndex === getMultaLines(block).length - 1 }
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {sectionBlock(
          <div>
            {sectionTitle("OBSERVAÇÕES ADICIONAIS")}
            <div
              style={{
                minHeight: 80,
                padding: "8px 0 10px",
                borderBottom: `1px solid ${colors.line}`,
                whiteSpace: "pre-wrap",
                fontSize: 17,
                color: data.observacoes?.trim() ? colors.text : colors.muted,
              }}
            >
              {fallback(data.observacoes)}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              {signatureLine("Assinatura")}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
