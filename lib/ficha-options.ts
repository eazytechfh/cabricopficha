export const CONSULTOR_OPTIONS = ["SIMONE", "AMANDA", "RITA", "WALLACE", "DARLLAN"] as const

export const ORIGEM_OPTIONS = [
  "INDICAÇÃO",
  "INDICAÇÃO RET",
  "GOOGLE",
  "IT",
  "RM",
  "SP",
  "LS",
  "CS",
  "CP",
  "GOOGLE RET",
  "FACEBOOK",
  "FACEBOOK RET",
  "INSTAGRAM",
  "INSTAGRAM RET",
  "INSTARMKT",
  "INSTARMKT RET",
  "RÁDIO",
  "RÁDIO RET",
  "JB",
  "JB RET",
  "BAND",
  "BAND RET",
  "MIX",
  "MIX RET",
  "SULAMÉRICA",
  "SULAMÉRICA RET",
  "MELODIA",
  "MELODIA RET",
  "TUPI",
  "TUPI RET",
  "RESGATE",
] as const

export const INSTANCIA_PROCESSO_OPTIONS = ["DP", "1° Inst", "2° Inst"] as const

export const INSTANCIA_MULTA_OPTIONS = ["DP", "1° Inst", "2° Inst"] as const

export const SNE_OPTIONS = ["SIM", "NÃO", "CANCELOU"] as const

export const TIPO_PROCESSO_OPTIONS = ["SUSPENSÃO", "CASSAÇÃO"] as const

export const ESTADO_CIVIL_OPTIONS = ["CASADO(A)", "SOLTEIRO(A)", "UNIÃO ESTÁVEL", "DIVORCIADO(A)", "VIÚVO(A)"] as const

export function formatOptionInitialCaps(value: string) {
  return value
    .toLocaleLowerCase("pt-BR")
    .replace(/(^|\s)(\p{L})/gu, (_, spacing: string, letter: string) => `${spacing}${letter.toLocaleUpperCase("pt-BR")}`)
}

export function getDefaultConsultorOption(nome?: string | null) {
  return CONSULTOR_OPTIONS.find((option) => option === nome) ?? ""
}
