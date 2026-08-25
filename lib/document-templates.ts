import type { FichaFormValues } from "@/lib/ficha-types"
import { formatCurrency, normalizeCpfCnpj, parseCurrency, splitSerializedEntries } from "@/lib/ficha-utils"
import { parsePaymentEntries, parsePaymentAmount } from "@/lib/payment-details"

export { prepareDocumentTemplateContent } from "@/lib/document-template-content"
import { removeDeprecatedDocumentVariables } from "@/lib/document-template-content"

export type DocumentTemplateKind = "contract" | "procuration" | "other-services-contract" | "other-services-procuration"

export type DocumentTemplateRecord = {
  key: DocumentTemplateKind
  title: string
  content: string
}

export const DOCUMENT_TEMPLATE_LABELS: Record<DocumentTemplateKind, string> = {
  contract: "Contrato",
  procuration: "Procuração",
  "other-services-contract": "Contrato de Outros Serviços",
  "other-services-procuration": "Procuração de Outros Serviços",
}

export const DEFAULT_DOCUMENT_TEMPLATES: Record<DocumentTemplateKind, string> = {
  contract: `Contrato de Prestação de Serviços

CONTRATADA: CABRICOP SERVIÇOS E ASSUNTOS DE TRÂNSITO LTDA. ME, inscrita no CNPJ sob o nº 16.513.797/0001-60, com sede na Pça Olavo Bilac, 28, sala 1816, Centro, Rio de Janeiro - RJ, CEP 20.041-010.

CONTRATANTE: {{qualificacaoCliente}}.

Objeto do Contrato
Este instrumento tem como objeto a prestação de serviços de assessoria e elaboração de recursos administrativos referentes aos processos e/ou notificações abaixo:

{{processosResumo}}

{{multasResumo}}

REFERENTE A PLACA(S): {{placas}}

Cláusula Primeira - Do Pagamento
A CONTRATANTE efetuou o pagamento no valor total de {{valorTotal}}, pagos por {{formaPagamento}}, referente aos serviços descritos no objeto deste contrato.

Valor de entrada: {{valorEntrada}}
Valor restante: {{valorRestante}}
Observação do valor restante: {{observacaoValorRestante}}

Cláusula Segunda - Das Obrigações da CONTRATADA
Os recursos serão interpostos conforme as datas-limite estipuladas pelas autoridades de trânsito.

Cláusula Terceira - Das Obrigações da CONTRATANTE
A CONTRATANTE declara ciência de que o acompanhamento do recurso deve ser feito mensalmente por sua própria iniciativa, utilizando os canais informados pela CONTRATADA.

Rio de Janeiro, {{dataHoje}}.

Representante Legal:
CABRICOP SERVIÇOS E ASSUNTOS DE TRÂNSITO - CONTRATADA

{{nomeCliente}}
CONTRATANTE

Consultor: {{consultor}}`,
  procuration: `PROCURAÇÃO

OUTORGANTE: {{qualificacaoCliente}}.

OUTORGADO: ADRIANA MELLO RODRIGUES MENDES, portadora da OAB/RJ 213525, com escritório na Praça Olavo Bilac nº 28 sala 1906 e 1816, Centro - Rio de Janeiro - RJ, CEP: 20041-010.

PODERES: Para representar o(a) OUTORGANTE perante qualquer Repartição Pública Federal, Estadual ou Municipal, Empresas Públicas, Autarquias, Polícia Rodoviária Federal, Departamento de Trânsito do Estado do Rio de Janeiro (DETRAN/RJ), Departamento Nacional de Infraestrutura de Transportes (DNIT), Conselho Estadual de Trânsito do Rio de Janeiro (CETRAN/RJ) e qualquer órgão municipal com competência de aplicação do Código Nacional de Trânsito, com a finalidade de elaborar, interpor e acompanhar recursos administrativos de trânsito, podendo tudo assinar, requerer, solicitar nada consta, auto de infração, avisos de recebimento, histórico de multas e processos administrativos, propor e praticar os demais atos necessários ao fiel desempenho do presente mandato, inclusive substabelecer com reserva.

Rio de Janeiro, {{dataHoje}}.

--------------------------------------------------------
OUTORGANTE

{{nomeCliente}}`,
  "other-services-contract": `CONTRATO - OUTROS SERVIÇOS

CONTRATADA: CABRICOP SERVIÇOS E ASSUNTOS DE TRÂNSITO LTDA. ME, inscrita no CNPJ sob o nº 16.513.797/0001-60, com sede na Pça Olavo Bilac, 28, sala 1816, Centro, Rio de Janeiro - RJ, CEP 20.041-010.

CONTRATANTE: {{qualificacaoCliente}}.

Tipo do Serviço
{{tipoOutroServico}}

Objeto e Poderes
{{poderesOutroServico}}

Pela prestação dos serviços, a CONTRATANTE pagará o valor total de {{valorTotal}}, por {{formaPagamento}}.

Rio de Janeiro, {{dataHoje}}.

CABRICOP SERVIÇOS E ASSUNTOS DE TRÂNSITO - CONTRATADA

{{nomeCliente}}
CONTRATANTE

Consultor: {{consultor}}`,
  "other-services-procuration": `PROCURAÇÃO - OUTROS SERVIÇOS

OUTORGANTE: {{qualificacaoCliente}}.

OUTORGADO: ADRIANA MELLO RODRIGUES MENDES, portadora da OAB/RJ 213525, com escritório na Praça Olavo Bilac nº 28 sala 1906 e 1816, Centro - Rio de Janeiro - RJ, CEP: 20041-010.

TIPO DO SERVIÇO: {{tipoOutroServico}}.

PODERES: {{poderesOutroServico}}.

Rio de Janeiro, {{dataHoje}}.

--------------------------------------------------------
OUTORGANTE

{{nomeCliente}}`,
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

export function normalizeDocumentTemplateContent(template: string) {
  if (!template) return ""
  if (looksLikeHtml(template)) return template
  return escapeHtml(template).replaceAll("\n", "<br />")
}

function splitLines(value: string) {
  if (!value) return [""]
  return value.split("\n")
}

function formatToday() {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date())
}

