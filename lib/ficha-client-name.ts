export function formatClientDisplayName(value: string) {
  return String(value || "").trim().replace(/\s+\d{2}$/, "")
}

export function formatFichaNumber(value: number) {
  return String(Math.max(1, Math.trunc(value || 1))).padStart(2, "0")
}
