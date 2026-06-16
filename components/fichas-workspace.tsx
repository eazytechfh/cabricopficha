"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { AlignCenter, AlignLeft, ArrowLeft, Bold, Clock3, Eye, FileText, Italic, Pencil, Plus, Settings, Tag, Trash2, Underline, UserPlus } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FichaForm } from "@/components/ficha-form"
import { FichaReadView } from "@/components/ficha-read-view"
import { createAccessUser, deleteAccessUser, getAccessUsers, updateAccessUser } from "@/lib/accessAdminService"
import { getCurrentAccess, hasAdminAccess, loginWithAccessCode, logout } from "@/lib/accessService"
import { getDefaultConsultorOption } from "@/lib/ficha-options"
import { downloadFichaPdf } from "@/lib/ficha-pdf-client"
import { downloadFilledDocumentPdf } from "@/lib/document-pdf-client"
import { DOCUMENT_TEMPLATE_LABELS, normalizeDocumentTemplateContent, type DocumentTemplateKind } from "@/lib/document-templates"
import { getDocumentTemplate, updateDocumentTemplate } from "@/lib/document-template-client"
import { getLatestLog, getTimelineLogs } from "@/lib/activity-log-client"
import { updateFicha } from "@/lib/fichaService"
import { saveFichaWithPdfAndWebhook } from "@/lib/fichaCreateService"
import { getFichaById, getFichas } from "@/lib/fichas-api"
import { canEditFicha, normalizeCpfCnpj, toRecordValues } from "@/lib/ficha-utils"
import {
  emptyFichaValues,
  type AccessCodeRecord,
  type ActivityLogRecord,
  type ConsultorSession,
  type FichaFormValues,
  type FichaListItem,
  type FichaRecord,
} from "@/lib/ficha-types"

type ViewMode = "list" | "view" | "edit" | "editClient"
type WorkspaceTab = "cadastrar" | "consultar"
type TipoBusca = "cpf" | "cnpj" | "nome"
type SettingsSection = "menu" | "users" | "documents"
type TimelineGroup = {
  key: string
  entityLabel: string
  logs: ActivityLogRecord[]
}

const DOCUMENT_TEMPLATE_VARIABLES = [
  "{{nomeCliente}}",
  "{{nacionalidade}}",
  "{{estadoCivil}}",
  "{{profissao}}",
  "{{cnh}}",
  "{{cpfCnpj}}",
  "{{endereco}}",
  "{{telefone}}",
  "{{email}}",
  "{{valorTotal}}",
  "{{valorEntrada}}",
  "{{valorRestante}}",
  "{{observacaoValorRestante}}",
  "{{formaPagamento}}",
  "{{banco}}",
  "{{processosResumo}}",
  "{{multasResumo}}",
  "{{placas}}",
  "{{dataHoje}}",
  "{{consultor}}",
]

function getAccessLevelLabel(level: AccessCodeRecord["nivelAcesso"]) {
  if (level === "admin") return "Admin"
  if (level === "andamento") return "Andamento"
  return "Comercial"
}

function getFichaLabel(nomeCliente: string) {
  const match = (nomeCliente || "").trim().match(/(\d{1,2})$/)
  if (match) {
    return `Ficha ${match[1]}`
  }

  return "Ficha"
}

function getClienteBaseName(nomeCliente: string) {
  return (nomeCliente || "").trim().replace(/\s+\d{1,2}$/, "")
}

function fallback(value: string) {
  return value?.trim() || "-"
}

function formatDisplayDate(value: string) {
  if (!value) return "-"
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

type ConsultaClienteGroup = {
  key: string
  nomeCliente: string
  cpfCnpj: string
  telefones: string
  nomeConsultor: string
  contratos: FichaListItem[]
}

function ClienteValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="min-h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-xs">
        {fallback(value)}
      </div>
    </div>
  )
}

function ClienteReadCard({ values, onEdit, canEdit }: { values: FichaFormValues; onEdit: () => void; canEdit: boolean }) {
  return (
    <div className="relative rounded-lg border border-border border-l-4 border-l-primary bg-background p-4 pb-16 shadow-sm">
      <div className="mb-6 flex items-center gap-2">
        <UserPlus className="size-5 text-primary" />
        <h3 className="text-lg font-semibold text-primary">Dados do Cliente</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ClienteValue label="Nome Completo" value={getClienteBaseName(values.nomeCliente) || values.nomeCliente} />
        <ClienteValue label="Terceiros" value={values.terceiros} />
        <ClienteValue label="Telefone(s)" value={values.telefones} />
        <ClienteValue label="E-mail" value={values.email} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[190px_1fr_190px_190px]">
        <ClienteValue label="CEP" value={values.cep} />
        <ClienteValue label="Endereco" value={values.endereco} />
        <ClienteValue label="Numero" value="" />
        <ClienteValue label="Complemento" value="" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_90px]">
        <ClienteValue label="CPF/CNPJ" value={values.cpfCnpj} />
        <ClienteValue label="CNH" value={values.cnh} />
        <ClienteValue label="UF" value="" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <ClienteValue label="Data de Nascimento" value={formatDisplayDate(values.dataNascimento)} />
        <ClienteValue label="Data da 1a CNH" value={formatDisplayDate(values.dataPrimeiraCnh)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
        <ClienteValue label="Nacionalidade" value={values.nacionalidade} />
        <ClienteValue label="Estado Civil" value={values.estadoCivil} />
        <ClienteValue label="Profissão" value={values.profissao} />
        <ClienteValue label="Nome do Consultor" value={values.nomeConsultor} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <ClienteValue label="Origem" value={values.origem} />
        <ClienteValue label="SNE" value={values.sne} />
      </div>

      {canEdit ? (
        <Button type="button" variant="outline" size="sm" onClick={onEdit} className="absolute bottom-4 right-4">
          <Plus className="size-4" />
          Editar
        </Button>
      ) : null}
    </div>
  )
}

function formatAccessDate(value: string) {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const day = parts.find((part) => part.type === "day")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const year = parts.find((part) => part.type === "year")?.value
  const hours = parts.find((part) => part.type === "hour")?.value
  const minutes = parts.find((part) => part.type === "minute")?.value

  if (!day || !month || !year || !hours || !minutes) {
    return value
  }

  return `${day}/${month}/${year} as ${hours}:${minutes}`
}