function getMultaLines(values: FichaFormValues) {
  const placas = splitSerializedEntries(values.placa)
  const instanciaBlocks = splitSerializedEntries(values.instanciaMulta)
  const autoDetranBlocks = splitSerializedEntries(values.autoDetran)
  const autoRenainfBlocks = splitSerializedEntries(values.autoRenainf)
  const blockCount = Math.max(placas.length, instanciaBlocks.length, autoDetranBlocks.length, autoRenainfBlocks.length, 1)

  return Array.from({ length: blockCount }).flatMap((_, blockIndex) => {
    const instancias = splitLines(instanciaBlocks[blockIndex] || "")
    const autosDetran = splitLines(autoDetranBlocks[blockIndex] || "")
    const autosRenainf = splitLines(autoRenainfBlocks[blockIndex] || "")
    const lineCount = Math.max(instancias.length, autosDetran.length, autosRenainf.length, 1)

    return Array.from({ length: lineCount }, (_, lineIndex) => ({
      instancia: instancias[lineIndex] || "",
      placa: placas[blockIndex] || "",
      autoDetran: autosDetran[lineIndex] || "",
      autoRenainf: autosRenainf[lineIndex] || "",
    }))
  })
}

function getProcessoLines(values: FichaFormValues) {
  const instancias = splitLines(values.instanciaProcesso)
  const tipos = splitLines(values.tipoProcesso)
  const numeros = splitLines(values.numeroProcesso)
  const maxLength = Math.max(instancias.length, tipos.length, numeros.length, 1)

  return Array.from({ length: maxLength }, (_, index) => ({
    instancia: instancias[index] || "",
    tipo: tipos[index] || "",
    numero: numeros[index] || "",
  }))
}

function buildProcessosResumo(values: FichaFormValues) {
  const lines = getProcessoLines(values).filter((line) => line.instancia || line.tipo || line.numero)
  if (!lines.length) return "-"

  return lines
    .map((line, index) => `${index + 1}. Instância do Processo: ${line.instancia || "-"} - Tipo do Processo: ${line.tipo || "-"} - Nº do Processo: ${line.numero || "-"}`)
    .join("\n")
}

function buildMultasResumo(values: FichaFormValues) {
  const lines = getMultaLines(values).filter((line) => line.instancia || line.autoDetran || line.autoRenainf || line.placa)
  if (!lines.length) return "-"

  return lines
    .map((line, index) => `${index + 1}. Instância da Multa: ${line.instancia || "-"} - Auto DETRAN: ${line.autoDetran || "-"} - Auto RENAINF: ${line.autoRenainf || "-"} - Placa: ${line.placa || "-"}`)
    .join("\n")
}

