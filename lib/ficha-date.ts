export function formatFichaCreatedDate(value: string) {
  if (!value) return "-"

  if (value.includes("T")) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date)
    }
  }

  const datePart = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!datePart) return value

  return `${datePart[3]}/${datePart[2]}/${datePart[1]}`
}
