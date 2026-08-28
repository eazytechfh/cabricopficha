export type AddressFields = {
  endereco: string
  numeroEndereco: string
  complementoEndereco: string
}

export function updateAddressFields(current: AddressFields, field: keyof AddressFields, value: string): AddressFields {
  return { ...current, [field]: value }
}

export function splitLegacyAddress(endereco: string): AddressFields {
  const value = String(endereco || "")
  const numeroMatch = value.match(/,\s*N[uú]mero\s+([^,]+)(?=,\s*Complemento\s+|$)/i)
  const complementoMatch = value.match(/,\s*Complemento\s+(.+)$/i)

  return {
    endereco: value
      .replace(/,\s*N[uú]mero\s+([^,]+)(?=,\s*Complemento\s+|$)/i, "")
      .replace(/,\s*Complemento\s+(.+)$/i, "")
      .trim()
      .replace(/,\s*$/, ""),
    numeroEndereco: numeroMatch?.[1]?.trim() || "",
    complementoEndereco: complementoMatch?.[1]?.trim() || "",
  }
}

export function readAddressFields(row: Record<string, unknown>): AddressFields {
  const legacy = splitLegacyAddress(String(row.endereco ?? ""))

  return {
    endereco: legacy.endereco,
    numeroEndereco: String(row.numero_endereco ?? "").trim() || legacy.numeroEndereco,
    complementoEndereco: String(row.complemento_endereco ?? "").trim() || legacy.complementoEndereco,
  }
}
