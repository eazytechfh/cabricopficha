export type AccessLevel = "admin" | "consultor"

export type Consultor = {
  id: string
  nome: string
  codigoAcesso: string
  nivelAcesso: AccessLevel
}

export type ConsultorSession = Consultor

export type FichaFormValues = {
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
  valorTotal: string
  valorEntrada: string
  valorRestante: string
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
  cpfCnpj: "",
  cnh: "",
  dataNascimento: "",
  dataPrimeiraCnh: "",
  email: "",
  nomeConsultor: "",
  origem: "",
  sne: "",
  formaPagamento: "",
  banco: "",
  valorTotal: "",
  valorEntrada: "",
  valorRestante: "",
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
  renavam: "",
  prazoMulta: "",
  vistoJuridicoMulta: "",
  observacoes: "",
}