function buildPlaceholderValues(values: FichaFormValues) {
  const payments = parsePaymentEntries(values.pagamentos, values)
  const paymentSummary = payments.map((payment) => {
    const bank = payment.banco ? ` (${payment.banco.toLocaleUpperCase("pt-BR")})` : ""
    return `${payment.formaPagamento.toLocaleUpperCase("pt-BR")}${bank}: ${formatCurrency(parsePaymentAmount(payment.valor))}`
  }).join("; ")
  const nomeCliente = (values.nomeCliente || "").trim().replace(/\s+\d{1,2}$/, "")
  const placas = getMultaLines(values)
    .map((line) => line.placa.trim().toUpperCase())
    .filter(Boolean)
  const enderecoCompleto = [values.endereco, values.numeroEndereco, values.complementoEndereco, values.municipio, values.uf]
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join(" - ")
  const cpfCnpj = normalizeCpfCnpj(values.cpfCnpj) || values.cpfCnpj || ""
  const qualificacaoBase = [nomeCliente || values.nomeCliente, values.nacionalidade || "Brasileira", values.estadoCivil, values.profissao]
    .map((value) => (value || "").trim())
    .filter(Boolean)
    .join(", ")
  const qualificacaoPartes = [qualificacaoBase]

  if ((values.cnh || "").trim()) {
    qualificacaoPartes.push(`CNH nÂº ${values.cnh.trim()}`)
  }

  if (cpfCnpj.trim()) {
    qualificacaoPartes.push(`inscrito(a) no CPF/CNPJ sob o nÂº ${cpfCnpj.trim()}`)
  }

  if (enderecoCompleto.trim()) {
    qualificacaoPartes.push(`residente e domiciliado(a) em ${enderecoCompleto.trim()}`)
  }

  return {
    nomeCliente: nomeCliente || values.nomeCliente || "-",
    nacionalidade: values.nacionalidade || "Brasileira",
    estadoCivil: values.estadoCivil || "",
    profissao: values.profissao || "",
    cnh: values.cnh || "",
    cpfCnpj,
    endereco: enderecoCompleto || values.endereco || "",
    qualificacaoCliente: qualificacaoPartes.join(", "),
    telefone: values.telefones || "",
    email: values.email || "",
    valorTotal: formatCurrency(parseCurrency(values.valorTotal)),
    valorEntrada: values.valorEntrada ? formatCurrency(parseCurrency(values.valorEntrada)) : "-",
    valorRestante: values.valorRestante ? formatCurrency(parseCurrency(values.valorRestante)) : "-",
    observacaoValorRestante: values.observacaoValorRestante || "-",
    formaPagamento: paymentSummary || values.formaPagamento || "-",
    banco: values.banco || "-",
    processosResumo: buildProcessosResumo(values),
    multasResumo: buildMultasResumo(values),
    placas: [...new Set(placas)].join(", ") || "-",
    dataHoje: formatToday(),
    consultor: values.nomeConsultor || "-",
    tipoOutroServico: values.tipoOutroServico || "-",
    poderesOutroServico: values.poderesOutroServico || "-",
  }
}

export function fillDocumentTemplate(template: string, values: FichaFormValues, kind: DocumentTemplateKind) {
  const placeholders = buildPlaceholderValues(values)

  const normalizedTemplate = removeDeprecatedDocumentVariables(normalizeDocumentTemplateContent(template))

  const filledContent = Object.entries(placeholders).reduce(
    (content, [key, value]) => content.replaceAll(`{{${key}}}`, value),
    normalizedTemplate
  )

  return filledContent
    .replaceAll(", ,", ", ")
    .replaceAll(" ,", ",")
    .replace(/,\s*,/g, ", ")
    .replace(/,\s*\./g, ".")
    .replace(/\s{2,}/g, " ")
    .replace(/em\s+\./g, ".")
    .replace(/,\s+e\s+/g, " e ")
}

export function getDocumentFilename(kind: DocumentTemplateKind, values: FichaFormValues) {
  const safeName = (values.nomeCliente || "cliente")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "")

  const prefixByKind: Record<DocumentTemplateKind, string> = {
    contract: "contrato",
    procuration: "procuracao",
    "other-services-contract": "contrato-outros-servicos",
    "other-services-procuration": "procuracao-outros-servicos",
  }

  return `${prefixByKind[kind]}-${safeName}.pdf`
}

