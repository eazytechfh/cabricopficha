import type { Consultor } from "@/lib/ficha-types"

export const consultants: Consultor[] = [
  {
    id: "admin-1",
    nome: "Administrador",
    codigoAcesso: "CABRICOP-ADMIN",
    nivelAcesso: "admin",
  },
  {
    id: "consultor-1",
    nome: "Consultor Cabricop",
    codigoAcesso: "CABRICOP-001",
    nivelAcesso: "consultor",
  },
]

export function getConsultorByCode(code: string) {
  return consultants.find((consultor) => consultor.codigoAcesso === code.trim())
}
