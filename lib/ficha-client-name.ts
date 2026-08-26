export function formatClientDisplayName(value: string) {
  return String(value || "").trim().replace(/\s+\d{2}$/, "")
}
