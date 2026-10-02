export function formatCpfCnpjForCopy(value: string) {
  const originalValue = String(value || "").trim()
  return originalValue.replace(/\D/g, "") || originalValue
}

export function normalizeAutoDetran(value: string) {
  return String(value || "")
    .toUpperCase()
    .replace(/(^|[^A-Z0-9])1(?=\d{8}(?:[^0-9]|$))/g, "$1I")
}
