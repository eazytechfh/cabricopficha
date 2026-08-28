export const FICHA_CHANGE_LABELS: Record<string, string> = {
  dataContrato: "Data do Contrato",
  prazoServico: "Prazo",
  nomeCliente: "Nome Completo",
  terceiros: "Terceiros",
  telefones: "Telefone(s)",
  endereco: "Endereco",
  numeroEndereco: "Numero",
  complementoEndereco: "Complemento",
  cep: "CEP",
  municipio: "Municipio",
  uf: "UF",
  cpfCnpj: "CPF/CNPJ",
  cnh: "CNH",
  dataNascimento: "Data de Nascimento",
  dataPrimeiraCnh: "Data da 1a CNH",
  nacionalidade: "Nacionalidade",
  estadoCivil: "Estado Civil",
  profissao: "Profissao",
  email: "E-mail",
  nomeConsultor: "Nome do Consultor",
  origem: "Origem",
  sne: "SNE",
  formaPagamento: "Forma de Pagamento",
  banco: "Banco",
  bancoOutro: "Outro Banco",
  pagamentos: "Pagamentos",
  valorTotal: "Valor Total",
  valorEntrada: "Valor de Entrada",
  valorRestante: "Valor Restante",
  observacaoValorRestante: "Observacao do Valor Restante",
  instanciaProcesso: "Instancia do Processo",
  tipoProcesso: "Tipo do Processo",
  tipoOutroServico: "Tipo do Servico",
  poderesOutroServico: "Poderes",
  numeroProcesso: "No do Processo",
  prazoProcesso: "Prazo do Processo",
  vistoJuridico: "Multas do Processo",
  assinaturaVistoJuridico: "Assinatura Visto Juridico",
  instanciaMulta: "Instancia da Multa",
  autoDetran: "Auto Detran",
  autoRenainf: "Auto Renainf",
  tipoMulta: "Tipo de Multa",
  placa: "Placa",
  placaProprietario: "Placa Proprietario",
  cpfProprietario: "CPF do Proprietario",
  renavam: "Renavam",
  prazoMulta: "Prazo da Multa",
  vistoJuridicoMulta: "Processo Vinculado da Multa",
  observacoes: "Observacoes",
}

function normalizeCompareValue(key: string, value: unknown) {
  const normalized = String(value || "").trim().replace(/\r\n/g, "\n")
  if (key === "placaProprietario") {
    return normalized
      .split("||__MULTI_ENTRY__||")
      .map((entry) => entry.trim() || "sim")
      .join("||__MULTI_ENTRY__||")
  }
  return normalized
}

function formatCurrency(value: string) {
  const raw = String(value || "").trim().replace(/[^\d,.-]/g, "")
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw
  const amount = Number.parseFloat(normalized)
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number.isFinite(amount) ? amount : 0)
}

export function formatFichaChangeValue(field: string, value: unknown) {
  const text = String(value || "").trim()
  if (!text || text === "-") return "-"
  if (field !== "pagamentos" && field !== "Pagamentos") return text

  let entries: Array<{ formaPagamento?: string; banco?: string; valor?: string }> = []
  try {
    const parsed = JSON.parse(text)
    entries = Array.isArray(parsed) ? parsed : []
  } catch {
    return text
  }
  if (!entries.length) return "-"

  return entries
    .map((entry, index) => {
      const details = [entry.formaPagamento, entry.banco, formatCurrency(entry.valor || "")].filter(Boolean)
      return `${index + 1}. ${details.join(" | ")}`
    })
    .join("\n")
}

export function buildFichaChanges(
  current: object,
  next: object,
  labels: Record<string, string> = FICHA_CHANGE_LABELS
) {
  return Object.entries(labels)
    .map(([key, label]) => {
      const before = normalizeCompareValue(key, (current as Record<string, unknown>)[key])
      const after = normalizeCompareValue(key, (next as Record<string, unknown>)[key])
      if (before === after) return null
      return {
        field: label,
        before: formatFichaChangeValue(key, before),
        after: formatFichaChangeValue(key, after),
      }
    })
    .filter((change): change is { field: string; before: string; after: string } => Boolean(change))
}
