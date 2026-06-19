export type AccessLevel = "admin" | "consultor" | "andamento"

export type Consultor = {
  id: string
  nome: string
  email: string
  telefone: string
  nivelAcesso: AccessLevel
  ativo?: boolean
}

export type ConsultorSession = Consultor

export type AccessCodeRecord = {
  id: string
  nomeResponsavel: string
  email: string
  telefone: string
  nivelAcesso: AccessLevel
  ativo: boolean
  mustChangePassword?: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

export type ActivityLogRecord = {
  id: string
  entityType: "ficha" | "document_template"
  entityId: string
  entityLabel: string
  action: string
  summary: string
  actorId: string
  actorName: string
  createdAt: string
  details?: Array<{
    field: string
    before: string
    after: string
  }>
}

export type FichaFormValues = {
  dataContrato: string
  prazoServico: string
  nomeCliente: string
  terceiros: string
  telefones: string
  endereco: string
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
  bancoOutro: string
  valorTotal: string
  valorEntrada: string
  valorRestante: string
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

export type FichaRecord = FichaFormValues & {
  id: string
  cpfNormalizado: string
  createdAt: string
  updatedAt: string
  createdByConsultorId: string
  updatedByConsultorId: string
}

export type FichaListItem = Pick<
  FichaRecord,
  | "id"
  | "nomeCliente"
  | "cpfCnpj"
  | "telefones"
  | "endereco"
  | "dataContrato"
  | "nomeConsultor"
  | "createdAt"
  | "updatedAt"
  | "createdByConsultorId"
  | "updatedByConsultorId"
>

export const emptyFichaValues: FichaFormValues = {
  dataContrato: "",
  prazoServico: "",
  nomeCliente: "",
  terceiros: "",
  telefones: "",
  endereco: "",
  cep: "",
  municipio: "",
  uf: "RJ",
  cpfCnpj: "",
  cnh: "",
  dataNascimento: "",
  dataPrimeiraCnh: "",
  nacionalidade: "Brasileira",
  estadoCivil: "",
  profissao: "",
  email: "",
  nomeConsultor: "",
  origem: "",
  sne: "",
  formaPagamento: "",
  banco: "",
  bancoOutro: "",
  valorTotal: "",
  valorEntrada: "",
  valorRestante: "",
  observacaoValorRestante: "",
  clausulaAdicional: "",
  instanciaProcesso: "",
  tipoProcesso: "",
  numeroProcesso: "",
  prazoProcesso: "",
  vistoJuridico: "",
  assinaturaVistoJuridico: "",
  instanciaMulta: "",
  autoDetran: "",
  autoRenainf: "",
  tipoMulta: "",
  placa: "",
  placaProprietario: "sim",
  cpfProprietario: "",
  renavam: "",
  prazoMulta: "",
  vistoJuridicoMulta: "",
  observacoes: "",
}
