export function normalizeSearchText(value: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim()
    .replace(/\s+/g, " ")
}

export function includesNormalizedSearch(candidate: string, query: string) {
  const normalizedQuery = normalizeSearchText(query)
  return Boolean(normalizedQuery) && normalizeSearchText(candidate).includes(normalizedQuery)
}

const ACCENT_GROUPS: Record<string, string> = {
  a: "[aáàâãäå]",
  c: "[cç]",
  e: "[eéèêë]",
  i: "[iíìîï]",
  n: "[nñ]",
  o: "[oóòôõö]",
  u: "[uúùûü]",
  y: "[yýÿ]",
}

function escapeRegexCharacter(character: string) {
  return /[\\^$.*+?()[\]{}|\-]/.test(character) ? `\\${character}` : character
}

export function buildAccentInsensitivePattern(query: string) {
  return Array.from(normalizeSearchText(query))
    .map((character) => {
      if (character === " ") return "\\s+"
      return ACCENT_GROUPS[character] || escapeRegexCharacter(character)
    })
    .join("")
}

const NAME_CONNECTORS = new Set(["a", "e", "o", "da", "das", "de", "di", "do", "dos", "du"])

export function getNameSearchTokens(query: string) {
  const words = normalizeSearchText(query).split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  const significantWords = words.filter((word) => !NAME_CONNECTORS.has(word))
  return significantWords.length > 0 ? significantWords : words
}

// Filtro "or" do PostgREST: todas as palavras precisam estar no mesmo campo, em qualquer ordem.
export function buildNameSearchFilter(query: string, columns: string[]) {
  const tokens = getNameSearchTokens(query)
  if (tokens.length === 0) return ""

  const conditions = columns.map(
    (column) => `and(${tokens.map((token) => `${column}.imatch."${buildAccentInsensitivePattern(token)}"`).join(",")})`
  )
  return `(${conditions.join(",")})`
}

// Texto só com números e pontuação de documento é CPF/CNPJ; qualquer outro é nome.
export function parseFichaSearch(query: string) {
  const value = (query || "").trim()
  const isDocument = /\d/.test(value) && /^[\d\s./-]+$/.test(value)
  return isDocument ? { cpf: value.replace(/\D/g, ""), nome: "" } : { cpf: "", nome: value }
}

const MIN_PARTIAL_DOCUMENT_DIGITS = 4
const MIN_TYPO_DOCUMENT_DIGITS = 8

// Trechos que o documento salvo pode conter quando um número foi digitado errado,
// esquecido, digitado a mais ou trocado de lugar com o vizinho.
export function getDocumentTypoPatterns(digits: string) {
  const patterns = new Set<string>()
  for (let index = 0; index < digits.length; index += 1) {
    const before = digits.slice(0, index)
    const after = digits.slice(index + 1)
    patterns.add(`${before}[0-9]${after}`)
    patterns.add(`${before}${after}`)
    if (index > 0) patterns.add(`${before}[0-9]${digits.slice(index)}`)
    if (after) patterns.add(`${before}${after[0]}${digits[index]}${after.slice(1)}`)
  }
  return [...patterns]
}

// Filtros "or" do PostgREST para quando não há documento exato, do mais próximo ao mais tolerante.
export function buildApproximateDocumentFilters(digits: string, columns: string[]) {
  const patterns: string[] = []
  if (digits.length >= MIN_PARTIAL_DOCUMENT_DIGITS) patterns.push(digits)
  if (digits.length >= MIN_TYPO_DOCUMENT_DIGITS) patterns.push(getDocumentTypoPatterns(digits).join("|"))

  return patterns.map((pattern) => `(${columns.map((column) => `${column}.imatch."${pattern}"`).join(",")})`)
}
