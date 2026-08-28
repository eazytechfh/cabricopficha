import type { FichaFormValues, FichaRecord } from "./ficha-types.ts"

export type DuplicateReason = "CPF/CNPJ" | "CNH" | "e-mail" | "telefone" | "nome" | "número do endereço"

function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
}

function normalizeName(value: string) {
  return normalizeText(value).replace(/\s+\d{1,2}$/, "")
}

function digits(value: string) {
  return String(value || "").replace(/\D/g, "")
}

function phones(value: string) {
  return String(value || "")
    .split(/[,;\n]/)
    .map(digits)
    .filter((phone) => phone.length >= 8)
    .map((phone) => phone.replace(/^55(?=\d{10,11}$)/, ""))
}

function sameNonEmpty(left: string, right: string, normalizer = normalizeText) {
  const normalizedLeft = normalizer(left)
  const normalizedRight = normalizer(right)
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight)
}

export function findDuplicateReasons(
  input: Pick<FichaFormValues, "nomeCliente" | "telefones" | "numeroEndereco" | "email" | "cpfCnpj" | "cnh">,
  candidate: Pick<FichaRecord, "nomeCliente" | "telefones" | "numeroEndereco" | "email" | "cpfCnpj" | "cnh">
): DuplicateReason[] {
  const reasons: DuplicateReason[] = []

  if (sameNonEmpty(input.cpfCnpj, candidate.cpfCnpj, digits)) reasons.push("CPF/CNPJ")
  if (sameNonEmpty(input.cnh, candidate.cnh, digits)) reasons.push("CNH")
  if (sameNonEmpty(input.email, candidate.email)) reasons.push("e-mail")

  const candidatePhones = new Set(phones(candidate.telefones))
  if (phones(input.telefones).some((phone) => candidatePhones.has(phone))) reasons.push("telefone")
  if (sameNonEmpty(input.nomeCliente, candidate.nomeCliente, normalizeName)) reasons.push("nome")

  const hasStrongMatch = reasons.length > 0
  if (hasStrongMatch && sameNonEmpty(input.numeroEndereco, candidate.numeroEndereco, normalizeText)) {
    reasons.push("número do endereço")
  }

  return reasons
}

const CLIENT_IDENTITY_FIELDS = [
  "nomeCliente",
  "terceiros",
  "telefoneTerceiros",
  "emailTerceiros",
  "telefones",
  "endereco",
  "numeroEndereco",
  "complementoEndereco",
  "cep",
  "municipio",
  "uf",
  "cpfCnpj",
  "cnh",
  "dataNascimento",
  "dataPrimeiraCnh",
  "nacionalidade",
  "estadoCivil",
  "profissao",
  "email",
] as const satisfies ReadonlyArray<keyof FichaFormValues>

export function mergeClientIdentity(input: FichaFormValues, existing: FichaRecord): FichaFormValues {
  const merged = { ...input }

  for (const field of CLIENT_IDENTITY_FIELDS) {
    merged[field] = existing[field]
  }

  merged.nomeCliente = String(existing.nomeCliente || "").trim().replace(/\s+\d{1,2}$/, "")

  return merged
}