function LogSummary({ log, showEntityLabel = true }: { log: ActivityLogRecord | null; showEntityLabel?: boolean }) {
  if (!log) return <p className="text-sm text-muted-foreground">Nenhum log disponivel.</p>

  return (
    <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
      {showEntityLabel ? <p className="font-medium text-foreground">{log.entityLabel || "-"}</p> : null}
      <p className={showEntityLabel ? "mt-1 text-foreground" : "text-foreground"}>{formatAccessDate(log.createdAt)}</p>
      <p className="mt-1 text-foreground">Por: {log.actorName || "-"}</p>
      <p className="mt-1 text-muted-foreground">{log.summary || "-"}</p>
    </div>
  )
}

export default function FichasWorkspace() {
  const [consultor, setConsultor] = useState<ConsultorSession | null>(null)
  const [codigoAcesso, setCodigoAcesso] = useState("")
  const [authError, setAuthError] = useState("")
  const [authLoading, setAuthLoading] = useState(false)

  const [createValues, setCreateValues] = useState<FichaFormValues>(emptyFichaValues)
  const [createLoading, setCreateLoading] = useState(false)
  const [createMessage, setCreateMessage] = useState("")
  const [createIdentifierPreview, setCreateIdentifierPreview] = useState("")
  const [createReturnToConsulta, setCreateReturnToConsulta] = useState(false)
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("cadastrar")

  const [tipoBusca, setTipoBusca] = useState<TipoBusca>("cpf")
  const [cpfBusca, setCpfBusca] = useState("")
  const [nomeBusca, setNomeBusca] = useState("")
  const [consultaLoading, setConsultaLoading] = useState(false)
  const [consultaError, setConsultaError] = useState("")
  const [consultaItems, setConsultaItems] = useState<FichaListItem[]>([])
  const [selectedContratos, setSelectedContratos] = useState<FichaListItem[]>([])
  const [selectedFicha, setSelectedFicha] = useState<FichaRecord | null>(null)
  const [editValues, setEditValues] = useState<FichaFormValues>(emptyFichaValues)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [expandedContratoId, setExpandedContratoId] = useState("")
  const [editLoading, setEditLoading] = useState(false)
  const [editMessage, setEditMessage] = useState("")

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("menu")
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState("")
  const [usersMessage, setUsersMessage] = useState("")
  const [users, setUsers] = useState<AccessCodeRecord[]>([])
  const [newUserName, setNewUserName] = useState("")
  const [newUserCode, setNewUserCode] = useState("")
  const [newUserLevel, setNewUserLevel] = useState<AccessCodeRecord["nivelAcesso"]>("consultor")
  const [userSaving, setUserSaving] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState("")
  const [editingUserId, setEditingUserId] = useState("")
  const [editUserName, setEditUserName] = useState("")
  const [editUserCode, setEditUserCode] = useState("")
  const [editUserLevel, setEditUserLevel] = useState<AccessCodeRecord["nivelAcesso"]>("consultor")
  const [editUserStatus, setEditUserStatus] = useState<"ativo" | "inativo">("ativo")
  const [userUpdating, setUserUpdating] = useState(false)
  const [templateEditorKind, setTemplateEditorKind] = useState<DocumentTemplateKind | null>(null)
  const [templateContent, setTemplateContent] = useState("")
  const [templateLoading, setTemplateLoading] = useState(false)
  const [templateMessage, setTemplateMessage] = useState("")
  const [templateVariablesOpen, setTemplateVariablesOpen] = useState(false)
  const [latestFichaLog, setLatestFichaLog] = useState<ActivityLogRecord | null>(null)
  const [latestTemplateLog, setLatestTemplateLog] = useState<ActivityLogRecord | null>(null)
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [timelineLogs, setTimelineLogs] = useState<ActivityLogRecord[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [timelineError, setTimelineError] = useState("")
  const [selectedTimelineGroup, setSelectedTimelineGroup] = useState<TimelineGroup | null>(null)
  const templateEditorRef = useRef<HTMLDivElement | null>(null)
  const cadastroTopRef = useRef<HTMLDivElement | null>(null)
  const consultaTopRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const access = getCurrentAccess()
    if (!access) return

    const defaultConsultor = getDefaultConsultorOption(access.nome)

    setConsultor(access)
    setCreateValues((current) => ({ ...current, nomeConsultor: current.nomeConsultor || defaultConsultor }))
  }, [])

  useEffect(() => {
    const cpfNormalizado = normalizeCpfCnpj(createValues.cpfCnpj)
    const nomeBase = createValues.nomeCliente.trim().replace(/\s+\d{2}$/, "")

    if (!cpfNormalizado || !nomeBase) {
      setCreateIdentifierPreview("")
      return
    }

    let cancelled = false

    const loadPreview = async () => {
      try {
        const response = await getFichas({ cpf: cpfNormalizado })
        if (cancelled) return

        setCreateIdentifierPreview(nomeBase)
      } catch {
        if (!cancelled) {
          setCreateIdentifierPreview(nomeBase)
        }
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
    }
  }, [createValues.cpfCnpj, createValues.nomeCliente])

  const canEditSelectedFicha = useMemo(() => {
    if (!consultor || !selectedFicha) return false
    return canEditFicha(consultor.id, consultor.nivelAcesso, selectedFicha)
  }, [consultor, selectedFicha])

  const consultaClienteGroups = useMemo(() => {
    const groups = new Map<string, ConsultaClienteGroup>()

    consultaItems.forEach((item) => {
      const key = normalizeCpfCnpj(item.cpfCnpj) || getClienteBaseName(item.nomeCliente).toLowerCase() || item.id
      const existing = groups.get(key)

      if (existing) {
        existing.contratos.push(item)
        return
      }

      groups.set(key, {
        key,
        nomeCliente: getClienteBaseName(item.nomeCliente) || item.nomeCliente,
        cpfCnpj: item.cpfCnpj,
        telefones: item.telefones,
        nomeConsultor: item.nomeConsultor,
        contratos: [item],
      })
    })

    return Array.from(groups.values()).map((group) => ({
      ...group,
      contratos: [...group.contratos].sort((a, b) => a.nomeCliente.localeCompare(b.nomeCliente, "pt-BR", { numeric: true })),
    }))
  }, [consultaItems])

  const isAdmin = hasAdminAccess(consultor)
  const isAndamento = consultor?.nivelAcesso === "andamento"

  useEffect(() => {
    if (isAndamento && activeTab !== "consultar") {
      setActiveTab("consultar")
    }
  }, [activeTab, isAndamento])

  useEffect(() => {
    if (!selectedFicha?.id) {
      setLatestFichaLog(null)
      return
    }

    let cancelled = false
    void getLatestLog("ficha", selectedFicha.id)
      .then((log) => {
        if (!cancelled) setLatestFichaLog(log)
      })
      .catch(() => {
        if (!cancelled) setLatestFichaLog(null)
      })

    return () => {
      cancelled = true
    }
  }, [selectedFicha?.id])

  useEffect(() => {
    if (!templateEditorKind) {
      setLatestTemplateLog(null)
      return
    }

    let cancelled = false
    void getLatestLog("document_template", templateEditorKind)
      .then((log) => {
        if (!cancelled) setLatestTemplateLog(log)
      })
      .catch(() => {
        if (!cancelled) setLatestTemplateLog(null)
      })

    return () => {
      cancelled = true
    }
  }, [templateEditorKind])

  const handleDownloadDocument = async (kind: DocumentTemplateKind) => {
    setEditMessage("")

    try {
      await downloadFilledDocumentPdf(kind, editValues)
    } catch (error) {
      setEditMessage(error instanceof Error ? error.message : "Erro ao gerar documento.")
    }
  }

  const handleOpenTemplateEditor = async (kind: DocumentTemplateKind) => {
    if (!consultor || !isAdmin) return

    setTemplateEditorKind(kind)
    setTemplateLoading(true)
    setTemplateMessage("")
    setTemplateVariablesOpen(false)

    try {
      const template = await getDocumentTemplate(kind)
      setTemplateContent(normalizeDocumentTemplateContent(template.content))
    } catch (error) {
      setTemplateMessage(error instanceof Error ? error.message : "Erro ao carregar modelo.")
    } finally {
      setTemplateLoading(false)
    }
  }

  const handleSaveTemplate = async () => {
    if (!consultor || !templateEditorKind) return

    setTemplateLoading(true)
    setTemplateMessage("")

    try {
      const template = await updateDocumentTemplate(templateEditorKind, templateContent, consultor)
      setTemplateContent(normalizeDocumentTemplateContent(template.content))
      setTemplateMessage("Modelo salvo com sucesso.")
      const latest = await getLatestLog("document_template", templateEditorKind)
      setLatestTemplateLog(latest)
    } catch (error) {
      setTemplateMessage(error instanceof Error ? error.message : "Erro ao salvar modelo.")
    } finally {
      setTemplateLoading(false)
    }
  }

  const handleTemplateCommand = (command: "bold" | "italic" | "underline" | "justifyLeft" | "justifyCenter") => {
    const editor = templateEditorRef.current
    if (!editor || templateLoading) return

    editor.focus()
    document.execCommand(command)
    setTemplateContent(editor.innerHTML)
  }

  const handleInsertTemplateVariable = (variable: string) => {
    const editor = templateEditorRef.current
    if (!editor || templateLoading) return

    editor.focus()
    document.execCommand("insertText", false, variable)
    setTemplateContent(editor.innerHTML)
  }

  const timelineGroups = useMemo(() => {
    const groups = new Map<string, TimelineGroup>()

    timelineLogs.forEach((log) => {
      const key = `${log.entityType}:${log.entityId}`
      const existing = groups.get(key)

      if (existing) {
        existing.logs.push(log)
        return
      }

      groups.set(key, {
        key,
        entityLabel: log.entityLabel || "-",
        logs: [log],
      })
    })

    return Array.from(groups.values())
  }, [timelineLogs])

  const handleLogin = async () => {
    setAuthLoading(true)
    setAuthError("")

    try {
      const access = await loginWithAccessCode(codigoAcesso)
      const defaultConsultor = getDefaultConsultorOption(access.nome)

      setConsultor(access)
      setCreateValues((current) => ({ ...current, nomeConsultor: defaultConsultor }))
      setCodigoAcesso("")
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Codigo de acesso invalido.")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleOpenTimeline = async (open: boolean) => {
    setTimelineOpen(open)
    if (!open || !consultor) return

    setTimelineLoading(true)
    setTimelineError("")

    try {
      const logs = await getTimelineLogs(consultor)
      setTimelineLogs(logs)
    } catch (error) {
      setTimelineError(error instanceof Error ? error.message : "Erro ao carregar timeline.")
      setTimelineLogs([])
    } finally {
      setTimelineLoading(false)
    }
  }

  const handleLogout = () => {
    setConsultor(null)
    logout()
  }

  const loadAccessUsers = async () => {
    if (!consultor || !hasAdminAccess(consultor)) return

    setUsersLoading(true)
    setUsersError("")

    try {
      const response = await getAccessUsers(consultor)
      if (!Array.isArray(response.users)) {
        setUsers([])
        setUsersError("Nao foi possivel carregar a lista de usuarios.")
        return
      }

      setUsers(response.users)
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "Erro ao carregar usuarios.")
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }

  const handleOpenSettings = async (open: boolean) => {
    setSettingsOpen(open)

    if (!open) {
      setSettingsSection("menu")
      setUsersError("")
      setUsersMessage("")
      setTemplateMessage("")
      return
    }
  }

  const handleOpenUsersSettings = async () => {
    setSettingsSection("users")
    await loadAccessUsers()
  }

  const handleBackSettings = () => {
    setSettingsSection("menu")
    setUsersError("")
    setUsersMessage("")
    setTemplateMessage("")
  }

  const handleCreateUser = async () => {
    if (!consultor) return

    if (!newUserName.trim() || !newUserCode.trim()) {
      setUsersError("Nome do responsavel e codigo de acesso sao obrigatorios.")
      return
    }

    setUserSaving(true)
    setUsersError("")
    setUsersMessage("")

    try {
      await createAccessUser(consultor, {
        nomeResponsavel: newUserName.trim(),
        codigoAcesso: newUserCode.trim(),
        nivelAcesso: newUserLevel,
      })

      setNewUserName("")
      setNewUserCode("")
      setNewUserLevel("consultor")
      setUsersMessage("Usuario adicionado com sucesso.")
      await loadAccessUsers()
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "Erro ao adicionar usuario.")
    } finally {
      setUserSaving(false)
    }
  }

  const handleDeleteUser = async (user: AccessCodeRecord) => {
    if (!consultor) return

    setDeletingUserId(user.id)
    setUsersError("")
    setUsersMessage("")

    try {
      await deleteAccessUser(consultor, user.id)
      setUsersMessage("Usuario removido com sucesso.")
      await loadAccessUsers()
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "Erro ao remover usuario.")
    } finally {
      setDeletingUserId("")
    }
  }

  const startEditingUser = (user: AccessCodeRecord) => {
    setEditingUserId(user.id)
    setEditUserName(user.nomeResponsavel)
    setEditUserCode(user.codigoAcesso)
    setEditUserLevel(user.nivelAcesso)
    setEditUserStatus(user.ativo ? "ativo" : "inativo")
    setUsersError("")
    setUsersMessage("")
  }

  const cancelEditingUser = () => {
    setEditingUserId("")
    setEditUserName("")
    setEditUserCode("")
    setEditUserLevel("consultor")
    setEditUserStatus("ativo")
  }

  const handleUpdateUser = async () => {
    if (!consultor || !editingUserId) return

    if (!editUserName.trim() || !editUserCode.trim()) {
      setUsersError("Nome, codigo, nivel e status precisam estar preenchidos.")
      return
    }

    setUserUpdating(true)
    setUsersError("")
    setUsersMessage("")

    try {
      await updateAccessUser(consultor, editingUserId, {
        nomeResponsavel: editUserName.trim(),
        codigoAcesso: editUserCode.trim(),
        nivelAcesso: editUserLevel,
        ativo: editUserStatus === "ativo",
      })

      setUsersMessage("Usuario atualizado com sucesso.")
      cancelEditingUser()
      await loadAccessUsers()
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "Erro ao atualizar usuario.")
    } finally {
      setUserUpdating(false)
    }
  }

  const handleCreate = async () => {
    if (!consultor) return

    if (!createValues.nomeCliente.trim() || !createValues.cpfCnpj.trim()) {
      setCreateMessage("Nome Completo e CPF/CNPJ sao obrigatorios.")
      return
    }

    setCreateLoading(true)
    setCreateMessage("")

    try {
      const values = {
        ...createValues,
        nomeConsultor: createValues.nomeConsultor || getDefaultConsultorOption(consultor.nome),
      }

      const response = await saveFichaWithPdfAndWebhook(values, consultor)
      setCreateMessage(
        response.webhookSent
          ? "Ficha salva com sucesso."
          : "Ficha salva com sucesso, mas houve erro ao enviar os dados para a automacao."
      )
      if (createReturnToConsulta && selectedFicha) {
        const cpfNormalizado = tipoBusca === "cpf" || tipoBusca === "cnpj" ? normalizeCpfCnpj(cpfBusca) : ""
        const nomeNormalizado = tipoBusca === "nome" ? nomeBusca.trim() : ""
        const refreshed = await getFichas({ cpf: cpfNormalizado, nome: nomeNormalizado })
        const selectedCpf = normalizeCpfCnpj(selectedFicha.cpfCnpj)
        const selectedName = getClienteBaseName(selectedFicha.nomeCliente).toLowerCase()
        const nextContratos = refreshed.fichas.filter((ficha) => {
          const sameCpf = selectedCpf && normalizeCpfCnpj(ficha.cpfCnpj) === selectedCpf
          const sameName = selectedName && getClienteBaseName(ficha.nomeCliente).toLowerCase() === selectedName
          return sameCpf || sameName
        })

        setConsultaItems(refreshed.fichas)
        setSelectedContratos(nextContratos.length > 0 ? nextContratos : [response.ficha])
      }
      setCreateValues({
        ...emptyFichaValues,
        nomeConsultor: getDefaultConsultorOption(consultor.nome),
      })
    } catch (error) {
      setCreateMessage(error instanceof Error ? error.message : "Erro ao salvar a ficha.")
    } finally {
      setCreateLoading(false)
    }
  }

  const handleConsultarFichas = async () => {
    setConsultaLoading(true)
    setConsultaError("")
    setEditMessage("")
    setViewMode("list")
    setSelectedFicha(null)
    setExpandedContratoId("")

    try {
      const cpfNormalizado = tipoBusca === "cpf" || tipoBusca === "cnpj" ? normalizeCpfCnpj(cpfBusca) : ""
      const nomeNormalizado = tipoBusca === "nome" ? nomeBusca.trim() : ""

      const response = await getFichas({ cpf: cpfNormalizado, nome: nomeNormalizado })
      setConsultaItems(response.fichas)
      setSelectedContratos([])
      if (response.fichas.length === 0) {
        const tipoLabel = tipoBusca === "nome" ? "nome" : tipoBusca.toUpperCase()
        setConsultaError(`Nenhuma ficha encontrada para este ${tipoLabel}.`)
      }
    } catch (error) {
      setConsultaError(error instanceof Error ? error.message : "Erro ao consultar fichas.")
      setConsultaItems([])
    } finally {
      setConsultaLoading(false)
    }
  }

  const handleVoltarConsulta = () => {
    setConsultaError("")
    setEditMessage("")
    setSelectedFicha(null)
    setExpandedContratoId("")
    setViewMode("list")
  }

  const resetConsulta = () => {
    setTipoBusca("cpf")
    setCpfBusca("")
    setNomeBusca("")
    setConsultaError("")
    setConsultaItems([])
    setSelectedContratos([])
    setSelectedFicha(null)
    setEditValues(emptyFichaValues)
    setViewMode("list")
    setExpandedContratoId("")
    setEditMessage("")
  }

  const handleTabChange = (value: string) => {
    const nextTab = value as WorkspaceTab

    if (activeTab !== "consultar" && nextTab === "consultar") {
      resetConsulta()
    }

    if (nextTab === "cadastrar") {
      setCreateReturnToConsulta(false)
      setCreateMessage("")
      setCreateValues({
        ...emptyFichaValues,
        nomeConsultor: consultor ? getDefaultConsultorOption(consultor.nome) : "",
      })
    }

    setActiveTab(nextTab)
  }

  const openFicha = async (id: string, mode: ViewMode, contratos: FichaListItem[] = []) => {
    setConsultaLoading(true)
    setConsultaError("")
    setEditMessage("")

    try {
      const response = await getFichaById(id)
      setSelectedFicha(response.ficha)
      setSelectedContratos(contratos)
      setEditValues(toRecordValues(response.ficha))
      setViewMode(mode)
      setExpandedContratoId("")
      window.setTimeout(() => {
        consultaTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 0)
    } catch (error) {
      setConsultaError(error instanceof Error ? error.message : "Erro ao abrir ficha.")
    } finally {
      setConsultaLoading(false)
    }
  }

  const handleContratoAccordionChange = async (id: string) => {
    if (!id) {
      setExpandedContratoId("")
      return
    }

    setExpandedContratoId(id)

    if (selectedFicha?.id !== id) {
      await openFicha(id, "view", selectedContratos)
      setExpandedContratoId(id)
    }
  }

  const handleAddNovoContrato = () => {
    setCreateMessage("")
    setCreateReturnToConsulta(true)
    setActiveTab("cadastrar")
    window.setTimeout(() => {
      cadastroTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 0)

    if (!selectedFicha) {
      setCreateValues((current) => ({
        ...emptyFichaValues,
        nomeConsultor: current.nomeConsultor || (consultor ? getDefaultConsultorOption(consultor.nome) : ""),
      }))
      return
    }

    setCreateValues({
      ...emptyFichaValues,
      nomeCliente: getClienteBaseName(selectedFicha.nomeCliente) || selectedFicha.nomeCliente,
      terceiros: selectedFicha.terceiros,
      telefones: selectedFicha.telefones,
      endereco: selectedFicha.endereco,
      cep: selectedFicha.cep,
      cpfCnpj: selectedFicha.cpfCnpj,
      cnh: selectedFicha.cnh,
      dataNascimento: selectedFicha.dataNascimento,
      dataPrimeiraCnh: selectedFicha.dataPrimeiraCnh,
      nacionalidade: selectedFicha.nacionalidade,
      estadoCivil: selectedFicha.estadoCivil,
      profissao: selectedFicha.profissao,
      email: selectedFicha.email,
      nomeConsultor: selectedFicha.nomeConsultor || (consultor ? getDefaultConsultorOption(consultor.nome) : ""),
      origem: selectedFicha.origem,
      sne: selectedFicha.sne,
    })
  }

  const handleVoltarCadastroParaConsulta = () => {
    setCreateMessage("")
    setCreateReturnToConsulta(false)
    setActiveTab("consultar")
    window.setTimeout(() => {
      consultaTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 0)
  }

  const handleUpdate = async () => {
    if (!consultor || !selectedFicha) return

    setEditLoading(true)
    setEditMessage("")

    try {
      const response = await updateFicha(selectedFicha.id, editValues, consultor)
      setSelectedFicha(response.ficha)
      setEditValues(toRecordValues(response.ficha))
      const latest = await getLatestLog("ficha", response.ficha.id)
      setLatestFichaLog(latest)
      setEditMessage(
        response.webhookSent
          ? "Ficha atualizada com sucesso."
          : "Ficha atualizada, mas houve erro ao enviar os dados para a automacao."
      )
      setViewMode("view")
      const cpfNormalizado = tipoBusca === "cpf" || tipoBusca === "cnpj" ? normalizeCpfCnpj(cpfBusca) : ""
      const nomeNormalizado = tipoBusca === "nome" ? nomeBusca.trim() : ""
      const refreshed = await getFichas({ cpf: cpfNormalizado, nome: nomeNormalizado })
      setConsultaItems(refreshed.fichas)
      setSelectedContratos((current) => current.map((contrato) => (contrato.id === response.ficha.id ? response.ficha : contrato)))
    } catch (error) {
      setEditMessage(error instanceof Error ? error.message : "Erro ao atualizar a ficha.")
    } finally {
      setEditLoading(false)
    }
  }

  if (!consultor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md border-l-4 border-l-primary shadow-md">
          <CardHeader>
            <CardTitle>Tela de Acesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="codigoAcesso">Codigo de acesso</Label>
              <Input
                id="codigoAcesso"
                value={codigoAcesso}
                onChange={(event) => setCodigoAcesso(event.target.value)}
                placeholder="Digite seu codigo"
                disabled={authLoading}
              />
            </div>
            {authError && <p className="text-sm text-red-600">{authError}</p>}
            <Button className="w-full" onClick={() => void handleLogin()} disabled={authLoading}>
              {authLoading ? "Validando..." : "Entrar"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-6 px-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="CABRICOP" className="h-12 md:h-16 w-auto" />
            <div>
              <p className="font-semibold">{consultor.nome}</p>
              <p className="text-sm opacity-80">Nivel: {getAccessLevelLabel(consultor.nivelAcesso)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <>
                <Button variant="secondary" onClick={() => void handleOpenTimeline(true)}>
                  <Clock3 className="h-4 w-4" />
                  Timeline
                </Button>
                <Button variant="secondary" size="icon" aria-label="Configuracoes" onClick={() => void handleOpenSettings(true)}>
                  <Settings className="h-5 w-5" />
                </Button>

                {settingsOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 text-foreground">
                    <div className="max-h-[88vh] w-full max-w-[1200px] overflow-x-hidden overflow-y-auto rounded-lg border bg-background shadow-lg">
                      <div className="flex items-start justify-between gap-4 px-6 pt-6">
                        <div className="space-y-2">
                          <h2 className="text-lg font-semibold leading-none">
                            {settingsSection === "users"
                              ? "Usuarios"
                              : settingsSection === "documents"
                                ? "Modelos de Documentos"
                                : "Configuracoes"}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            {settingsSection === "users"
                              ? "Gerencie os acessos de administradores, comerciais e andamento."
                              : settingsSection === "documents"
                                ? "Escolha qual modelo deseja editar."
                                : ""}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {settingsSection !== "menu" ? (
                            <Button variant="outline" size="sm" onClick={handleBackSettings}>
                              Voltar
                            </Button>
                          ) : null}
                          <Button variant="outline" size="sm" onClick={() => void handleOpenSettings(false)}>
                            Fechar
                          </Button>
                        </div>
                      </div>

                  {settingsSection === "menu" ? (
                    <div className="grid gap-4 px-6 pb-6 pt-5 md:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto justify-start gap-3 p-5 text-left"
                        onClick={() => void handleOpenUsersSettings()}
                      >
                        <UserPlus className="h-5 w-5 text-primary" />
                        <span>
                          <span className="block font-semibold">Usuarios</span>
                        </span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto justify-start gap-3 p-5 text-left"
                        onClick={() => setSettingsSection("documents")}
                      >
                        <FileText className="h-5 w-5 text-primary" />
                        <span>
                          <span className="block font-semibold">Modelos de Documentos</span>
                        </span>
                      </Button>
                    </div>
                  ) : null}

                  {settingsSection === "documents" ? (
                    <div className="space-y-4 px-6 pb-6 pt-5">
                      {templateMessage ? <p className="text-sm text-primary">{templateMessage}</p> : null}
                      <div className="grid gap-4 md:grid-cols-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-auto justify-start gap-3 p-5 text-left"
                          onClick={() => void handleOpenTemplateEditor("contract")}
                        >
                          <FileText className="h-5 w-5 text-primary" />
                          <span>
                            <span className="block font-semibold">Modelo de Contrato</span>
                            <span className="block text-sm font-normal text-muted-foreground">
                              Editar texto base do contrato
                            </span>
                          </span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-auto justify-start gap-3 p-5 text-left"
                          onClick={() => void handleOpenTemplateEditor("procuration")}
                        >
                          <FileText className="h-5 w-5 text-primary" />
                          <span>
                            <span className="block font-semibold">Modelo de Procuração</span>
                            <span className="block text-sm font-normal text-muted-foreground">
                              Editar texto base da procuração
                            </span>
                          </span>
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {settingsSection === "users" ? (
                  <div className="space-y-5 px-6 pb-6 pt-5">
                    <Card className="border border-border/70 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          Adicionar novo usuario
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_220px_auto] xl:items-end">
                        <div className="space-y-2 min-w-0">
                          <Label htmlFor="novoUsuarioNome">Nome do responsavel</Label>
                          <Input
                            id="novoUsuarioNome"
                            value={newUserName}
                            onChange={(event) => setNewUserName(event.target.value)}
                            placeholder="Digite o nome"
                            disabled={userSaving}
                          />
                        </div>
                        <div className="space-y-2 min-w-0">
                          <Label htmlFor="novoUsuarioCodigo">Codigo de acesso</Label>
                          <Input
                            id="novoUsuarioCodigo"
                            value={newUserCode}
                            onChange={(event) => setNewUserCode(event.target.value)}
                            placeholder="Digite o codigo"
                            disabled={userSaving}
                          />
                        </div>
                        <div className="space-y-2 min-w-0">
                          <Label htmlFor="novoUsuarioNivel">Nivel</Label>
                          <Select
                            value={newUserLevel}
                            onValueChange={(value) => setNewUserLevel(value as AccessCodeRecord["nivelAcesso"])}
                            disabled={userSaving}
                          >
                            <SelectTrigger id="novoUsuarioNivel">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="consultor">Comercial</SelectItem>
                              <SelectItem value="andamento">Andamento</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button className="w-full xl:w-auto xl:min-w-[120px]" onClick={() => void handleCreateUser()} disabled={userSaving}>
                          {userSaving ? "Salvando..." : "Adicionar"}
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border border-border/70 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-base">Usuarios cadastrados</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {usersError && <p className="text-sm text-red-600">{usersError}</p>}
                        {usersMessage && <p className="text-sm text-primary font-medium">{usersMessage}</p>}

                        {usersLoading ? (
                          <p className="text-sm text-muted-foreground">Carregando usuarios...</p>
                        ) : (
                          <div className="space-y-3">
                            {users.map((user) => (
                              <div key={user.id} className="rounded-xl border border-border bg-background/70 p-4">
                                {editingUserId === user.id ? (
                                  <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_180px_180px]">
                                    <div className="space-y-2 min-w-0">
                                      <Label htmlFor={`edit-nome-${user.id}`}>Nome</Label>
                                      <Input
                                        id={`edit-nome-${user.id}`}
                                        value={editUserName}
                                        onChange={(event) => setEditUserName(event.target.value)}
                                        disabled={userUpdating}
                                      />
                                    </div>

                                    <div className="space-y-2 min-w-0">
                                      <Label htmlFor={`edit-codigo-${user.id}`}>Codigo</Label>
                                      <Input
                                        id={`edit-codigo-${user.id}`}
                                        value={editUserCode}
                                        onChange={(event) => setEditUserCode(event.target.value)}
                                        disabled={userUpdating}
                                      />
                                    </div>

                                    <div className="space-y-2 min-w-0">
                                      <Label htmlFor={`edit-nivel-${user.id}`}>Nivel</Label>
                                      <Select
                                        value={editUserLevel}
                                        onValueChange={(value) => setEditUserLevel(value as AccessCodeRecord["nivelAcesso"])}
                                        disabled={userUpdating}
                                      >
                                        <SelectTrigger id={`edit-nivel-${user.id}`}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="consultor">Comercial</SelectItem>
                                          <SelectItem value="andamento">Andamento</SelectItem>
                                          <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-2 min-w-0">
                                      <Label htmlFor={`edit-status-${user.id}`}>Status</Label>
                                      <Select
                                        value={editUserStatus}
                                        onValueChange={(value) => setEditUserStatus(value as "ativo" | "inativo")}
                                        disabled={userUpdating || user.id === consultor.id}
                                      >
                                        <SelectTrigger id={`edit-status-${user.id}`}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="ativo">Ativo</SelectItem>
                                          <SelectItem value="inativo">Inativo</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row lg:col-span-2 xl:col-span-4">
                                      <Button onClick={() => void handleUpdateUser()} disabled={userUpdating}>
                                        {userUpdating ? "Salvando..." : "Salvar edicao"}
                                      </Button>
                                      <Button variant="outline" onClick={cancelEditingUser} disabled={userUpdating}>
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                  <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-5 xl:gap-4 min-w-0">
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nome</p>
                                      <p className="mt-1 font-medium break-words">{user.nomeResponsavel}</p>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Codigo</p>
                                      <p className="mt-1 font-mono text-sm break-all">{user.codigoAcesso}</p>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nivel</p>
                                      <p className="mt-1">{getAccessLevelLabel(user.nivelAcesso)}</p>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
                                      <p className="mt-1">{user.ativo ? "Ativo" : "Inativo"}</p>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Atualizado em</p>
                                      <p className="mt-1 text-sm text-muted-foreground break-words">
                                        {formatAccessDate(user.updatedAt || user.createdAt)}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => startEditingUser(user)}
                                      disabled={deletingUserId === user.id}
                                    >
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Editar
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => void handleDeleteUser(user)}
                                      disabled={deletingUserId === user.id || user.id === consultor.id}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      {deletingUserId === user.id ? "Removendo..." : "Remover"}
                                    </Button>
                                  </div>
                                </div>
                                )}
                              </div>
                            ))}

                            {users.length === 0 && (
                              <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
                                Nenhum usuario encontrado.
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                  ) : null}
                    </div>
                  </div>
                )}
              </>
            )}

            <Button variant="secondary" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs value={isAndamento ? "consultar" : activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className={`grid w-full ${isAndamento ? "grid-cols-1" : "grid-cols-2"}`}>
            {!isAndamento ? <TabsTrigger value="cadastrar">Cadastrar Ficha</TabsTrigger> : null}
            <TabsTrigger value="consultar">Consulta de Ficha</TabsTrigger>
          </TabsList>

          {!isAndamento ? (
            <TabsContent value="cadastrar" className="space-y-4" ref={cadastroTopRef}>
              {createMessage && <p className="text-sm text-primary font-medium">{createMessage}</p>}
              <FichaForm
                values={createValues}
                onChange={setCreateValues}
                onSubmit={handleCreate}
                submitLabel="Salvar Ficha de Venda"
                loading={createLoading}
                loadingLabel="Salvando..."
                requiredFields={["nomeCliente", "cpfCnpj"]}
                identifierPreview={createIdentifierPreview}
                onBack={createReturnToConsulta ? handleVoltarCadastroParaConsulta : undefined}
              />
            </TabsContent>
          ) : null}

          <TabsContent value="consultar" className="space-y-6">
            <Card ref={consultaTopRef} className="border-l-4 border-l-primary shadow-md">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle>Consulta de Ficha</CardTitle>
                {viewMode !== "list" && consultaItems.length > 0 && (
                  <Button type="button" variant="outline" onClick={handleVoltarConsulta}>
                    <ArrowLeft className="size-4" />
                    Voltar
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr_auto]">
                  <div className="space-y-2">
                    <Label htmlFor="tipoBusca">Tipo de Consulta</Label>
                    <Select value={tipoBusca} onValueChange={(value) => setTipoBusca(value as TipoBusca)}>
                      <SelectTrigger id="tipoBusca">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpf">CPF</SelectItem>
                        <SelectItem value="cnpj">CNPJ</SelectItem>
                        <SelectItem value="nome">Nome</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valorBusca">{tipoBusca === "nome" ? "Nome" : tipoBusca.toUpperCase()}</Label>
                    <Input
                      id="valorBusca"
                      value={tipoBusca === "nome" ? nomeBusca : cpfBusca}
                      onChange={(event) => {
                        if (tipoBusca === "cpf" || tipoBusca === "cnpj") {
                          setCpfBusca(event.target.value)
                        } else {
                          setNomeBusca(event.target.value)
                        }
                      }}
                      placeholder={
                        tipoBusca === "nome"
                          ? "Digite o nome do cliente"
                          : `Digite o ${tipoBusca.toUpperCase()} com ou sem mascara`
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={() => void handleConsultarFichas()} disabled={consultaLoading}>
                      {consultaLoading ? "Consultando..." : "Consultar"}
                    </Button>
                  </div>
                </div>
                {consultaError && <p className="text-sm text-red-600">{consultaError}</p>}
              </CardContent>
            </Card>

            {consultaItems.length > 0 && viewMode === "list" && (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Fichas Encontradas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {consultaClienteGroups.map((cliente) => {
                    const fichaPrincipal = cliente.contratos[0]

                    return (
                      <div key={cliente.key} className="rounded-lg border border-border p-4">
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto] xl:items-start">
                          <div className="xl:col-span-2">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cliente</p>
                            <p className="mt-1 font-semibold break-words">{cliente.nomeCliente}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">CPF/CNPJ</p>
                            <p className="mt-1 text-sm break-words">{cliente.cpfCnpj || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Telefone</p>
                            <p className="mt-1 text-sm break-words">{cliente.telefones || "-"}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Consultor</p>
                            <p className="mt-1 text-sm break-words">{cliente.nomeConsultor || "-"}</p>
                          </div>
                          <div className="flex items-start md:col-span-2 xl:col-span-1">
                            {fichaPrincipal ? (
                              <Button variant="outline" onClick={() => void openFicha(fichaPrincipal.id, "view", cliente.contratos)}>
                                Visualizar
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {selectedFicha && viewMode === "view" && (
              <Card className="shadow-md">
                <CardContent className="space-y-4">
                  <ClienteReadCard values={editValues} onEdit={() => setViewMode("editClient")} canEdit={canEditSelectedFicha} />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <h2 className="text-lg font-semibold text-foreground">Fichas</h2>
                    {canEditSelectedFicha ? (
                      <Button type="button" onClick={handleAddNovoContrato}>
                        <Plus className="size-4" />
                        Adicionar
                      </Button>
                    ) : null}
                  </div>

                  <Accordion
                    type="single"
                    collapsible
                    value={expandedContratoId}
                    onValueChange={(value) => void handleContratoAccordionChange(value)}
                    className="space-y-3"
                  >
                    {(selectedContratos.length > 0 ? selectedContratos : [selectedFicha]).map((contrato) => (
                      <AccordionItem key={contrato.id} value={contrato.id} className="rounded-lg border border-border px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex w-full flex-col gap-1 pr-2 sm:flex-row sm:items-center sm:justify-between">
                            <span className="font-semibold text-primary">{getFichaLabel(contrato.nomeCliente)}</span>
                            <span className="text-sm font-medium text-muted-foreground">
                              Data da ficha: {formatDisplayDate(contrato.dataContrato)}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          {selectedFicha.id === contrato.id ? (
                            <div className="space-y-4">
                              <FichaReadView
                                values={editValues}
                                actions={
                                  <>
                                    {canEditSelectedFicha ? (
                                      <Button onClick={() => setViewMode("edit")}>✏️</Button>
                                    ) : null}
                                    <Button variant="outline" onClick={() => void downloadFichaPdf(editValues)}>
                                      🖨️ FICHA
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => void handleDownloadDocument("contract")}>
                                      🖨️ CONTRATO
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => void handleDownloadDocument("procuration")}>
                                      🖨️ PROCURAÇÃO
                                    </Button>
                                  </>
                                }
                                details={<LogSummary log={latestFichaLog} showEntityLabel={false} />}
                              />
                            </div>
                          ) : null}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )}

            {selectedFicha && (viewMode === "edit" || viewMode === "editClient") && (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>{viewMode === "editClient" ? "Edicao dos Dados do Cliente" : "Edicao da Ficha"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!canEditSelectedFicha ? (
                    <p className="text-sm text-red-600">Voce nao tem permissao para editar esta ficha.</p>
                  ) : (
                    <>
                      {editMessage && <p className="text-sm text-primary font-medium">{editMessage}</p>}
                      <FichaForm
                        values={editValues}
                        onChange={setEditValues}
                        onSubmit={handleUpdate}
                        submitLabel="Salvar 💾"
                        loading={editLoading}
                        loadingLabel="Atualizando..."
                        showInlineSubmit
                        visibleSections={viewMode === "editClient" ? ["client"] : undefined}
                        onCancelEdit={() => setViewMode("view")}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
        <Dialog
          open={Boolean(templateEditorKind)}
          onOpenChange={(open) => {
            if (!open) {
              setTemplateEditorKind(null)
              setTemplateVariablesOpen(false)
            }
          }}
        >
          <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Editar modelo: {templateEditorKind ? DOCUMENT_TEMPLATE_LABELS[templateEditorKind] : ""}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              <p className="text-sm text-muted-foreground">
                Use placeholders como {"{{nomeCliente}}"}, {"{{cpfCnpj}}"}, {"{{processosResumo}}"} e {"{{multasResumo}}"}.
              </p>
              <div className="flex flex-wrap gap-2 rounded-md border border-border bg-muted/30 p-2">
                <Button type="button" variant="outline" size="icon-sm" onClick={() => handleTemplateCommand("bold")} disabled={templateLoading}>
                  <Bold className="size-4" />
                </Button>
                <Button type="button" variant="outline" size="icon-sm" onClick={() => handleTemplateCommand("italic")} disabled={templateLoading}>
                  <Italic className="size-4" />
                </Button>
                <Button type="button" variant="outline" size="icon-sm" onClick={() => handleTemplateCommand("underline")} disabled={templateLoading}>
                  <Underline className="size-4" />
                </Button>
                <Button type="button" variant="outline" size="icon-sm" onClick={() => handleTemplateCommand("justifyLeft")} disabled={templateLoading}>
                  <AlignLeft className="size-4" />
                </Button>
                <Button type="button" variant="outline" size="icon-sm" onClick={() => handleTemplateCommand("justifyCenter")} disabled={templateLoading}>
                  <AlignCenter className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant={templateVariablesOpen ? "secondary" : "outline"}
                  size="icon-sm"
                  onClick={() => setTemplateVariablesOpen((current) => !current)}
                  disabled={templateLoading}
                >
                  <Tag className="size-4" />
                </Button>
              </div>
              {templateVariablesOpen ? (
                <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Variaveis disponiveis</p>
                  <div className="flex flex-wrap gap-2">
                    {DOCUMENT_TEMPLATE_VARIABLES.map((variable) => (
                      <Button
                        key={variable}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleInsertTemplateVariable(variable)}
                        disabled={templateLoading}
                        className="font-mono text-xs"
                      >
                        {variable}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div
                key={templateEditorKind ?? "template-editor"}
                ref={templateEditorRef}
                contentEditable={!templateLoading}
                suppressContentEditableWarning
                onInput={(event) => setTemplateContent(event.currentTarget.innerHTML)}
                className="h-[60vh] min-h-[420px] overflow-y-auto rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-6 outline-none"
                dangerouslySetInnerHTML={{ __html: templateContent }}
              />
              <LogSummary log={latestTemplateLog} />
              {templateMessage ? <p className="text-sm text-primary">{templateMessage}</p> : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTemplateEditorKind(null)} disabled={templateLoading}>
                Fechar
              </Button>
              <Button type="button" onClick={() => void handleSaveTemplate()} disabled={templateLoading}>
                {templateLoading ? "Salvando..." : "Salvar modelo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={timelineOpen} onOpenChange={(open) => void handleOpenTimeline(open)}>
          <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Timeline</DialogTitle>
            </DialogHeader>
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {timelineError ? <p className="text-sm text-red-600">{timelineError}</p> : null}
              {timelineLoading ? <p className="text-sm text-muted-foreground">Carregando timeline...</p> : null}
              {!timelineLoading && timelineGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum log encontrado.</p>
              ) : null}
              {timelineGroups.map((group) => {
                const latestLog = group.logs[0]
                return (
                <div key={group.key} className="rounded-lg border border-border bg-background px-4 py-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium text-foreground">{group.entityLabel}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">{formatAccessDate(latestLog?.createdAt || "")}</p>
                      <Button type="button" variant="outline" size="icon-sm" onClick={() => setSelectedTimelineGroup(group)}>
                        <Eye className="size-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-foreground">Por: {latestLog?.actorName || "-"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {group.logs.length > 1 ? `${group.logs.length} atualizacoes registradas.` : latestLog?.summary || "-"}
                  </p>
                </div>
              )})}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTimelineOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={Boolean(selectedTimelineGroup)} onOpenChange={(open) => !open && setSelectedTimelineGroup(null)}>
          <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Detalhes da atualizacao</DialogTitle>
            </DialogHeader>
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              {selectedTimelineGroup ? (
                <>
                  {selectedTimelineGroup.logs.map((log) => (
                    <div key={log.id} className="space-y-3 rounded-lg border border-border bg-background p-4">
                      <div>
                        <p className="font-medium text-foreground">{log.entityLabel || "-"}</p>
                        <p className="mt-1 text-sm text-foreground">{formatAccessDate(log.createdAt)}</p>
                        <p className="mt-1 text-sm text-foreground">Por: {log.actorName || "-"}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{log.summary || "-"}</p>
                      </div>
                      {(log.details || []).map((detail, index) => (
                        <div key={`${log.id}-${index}`} className="space-y-2 rounded-md border border-border bg-muted/10 p-3">
                          <p className="font-medium text-foreground">{detail.field || "-"}</p>
                          <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-md border border-border bg-muted/20 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Antes</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{detail.before || "-"}</p>
                          </div>
                          <div className="rounded-md border border-border bg-muted/20 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Depois</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{detail.after || "-"}</p>
                          </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSelectedTimelineGroup(null)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
