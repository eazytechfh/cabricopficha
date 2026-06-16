import { NextResponse } from "next/server"
import { assertAdminAccess } from "@/lib/server-access"
import { getLatestActivityLog, listActivityLogs } from "@/lib/server-activity-logs"
import type { ActivityLogRecord, ConsultorSession } from "@/lib/ficha-types"

type Payload = {
  action?: "latest" | "timeline"
  entityType?: ActivityLogRecord["entityType"]
  entityId?: string
  consultor?: ConsultorSession
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Payload

    if (payload.action === "latest") {
      const entityType = payload.entityType === "document_template" ? "document_template" : "ficha"
      const entityId = String(payload.entityId || "").trim()

      if (!entityId) {
        return NextResponse.json({ log: null })
      }

      const log = await getLatestActivityLog(entityType, entityId)
      return NextResponse.json({ log })
    }

    if (payload.action === "timeline") {
      await assertAdminAccess(payload.consultor)
      const logs = await listActivityLogs(200)
      return NextResponse.json({ logs })
    }

    return NextResponse.json({ error: "Acao invalida." }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar logs."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
