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
