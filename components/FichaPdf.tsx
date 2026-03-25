import type { CSSProperties } from "react"

type PaymentBank = "asaas" | "rede" | "itau" | "outros"
type PaymentMethod = "credito" | "debito" | "pix" | "transferencia" | "ted" | "especie" | "deposito" | "cheque"

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
  vistoJuridico: string
  instanciaMulta: string
  autoDetran: string
  autoRenainf: string
  tipoMulta: string
  placa: string
  renavam: string
  prazoMulta: string
  vistoJuridicoMulta: string
}

type FichaPdfProps = {
  data: FichaPdfData
}

const paymentColumns: Array<{ key: PaymentMethod; label: string }> = [
  { key: "credito", label: "CRÉDITO" },
  { key: "debito", label: "DÉBITO" },
  { key: "pix", label: "PIX" },
  { key: "transferencia", label: "TRANSFERÊNCIA" },
  { key: "ted", label: "TED" },
  { key: "especie", label: "ESPÉCIE" },
  { key: "deposito", label: "DEPÓSITO" },
  { key: "cheque", label: "CHEQUE" },
]

const paymentRows: Array<{ key: PaymentBank; label: string; color?: string }> = [
  { key: "asaas", label: "ASAAS", color: "#1d4ed8" },
  { key: "rede", label: "REDE", color: "#dc2626" },
  { key: "itau", label: "ITAÚ", color: "#ea580c" },
  { key: "outros", label: "OUTROS" },
]

