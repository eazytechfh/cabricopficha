const MULTI_ENTRY_SEPARATOR = "||__MULTI_ENTRY__||"

function isValidIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function extractDates(value: string) {
  return String(value || "")
    .split(MULTI_ENTRY_SEPARATOR)
    .flatMap((entry) => entry.split("\n"))
    .map((entry) => entry.trim())
    .filter(isValidIsoDate)
}

export function calculatePrazoServico(prazoProcesso: string, prazoMulta: string) {
  return [...extractDates(prazoProcesso), ...extractDates(prazoMulta)].sort((a, b) => a.localeCompare(b))[0] || ""
}
