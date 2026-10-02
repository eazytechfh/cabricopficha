"use client"

import { useEffect, useState } from "react"

type Consultation = {
  resultado_tabelas: unknown
  possui_suspensao_ativa: boolean | null
  possui_cassacao_ativa: boolean | null
  consultor_id: string | null
  created_at: string | null
}

type ResultTable = string[][]

function normalizeTables(value: unknown): ResultTable[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((table): table is unknown[] => Array.isArray(table))
    .map((table) => table
      .filter((row): row is unknown[] => Array.isArray(row))
      .map((row) => row.map((cell) => String(cell ?? "-"))))
    .filter((table) => table.length > 0)
}

function formatDateTime(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date)
}

function Status({ label, active }: { label: string; active: boolean | null }) {
  const unknown = active === null
  return (
    <div className="min-w-0 px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">{label}</p>
      <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${unknown ? "bg-slate-100 text-slate-600" : active ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
        {unknown ? "Não informado" : active ? "Sim" : "Não"}
      </span>
    </div>
  )
}

export function CnhConsultationHistory({ cpf, cnh }: { cpf: string; cnh: string }) {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const normalizedCpf = cpf.replace(/\D/g, "")
  const normalizedCnh = cnh.replace(/\D/g, "")

  useEffect(() => {
    if (!normalizedCpf || !normalizedCnh) {
      setConsultations([])
      setError("")
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError("")

    fetch(`/api/detran?cpf=${encodeURIComponent(normalizedCpf)}&cnh=${encodeURIComponent(normalizedCnh)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as { consultas?: Consultation[]; error?: string } | null
        if (!response.ok) throw new Error(payload?.error || "Não foi possível carregar o histórico.")
        setConsultations(Array.isArray(payload?.consultas) ? payload.consultas : [])
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return
        setConsultations([])
        setError(fetchError instanceof Error ? fetchError.message : "Não foi possível carregar o histórico.")
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [normalizedCpf, normalizedCnh])

  if (!normalizedCpf || !normalizedCnh) return null

  return (
    <section className="overflow-hidden border-x border-b border-slate-300 bg-white first:border-t">
      <h3 className="bg-[#214674] px-4 py-2 text-center text-sm font-bold uppercase tracking-wide text-white">Histórico de Consultas da CNH</h3>
      {loading ? <p className="px-4 py-5 text-center text-sm text-slate-500">Carregando consultas...</p> : null}
      {!loading && error ? <p role="alert" className="px-4 py-5 text-center text-sm text-red-600">{error}</p> : null}
      {!loading && !error && consultations.length === 0 ? <p className="px-4 py-5 text-center text-sm text-slate-500">Nenhuma consulta encontrada.</p> : null}
      {!loading && !error ? (
        <div className="divide-y divide-slate-300">
          {consultations.map((consultation, consultationIndex) => {
            const tables = normalizeTables(consultation.resultado_tabelas)
            return (
              <article key={`${consultation.created_at || "consulta"}-${consultationIndex}`} className="space-y-4 p-4">
                <div className="grid grid-cols-1 overflow-hidden rounded-md border border-slate-200 md:grid-cols-3 md:divide-x md:divide-slate-200">
                  <div className="px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Data da consulta</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{formatDateTime(consultation.created_at)}</p>
                  </div>
                  <Status label="Suspensão ativa" active={consultation.possui_suspensao_ativa} />
                  <Status label="Cassação ativa" active={consultation.possui_cassacao_ativa} />
                </div>
                {consultation.consultor_id ? <p className="text-xs text-slate-500">Consultor: <span className="font-medium text-slate-700">{consultation.consultor_id}</span></p> : null}
                {tables.map((table, tableIndex) => {
                  const [header, ...rows] = table
                  return (
                    <div key={`table-${tableIndex}`} className="overflow-x-auto rounded-md border border-slate-200">
                      <table className="w-full min-w-max border-collapse text-left text-sm">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>{header.map((cell, index) => <th key={index} className="border-b border-slate-200 px-3 py-2 font-semibold">{cell}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="even:bg-slate-50/60">
                              {header.map((_, cellIndex) => <td key={cellIndex} className="px-3 py-2 text-slate-800">{row[cellIndex] || "-"}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })}
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