function formatDate(value: string) {
  if (!value) return ""
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

function normalizeBank(value: string): PaymentBank | null {
  if (value === "asaas" || value === "rede" || value === "itau" || value === "outros") {
    return value
  }
  return null
}

function normalizeMethod(value: string): PaymentMethod | null {
  if (
    value === "credito" ||
    value === "debito" ||
    value === "pix" ||
    value === "transferencia" ||
    value === "ted" ||
    value === "especie" ||
    value === "deposito" ||
    value === "cheque"
  ) {
    return value
  }
  return null
}

function cellStyle(extra?: CSSProperties): CSSProperties {
  return {
    border: "1px solid #d1d5db",
    padding: "4px 6px",
    fontSize: 11,
    lineHeight: 1.2,
    verticalAlign: "middle",
    ...extra,
  }
}

export default function FichaPdf({ data }: FichaPdfProps) {
  const selectedBank = normalizeBank(data.banco)
  const selectedMethod = normalizeMethod(data.formaPagamento)

  return (
    <div
      style={{
        width: 1120,
        background: "#ffffff",
        color: "#000000",
        fontFamily: "Arial, sans-serif",
        fontSize: 11,
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <tbody>
          <tr>
            <td style={{ ...cellStyle(), width: "20%", textAlign: "center", color: "#ff0000", fontSize: 14, fontWeight: 700 }}>
              DATA:
              <div style={{ marginTop: 18 }}>{formatDate(data.dataContrato)}</div>
            </td>
            <td style={{ ...cellStyle(), width: "60%", height: 92, textAlign: "center" }}>
              <img
                src="/logo.png"
                alt="Logo CABRICOP"
                crossOrigin="anonymous"
                style={{ maxHeight: 70, width: "auto", objectFit: "contain", display: "inline-block" }}
              />
            </td>
            <td style={{ ...cellStyle(), width: "20%", textAlign: "center", color: "#ff0000", fontSize: 14, fontWeight: 700 }}>
              PRAZO:
              <div style={{ marginTop: 18 }}>{formatDate(data.prazoServico)}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <tbody>
          <tr>
            <td style={{ ...cellStyle({ width: "12%", fontWeight: 700 }) }}>NOME:</td>
            <td style={{ ...cellStyle({ width: "88%", textAlign: "center", fontWeight: 700 }) }} colSpan={7}>
              {data.nomeCliente}
            </td>
          </tr>
          <tr>
            <td style={{ ...cellStyle({ fontWeight: 700 }) }}>TERCEIROS:</td>
            <td style={cellStyle()} colSpan={7}>{data.terceiros}</td>
          </tr>
          <tr>
            <td style={{ ...cellStyle({ fontWeight: 700 }) }}>TELEFONES:</td>
            <td style={{ ...cellStyle({ textAlign: "center" }), width: "35%" }} colSpan={3}>{data.telefones}</td>
            <td style={{ ...cellStyle({ width: "12%", fontWeight: 700 }) }}>E-MAIL:</td>
            <td style={cellStyle()} colSpan={3}>{data.email}</td>
          </tr>
          <tr>
            <td style={{ ...cellStyle({ fontWeight: 700 }) }}>ENDEREÇO:</td>
            <td style={{ ...cellStyle({ textAlign: "center" }), width: "70%" }} colSpan={6}>{data.endereco}</td>
            <td style={{ ...cellStyle({ width: "18%", textAlign: "center" }) }}>
              <span style={{ fontWeight: 700 }}>CEP:</span> {data.cep}
            </td>
          </tr>
          <tr>
            <td style={{ ...cellStyle({ fontWeight: 700 }) }}>CPF / CNPJ:</td>
            <td style={cellStyle()}>{data.cpfCnpj}</td>
            <td style={{ ...cellStyle({ fontWeight: 700 }) }}>CNH:</td>
            <td style={cellStyle()}>{data.cnh}</td>
            <td style={{ ...cellStyle({ fontWeight: 700 }) }}>NASCIMENTO:</td>
            <td style={cellStyle()}>{formatDate(data.dataNascimento)}</td>
            <td style={{ ...cellStyle({ fontWeight: 700 }) }}>DATA DA 1ª CNH:</td>
            <td style={cellStyle()}>{formatDate(data.dataPrimeiraCnh)}</td>
          </tr>
          <tr>
            <td style={{ ...cellStyle({ fontWeight: 700 }) }}>CONSULTOR:</td>
            <td style={cellStyle()}>{data.nomeConsultor}</td>
            <td style={{ ...cellStyle({ fontWeight: 700 }) }}>ORIGEM:</td>
            <td style={cellStyle()}>{data.origem}</td>
            <td style={{ ...cellStyle({ fontWeight: 700 }) }}>SNE:</td>
            <td style={cellStyle()} colSpan={3}>{data.sne}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", marginTop: 18 }}>
        <tbody>
          <tr>
            <td style={{ ...cellStyle({ width: "12%", fontWeight: 700, textAlign: "center" }) }}>PAGAMENTO</td>
            {paymentColumns.map((column) => (
              <td key={column.key} style={{ ...cellStyle({ textAlign: "center", fontWeight: 700 }) }}>
                {column.label}
              </td>
            ))}
          </tr>
          {paymentRows.map((row) => (
            <tr key={row.key}>
              <td style={{ ...cellStyle({ fontWeight: 700, color: row.color || "#000000", textAlign: "center" }) }}>
                {row.label}
              </td>
              {paymentColumns.map((column) => (
                <td key={`${row.key}-${column.key}`} style={{ ...cellStyle({ textAlign: "center", fontWeight: 700 }) }}>
                  {selectedBank === row.key && selectedMethod === column.key ? formatCurrency(data.valorTotal) : ""}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td style={{ ...cellStyle({ fontWeight: 700, color: "#ff0000" }) }}>VALOR TOTAL:</td>
            <td style={cellStyle()} colSpan={8}>
              <div style={{ color: "#ff0000", fontWeight: 700, textAlign: "center" }}>{formatCurrency(data.valorTotal)}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", marginTop: 18 }}>
        <tbody>
          <tr>
            <td style={{ ...cellStyle({ color: "#ea580c", textAlign: "center", fontWeight: 700 }) }}>INSTÂNCIA DO PROCESSO</td>
            <td style={{ ...cellStyle({ color: "#ea580c", textAlign: "center", fontWeight: 700 }) }}>TIPO DO PROCESSO</td>
            <td style={{ ...cellStyle({ color: "#ea580c", textAlign: "center", fontWeight: 700 }) }}>Nº DO PROCESSO</td>
            <td style={{ ...cellStyle({ color: "#ea580c", textAlign: "center", fontWeight: 700 }) }}>PRAZO</td>
            <td style={{ ...cellStyle({ color: "#ea580c", textAlign: "center", fontWeight: 700 }) }}>VISTO JURÍDICO</td>
          </tr>
          <tr>
            <td style={{ ...cellStyle({ textAlign: "center", fontWeight: 700 }) }}>{data.instanciaProcesso}</td>
            <td style={{ ...cellStyle({ textAlign: "center", fontWeight: 700 }) }}>{data.tipoProcesso}</td>
            <td style={{ ...cellStyle({ textAlign: "center", fontWeight: 700 }) }}>{data.numeroProcesso}</td>
            <td style={{ ...cellStyle({ textAlign: "center", fontWeight: 700 }) }}>{formatDate(data.prazoProcesso)}</td>
            <td style={{ ...cellStyle({ textAlign: "center", fontWeight: 700 }) }}>{data.vistoJuridico}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", marginTop: 18 }}>
        <tbody>
          <tr>
            <td style={{ ...cellStyle({ color: "#ea580c", textAlign: "center", fontWeight: 700 }) }}>INSTÂNCIA DA MULTA</td>
            <td style={{ ...cellStyle({ color: "#ea580c", textAlign: "center", fontWeight: 700 }) }}>AUTO DETRAN</td>
            <td style={{ ...cellStyle({ color: "#ea580c", textAlign: "center", fontWeight: 700 }) }}>AUTO RENAINF</td>
            <td style={{ ...cellStyle({ color: "#ea580c", textAlign: "center", fontWeight: 700 }) }}>TIPO DE MULTA</td>
            <td style={{ ...cellStyle({ color: "#ea580c", textAlign: "center", fontWeight: 700 }) }}>PLACA</td>
            <td style={{ ...cellStyle({ color: "#ea580c", textAlign: "center", fontWeight: 700 }) }}>RENAVAM</td>
            <td style={{ ...cellStyle({ color: "#ea580c", textAlign: "center", fontWeight: 700 }) }}>PRAZO</td>
            <td style={{ ...cellStyle({ color: "#ea580c", textAlign: "center", fontWeight: 700 }) }}>VISTO JURÍDICO</td>
          </tr>
          <tr>
            <td style={{ ...cellStyle({ textAlign: "center", fontWeight: 700 }) }}>{data.instanciaMulta}</td>
            <td style={{ ...cellStyle({ textAlign: "center", fontWeight: 700 }) }}>{data.autoDetran}</td>
            <td style={{ ...cellStyle({ textAlign: "center", fontWeight: 700 }) }}>{data.autoRenainf}</td>
            <td style={{ ...cellStyle({ textAlign: "center", fontWeight: 700 }) }}>{data.tipoMulta}</td>
            <td style={{ ...cellStyle({ textAlign: "center", fontWeight: 700 }) }}>{data.placa}</td>
            <td style={{ ...cellStyle({ textAlign: "center", fontWeight: 700 }) }}>{data.renavam}</td>
            <td style={{ ...cellStyle({ textAlign: "center", fontWeight: 700 }) }}>{formatDate(data.prazoMulta)}</td>
            <td style={{ ...cellStyle({ textAlign: "center", fontWeight: 700 }) }}>{data.vistoJuridicoMulta}</td>
          </tr>
          {Array.from({ length: 5 }).map((_, index) => (
            <tr key={`empty-row-${index}`}>
              {Array.from({ length: 8 }).map((__, cellIndex) => (
                <td key={`empty-cell-${index}-${cellIndex}`} style={{ ...cellStyle({ height: 26 }) }} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
