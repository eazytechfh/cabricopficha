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

export const INSTANCIA_PROCESSO_OPTIONS = ["DEFESA PRÉVIA", "1º INSTÂNCIA", "2º INSTÂNCIA"] as const

export const SNE_OPTIONS = ["SIM", "NÃO", "CANCELOU"] as const

export function getDefaultConsultorOption(nome?: string | null) {
  return CONSULTOR_OPTIONS.find((option) => option === nome) ?? ""
}
