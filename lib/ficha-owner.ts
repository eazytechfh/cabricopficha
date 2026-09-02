export const FICHA_MULTI_ENTRY_SEPARATOR = "||__MULTI_ENTRY__||"

export function normalizeOwnerFlags(ownerFlags: string, ownerCpfs: string) {
  const flags = String(ownerFlags || "").split(FICHA_MULTI_ENTRY_SEPARATOR)
  const cpfs = String(ownerCpfs || "").split(FICHA_MULTI_ENTRY_SEPARATOR)
  const count = Math.max(flags.length, cpfs.length, 1)

  return Array.from({ length: count }, (_, index) => {
    if ((cpfs[index] || "").trim()) return "nao"
    return (flags[index] || "").trim().toLocaleLowerCase("pt-BR") === "nao" ? "nao" : "sim"
  }).join(FICHA_MULTI_ENTRY_SEPARATOR)
}
