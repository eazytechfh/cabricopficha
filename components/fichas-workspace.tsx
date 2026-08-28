"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowLeft, Bold, Calendar, ChevronDown, Clock3, Eye, EyeOff, FileImage, FileText, IndentDecrease, IndentIncrease, Italic, List, ListOrdered, Minus, Palette, Pencil, Plus, Redo2, RemoveFormatting, Settings, Tag, Trash2, Underline, Undo2, UserPlus } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { FichaForm } from "@/components/ficha-form"
import { FichaReadView } from "@/components/ficha-read-view"
import { DocumentTemplatePdf } from "@/components/DocumentTemplatePdf"
import { createAccessUser, deleteAccessUser, getAccessUsers, updateAccessUser } from "@/lib/accessAdminService"
import { getCurrentAccess, hasAdminAccess, loginWithPassword, logout, resetPassword, resetPasswordWithPhone } from "@/lib/accessService"
import { getDefaultConsultorOption } from "@/lib/ficha-options"
import { formatFichaNumber } from "@/lib/ficha-client-name"
import { downloadFichaPdf } from "@/lib/ficha-pdf-client"
import { downloadFilledDocumentPdf } from "@/lib/document-pdf-client"
import { DEFAULT_DOCUMENT_TEMPLATES, DOCUMENT_TEMPLATE_LABELS, fillDocumentTemplate, normalizeDocumentTemplateContent, prepareDocumentTemplateContent, type DocumentTemplateKind } from "@/lib/document-templates"
import { getDocumentTemplate, updateDocumentTemplate } from "@/lib/document-template-client"
import { captureEditorSelection, getEditorSelectionFormatting, runEditorAlignmentCommand, runEditorCommand, runEditorFontSizeCommand, syncEditableContent } from "@/lib/document-editor"
import { convertEmptyListItemToSpacer, normalizeDocumentListSpacing } from "@/lib/document-list-spacing"
import type { DocumentEditorFormatCommand } from "@/lib/document-editor-formats"
import { resolveCustomEditorHistory, type DocumentEditorHistoryEntry } from "@/lib/document-editor-history"
import { getLatestLog, getTimelineLogs } from "@/lib/activity-log-client"
import { updateFicha } from "@/lib/fichaService"
import { saveFichaWithPdfAndWebhook } from "@/lib/fichaCreateService"
import { checkFichaDuplicates, deleteFicha, getFichaById, getFichas } from "@/lib/fichas-api"
import { canEditFicha, normalizeCpfCnpj, toRecordValues } from "@/lib/ficha-utils"
import { parsePaymentEntries, validatePaymentEntries } from "@/lib/payment-details"
import { shouldValidatePayments } from "@/lib/payment-validation-context"
import {
  emptyFichaValues,
  type AccessCodeRecord,
  type ActivityLogRecord,
  type ConsultorSession,
  type DuplicateResolution,
  type FichaDuplicateMatch,
  type FichaFormValues,
  type FichaListItem,
  type FichaRecord,
} from "@/lib/ficha-types"

type ViewMode = "list" | "picker" | "view" | "edit" | "editClient"
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
  "{{tipoOutroServico}}",
  "{{poderesOutroServico}}",
  "{{placas}}",
  "{{dataHoje}}",
  "{{dataFicha}}",
  "{{consultor}}",
]

const DOCUMENT_TEMPLATE_FONT_OPTIONS = [
  { label: "Arial", value: "Arial" },
  { label: "Arial Narrow", value: "Arial Narrow" },
  { label: "Calibri", value: "Calibri" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Georgia", value: "Georgia" },
  { label: "Courier New", value: "Courier New" },
]

const MAX_TEMPLATE_IMAGE_SIZE_BYTES = 1_500_000

const DOCUMENT_TEMPLATE_FONT_SIZE_OPTIONS = [
  "10",
  "12",
  "14",
  "18",
  "22",
  "24",
  "32",
  "48",
]

const DOCUMENT_TEMPLATE_PREVIEW_VALUES: FichaFormValues = {
  ...emptyFichaValues,
  nomeCliente: "FRANCISCO VALENTIM BRAGA FILHO",
  telefones: "21999879935",
  endereco: "Rua Exemplo, 123",
  municipio: "Rio de Janeiro",
  uf: "RJ",
  cpfCnpj: "27381994704",
  cnh: "113553258",
  email: "cliente@exemplo.com.br",
  nomeConsultor: "WALLACE",
  formaPagamento: "PIX",
  banco: "ITAU",
  valorTotal: "R$ 200,00",
  valorEntrada: "R$ 100,00",
  valorRestante: "R$ 100,00",
  observacaoValorRestante: "Pagamento restante em 30 dias.",
  tipoProcesso: "SUSPENSAO",
  numeroProcesso: "53535345345435",
  prazoProcesso: "2026-05-07",
  autoDetran: "I53552418",
  placa: "RIQ1E09",
  prazoMulta: "2026-05-30",
  tipoOutroServico: "Regularização documental",
  poderesOutroServico: "Representar o cliente perante os órgãos competentes e praticar os atos necessários ao serviço.",
}

function getAccessLevelLabel(level: AccessCodeRecord["nivelAcesso"]) {
  if (level === "admin") return "Admin"
  if (level === "andamento") return "Andamento"
  return "Comercial"
}

function getFichaLabel(numeroFicha: number, nomeCliente: string) {
  if (numeroFicha > 0) {
    return `Ficha ${formatFichaNumber(numeroFicha)}`
  }

  const match = (nomeCliente || "").trim().match(/(\d{1,2})$/)
  if (match) {
    return `Ficha ${formatFichaNumber(Number(match[1]))}`
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
    <div className="min-w-0 border-b border-slate-200 px-3 py-2.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium leading-5 text-slate-900">{fallback(value)}</p>
    </div>
  )
}

function ClienteReadCard({ values, onEdit, canEdit }: { values: FichaFormValues; onEdit: () => void; canEdit: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
      <div className="relative flex items-center justify-center bg-[#214674] px-4 py-2 text-white">
        <UserPlus className="absolute left-4 size-4" />
        <h3 className="text-sm font-bold uppercase tracking-wide">Dados do Cliente</h3>
        {canEdit ? (
          <Button type="button" variant="ghost" size="sm" onClick={onEdit} className="absolute right-2 h-7 text-white hover:bg-white/15 hover:text-white">
            <Pencil className="size-3.5" />
            Editar
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        <ClienteValue label="Nome Completo" value={getClienteBaseName(values.nomeCliente) || values.nomeCliente} />
        <ClienteValue label="Terceiros" value={values.terceiros} />
        <ClienteValue label="Telefone(s)" value={values.telefones} />
        <ClienteValue label="E-mail" value={values.email} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[130px_1fr_110px_150px_180px_80px]">
        <ClienteValue label="CEP" value={values.cep} />
        <ClienteValue label="Endereco" value={values.endereco} />
        <ClienteValue label="Numero" value={values.numeroEndereco} />
        <ClienteValue label="Complemento" value={values.complementoEndereco} />
        <ClienteValue label="Municipio" value={values.municipio} />
        <ClienteValue label="UF" value={values.uf} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        <ClienteValue label="CPF/CNPJ" value={values.cpfCnpj} />
        <ClienteValue label="CNH" value={values.cnh} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3">
        <ClienteValue label="Data de Nascimento" value={formatDisplayDate(values.dataNascimento)} />
        <ClienteValue label="Data da 1a CNH" value={formatDisplayDate(values.dataPrimeiraCnh)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3">
        <ClienteValue label="Nacionalidade" value={values.nacionalidade} />
        <ClienteValue label="Estado Civil" value={values.estadoCivil} />
        <ClienteValue label="Profissão" value={values.profissao} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3">
        <ClienteValue label="Nome do Consultor" value={values.nomeConsultor} />
        <ClienteValue label="Origem" value={values.origem} />
        <ClienteValue label="SNE" value={values.sne} />
      </div>

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
  const [emailAcesso, setEmailAcesso] = useState("")
  const [senhaAcesso, setSenhaAcesso] = useState("")
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotPhone, setForgotPhone] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [resetToken, setResetToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [resetMessage, setResetMessage] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [authError, setAuthError] = useState("")
  const [authLoading, setAuthLoading] = useState(false)

  const [createValues, setCreateValues] = useState<FichaFormValues>(emptyFichaValues)
  const [createLoading, setCreateLoading] = useState(false)
  const [createMessage, setCreateMessage] = useState("")
  const [createIdentifierPreview, setCreateIdentifierPreview] = useState("")
  const [createReturnToConsulta, setCreateReturnToConsulta] = useState(false)
  const [duplicateMatches, setDuplicateMatches] = useState<FichaDuplicateMatch[]>([])
  const [duplicateActionId, setDuplicateActionId] = useState("")
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("cadastrar")

  const [tipoBusca, setTipoBusca] = useState<TipoBusca>("cpf")
  const [cpfBusca, setCpfBusca] = useState("")
  const [nomeBusca, setNomeBusca] = useState("")
  const [consultaLoading, setConsultaLoading] = useState(false)
  const [consultaError, setConsultaError] = useState("")
  const [consultaItems, setConsultaItems] = useState<FichaListItem[]>([])
  const [selectedContratos, setSelectedContratos] = useState<FichaListItem[]>([])
  const [selectedFicha, setSelectedFicha] = useState<FichaRecord | null>(null)
  const [clientBaseFicha, setClientBaseFicha] = useState<FichaRecord | null>(null)
  const [editValues, setEditValues] = useState<FichaFormValues>(emptyFichaValues)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [editLoading, setEditLoading] = useState(false)
  const [editMessage, setEditMessage] = useState("")
  const [documentLoading, setDocumentLoading] = useState<DocumentTemplateKind | null>(null)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("menu")
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState("")
  const [usersMessage, setUsersMessage] = useState("")
  const [users, setUsers] = useState<AccessCodeRecord[]>([])
  const [newUserName, setNewUserName] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPhone, setNewUserPhone] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [newUserPasswordConfirmation, setNewUserPasswordConfirmation] = useState("")
  const [newUserLevel, setNewUserLevel] = useState<AccessCodeRecord["nivelAcesso"]>("consultor")
  const [userSaving, setUserSaving] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState("")
  const [editingUserId, setEditingUserId] = useState("")
  const [editUserName, setEditUserName] = useState("")
  const [editUserEmail, setEditUserEmail] = useState("")
  const [editUserPhone, setEditUserPhone] = useState("")
  const [editUserLevel, setEditUserLevel] = useState<AccessCodeRecord["nivelAcesso"]>("consultor")
  const [editUserStatus, setEditUserStatus] = useState<"ativo" | "inativo">("ativo")
  const [editUserPassword, setEditUserPassword] = useState("")
  const [userUpdating, setUserUpdating] = useState(false)
  const [visibleUserPasswords, setVisibleUserPasswords] = useState<Record<string, boolean>>({})
  const [templateEditorKind, setTemplateEditorKind] = useState<DocumentTemplateKind | null>(null)
  const [templateContent, setTemplateContent] = useState("")
  const templateUndoHistoryRef = useRef<DocumentEditorHistoryEntry[]>([])
  const templateRedoHistoryRef = useRef<DocumentEditorHistoryEntry[]>([])
  const [templateFontFamily, setTemplateFontFamily] = useState("Arial")
  const [templateFontSize, setTemplateFontSize] = useState("14")
  const [templateTextColor, setTemplateTextColor] = useState("#111827")
  const [templateHighlightColor, setTemplateHighlightColor] = useState("#fff59d")
  const [selectedTemplateImage, setSelectedTemplateImage] = useState<HTMLImageElement | null>(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [templateSaving, setTemplateSaving] = useState(false)
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
  const templateContentRef = useRef("")
  const templateEditorKindRef = useRef<DocumentTemplateKind | null>(null)
  const templateSelectionRef = useRef<Range | null>(null)
  const templateLoadRequestRef = useRef(0)
  const templateImageInputRef = useRef<HTMLInputElement | null>(null)
  const cadastroTopRef = useRef<HTMLDivElement | null>(null)
  const consultaTopRef = useRef<HTMLDivElement | null>(null)

  templateContentRef.current = templateContent
  templateEditorKindRef.current = templateEditorKind

  const handleTemplateEditorRef = useCallback((editor: HTMLDivElement | null) => {
    templateEditorRef.current = editor
    if (editor) {
      syncEditableContent(editor, templateContentRef.current)
    }
  }, [])

  useEffect(() => {
    const access = getCurrentAccess()
    if (!access) return

    const defaultConsultor = getDefaultConsultorOption(access.nome)

    setConsultor(access)
    setCreateValues((current) => ({ ...current, nomeConsultor: current.nomeConsultor || defaultConsultor }))
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
    const accessToken = hashParams.get("access_token")
    const type = hashParams.get("type")

    if (type === "recovery" && accessToken) {
      setResetToken(accessToken)
      setForgotPasswordOpen(false)
      setAuthError("")
      window.history.replaceState(null, "", window.location.pathname)
    }
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
  const clientReadValues = useMemo(
    () => (clientBaseFicha ? toRecordValues(clientBaseFicha) : editValues),
    [clientBaseFicha, editValues]
  )

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
    const baseFichaId = selectedContratos[0]?.id

    if (!baseFichaId) {
      setClientBaseFicha(selectedFicha)
      return
    }

    if (selectedFicha?.id === baseFichaId) {
      setClientBaseFicha(selectedFicha)
      return
    }

    let cancelled = false

    void getFichaById(baseFichaId)
      .then((response) => {
        if (!cancelled) {
          setClientBaseFicha(response.ficha)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setClientBaseFicha(selectedFicha)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedContratos, selectedFicha])

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

  useEffect(() => {
    const editor = templateEditorRef.current
    if (!editor) return

    syncEditableContent(editor, templateContent)
  }, [templateContent, templateEditorKind])

  useEffect(() => {
    return () => {
      if (selectedTemplateImage) {
        selectedTemplateImage.style.outline = ""
      }
    }
  }, [selectedTemplateImage])

  const handleDownloadDocument = async (kind: DocumentTemplateKind) => {
    setEditMessage("")
    setDocumentLoading(kind)

    try {
      await downloadFilledDocumentPdf(kind, {
        ...editValues,
        createdAt: selectedFicha?.createdAt,
      })
    } catch (error) {
      setEditMessage(error instanceof Error ? error.message : "Erro ao gerar documento.")
    } finally {
      setDocumentLoading(null)
    }
  }

  const handleOpenTemplateEditor = async (kind: DocumentTemplateKind) => {
    if (!consultor || !isAdmin) return

    const requestId = ++templateLoadRequestRef.current
    templateEditorKindRef.current = kind
    setTemplateEditorKind(kind)
    setTemplateContent(prepareDocumentTemplateContent(kind, normalizeDocumentListSpacing(DEFAULT_DOCUMENT_TEMPLATES[kind])))
    setTemplateLoading(true)
    setTemplateSaving(false)
    setTemplateMessage("")
    setTemplateVariablesOpen(false)
    templateSelectionRef.current = null
    templateUndoHistoryRef.current = []
    templateRedoHistoryRef.current = []
    handleSelectTemplateImage(null)

    try {
      const template = await getDocumentTemplate(kind)
      if (requestId === templateLoadRequestRef.current) {
        setTemplateContent(prepareDocumentTemplateContent(kind, normalizeDocumentListSpacing(template.content)))
      }
    } catch (error) {
      if (requestId === templateLoadRequestRef.current) {
        setTemplateMessage(error instanceof Error ? error.message : "Erro ao carregar modelo.")
      }
    } finally {
      if (requestId === templateLoadRequestRef.current) {
        setTemplateLoading(false)
      }
    }
  }

  const handleCloseTemplateEditor = () => {
    templateLoadRequestRef.current += 1
    templateEditorKindRef.current = null
    templateSelectionRef.current = null
    templateUndoHistoryRef.current = []
    templateRedoHistoryRef.current = []
    handleSelectTemplateImage(null)
    setTemplateEditorKind(null)
    setTemplateContent("")
    setTemplateLoading(false)
    setTemplateSaving(false)
    setTemplateVariablesOpen(false)
  }

  const handleSaveTemplate = async () => {
    if (!consultor || !templateEditorKind) return

    const saveRequestId = templateLoadRequestRef.current
    const saveKind = templateEditorKind
    setTemplateLoading(true)
    setTemplateSaving(true)
    setTemplateMessage("")

    try {
      const template = await updateDocumentTemplate(saveKind, normalizeDocumentListSpacing(templateContent), consultor)
      if (saveRequestId !== templateLoadRequestRef.current || templateEditorKindRef.current !== saveKind) return

      setTemplateContent(normalizeDocumentTemplateContent(template.content))
      setTemplateMessage("Modelo salvo com sucesso.")
      const latest = await getLatestLog("document_template", saveKind)
      if (saveRequestId === templateLoadRequestRef.current && templateEditorKindRef.current === saveKind) {
        setLatestTemplateLog(latest)
      }
    } catch (error) {
      if (saveRequestId === templateLoadRequestRef.current && templateEditorKindRef.current === saveKind) {
        setTemplateMessage(error instanceof Error ? error.message : "Erro ao salvar modelo.")
      }
    } finally {
      if (saveRequestId === templateLoadRequestRef.current && templateEditorKindRef.current === saveKind) {
        setTemplateLoading(false)
        setTemplateSaving(false)
      }
    }
  }

  const captureTemplateSelection = () => {
    const editor = templateEditorRef.current
    if (!editor) return

    const selection = editor.ownerDocument.defaultView?.getSelection() ?? null
    const range = captureEditorSelection(editor, selection)
    if (range) templateSelectionRef.current = range

    const formatting = getEditorSelectionFormatting(editor, selection)
    if (formatting?.fontFamily) setTemplateFontFamily(formatting.fontFamily)
    if (formatting?.fontSize) setTemplateFontSize(formatting.fontSize)
  }

  const runTemplateCommand = (command: string, value?: string) => {
    const editor = templateEditorRef.current
    if (!editor || templateLoading) return

    const result = runEditorCommand(editor, command, value, templateSelectionRef.current)
    templateSelectionRef.current = result.selection
    setTemplateContent(result.content)
  }

  const handleTemplateCommand = (command: "bold" | "italic" | "underline" | DocumentEditorFormatCommand) => {
    const editor = templateEditorRef.current
    if (!editor || templateLoading) return

    if (command === "undo" || command === "redo") {
      const source = command === "undo" ? templateUndoHistoryRef.current : templateRedoHistoryRef.current
      const target = command === "undo" ? templateRedoHistoryRef.current : templateUndoHistoryRef.current
      const entry = source.at(-1)
      if (entry) {
        const resolved = resolveCustomEditorHistory(editor.innerHTML, entry, command)
        if (resolved.applied) {
          source.pop()
          target.push(entry)
          editor.innerHTML = resolved.content
          setTemplateContent(resolved.content)
          templateSelectionRef.current = null
          return
        }
      }
      runTemplateCommand(command)
      return
    }

    templateRedoHistoryRef.current = []
    if (command === "justifyLeft" || command === "justifyCenter" || command === "justifyRight" || command === "justifyFull") {
      const before = editor.innerHTML
      const result = runEditorAlignmentCommand(editor, command, templateSelectionRef.current)
      if (result.executed && result.content !== before) {
        templateUndoHistoryRef.current.push({ before, after: result.content })
      }
      templateSelectionRef.current = result.selection
      setTemplateContent(result.content)
      return
    }
    runTemplateCommand(command)
  }

  const handleTemplateFontChange = (fontFamily: string) => {
    const editor = templateEditorRef.current
    const normalizedFontFamily = fontFamily.trim()
    if (!editor || templateLoading || !normalizedFontFamily) return

    setTemplateFontFamily(normalizedFontFamily)
    editor.ownerDocument.execCommand("styleWithCSS", false, "true")
    runTemplateCommand("fontName", normalizedFontFamily)
  }

  const handleTemplateFontSizeChange = (fontSize: string) => {
    const editor = templateEditorRef.current
    if (!editor || templateLoading) return

    const result = runEditorFontSizeCommand(editor, fontSize, templateSelectionRef.current)
    if (!result.executed) return

    templateSelectionRef.current = result.selection
    setTemplateContent(result.content)
    setTemplateFontSize(result.fontSize)
  }

  const handleTemplateTextColorChange = (color: string) => {
    const editor = templateEditorRef.current
    if (!editor || templateLoading) return

    setTemplateTextColor(color)
    editor.ownerDocument.execCommand("styleWithCSS", false, "true")
    runTemplateCommand("foreColor", color)
  }

  const handleTemplateHighlightColorChange = (color: string) => {
    const editor = templateEditorRef.current
    if (!editor || templateLoading) return

    setTemplateHighlightColor(color)
    editor.ownerDocument.execCommand("styleWithCSS", false, "true")
    runTemplateCommand("hiliteColor", color)
  }

  const handleSelectTemplateImage = (image: HTMLImageElement | null) => {
    if (selectedTemplateImage && selectedTemplateImage !== image) {
      selectedTemplateImage.style.outline = ""
    }

    if (!image) {
      setSelectedTemplateImage(null)
      return
    }

    image.style.outline = "2px solid #0f5a9c"
    image.style.outlineOffset = "2px"
    setSelectedTemplateImage(image)
  }

  const syncTemplateEditorContent = () => {
    const editor = templateEditorRef.current
    if (!editor) return
    setTemplateContent(editor.innerHTML)
  }

  const handleTemplateImageResize = (direction: "increase" | "decrease") => {
    if (!selectedTemplateImage || templateLoading) return

    const currentWidth = Number.parseFloat(selectedTemplateImage.style.width || `${selectedTemplateImage.clientWidth || 220}`)
    const nextWidth = direction === "increase" ? currentWidth + 20 : currentWidth - 20
    const safeWidth = Math.max(80, Math.min(nextWidth, 700))

    selectedTemplateImage.style.width = `${safeWidth}px`
    selectedTemplateImage.style.maxWidth = "100%"
    selectedTemplateImage.style.height = "auto"
    syncTemplateEditorContent()
  }

  const handleTemplateImageAlign = (align: "left" | "center" | "right") => {
    if (!selectedTemplateImage || templateLoading) return

    selectedTemplateImage.style.display = "block"
    selectedTemplateImage.style.marginBottom = "16px"

    if (align === "left") {
      selectedTemplateImage.style.marginLeft = "0"
      selectedTemplateImage.style.marginRight = "auto"
    } else if (align === "right") {
      selectedTemplateImage.style.marginLeft = "auto"
      selectedTemplateImage.style.marginRight = "0"
    } else {
      selectedTemplateImage.style.marginLeft = "auto"
      selectedTemplateImage.style.marginRight = "auto"
    }

    syncTemplateEditorContent()
  }

  const handleInsertTemplateVariable = (variable: string) => {
    const editor = templateEditorRef.current
    if (!editor || templateLoading) return

    runTemplateCommand("insertText", variable)
  }

  const handleTemplateImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const editor = templateEditorRef.current

    if (!file || !editor || templateLoading) {
      if (event.target) event.target.value = ""
      return
    }

    const imageRequestId = templateLoadRequestRef.current
    const imageKind = templateEditorKind

    if (!file.type.startsWith("image/")) {
      event.target.value = ""
      setTemplateMessage("Selecione um arquivo de imagem valido.")
      return
    }

    if (file.size > MAX_TEMPLATE_IMAGE_SIZE_BYTES) {
      event.target.value = ""
      setTemplateMessage("A imagem deve ter no maximo 1,5 MB.")
      return
    }

    const fileAsDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ""))
      reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem selecionada."))
      reader.readAsDataURL(file)
    }).catch(() => "")

    if (
      imageRequestId !== templateLoadRequestRef.current ||
      imageKind !== templateEditorKindRef.current ||
      templateEditorRef.current !== editor
    ) {
      event.target.value = ""
      return
    }

    if (!fileAsDataUrl) {
      event.target.value = ""
      setTemplateMessage("Nao foi possivel carregar a imagem selecionada.")
      return
    }

    runTemplateCommand(
      "insertHTML",
      `<img src="${fileAsDataUrl}" alt="${file.name.replace(/"/g, "")}" style="width: 220px; max-width: 100%; height: auto; display: block; margin: 0 auto 16px;" />`
    )
    event.target.value = ""
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

  const templatePreviewValues = useMemo<FichaFormValues & { createdAt?: string }>(() => {
    if (selectedFicha) {
      return { ...editValues, createdAt: selectedFicha.createdAt }
    }

    return {
      ...DOCUMENT_TEMPLATE_PREVIEW_VALUES,
      nomeConsultor: consultor?.nome || DOCUMENT_TEMPLATE_PREVIEW_VALUES.nomeConsultor,
      email: consultor?.email || DOCUMENT_TEMPLATE_PREVIEW_VALUES.email,
      telefones: consultor?.telefone || DOCUMENT_TEMPLATE_PREVIEW_VALUES.telefones,
    }
  }, [consultor, editValues, selectedFicha])

  const templatePreviewContent = useMemo(() => {
    if (!templateEditorKind || !templateContent.trim()) return ""
    return fillDocumentTemplate(templateContent, templatePreviewValues, templateEditorKind)
  }, [templateContent, templateEditorKind, templatePreviewValues])

  const handleLogin = async () => {
    setAuthLoading(true)
    setAuthError("")

    try {
      const access = await loginWithPassword(emailAcesso, senhaAcesso)
      const defaultConsultor = getDefaultConsultorOption(access.nome)

      setConsultor(access)
      setCreateValues((current) => ({ ...current, nomeConsultor: defaultConsultor }))
      setEmailAcesso("")
      setSenhaAcesso("")
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "E-mail ou senha invalidos.")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim() || !forgotPhone.trim()) {
      setAuthError("Informe o e-mail e o telefone para redefinir a senha.")
      return
    }

    if (!newPassword || !confirmPassword) {
      setAuthError("Preencha e confirme a nova senha.")
      return
    }

    if (newPassword !== confirmPassword) {
      setAuthError("A confirmacao da senha nao confere.")
      return
    }

    setForgotLoading(true)
    setAuthError("")
    setResetMessage("")

    try {
      const response = await resetPasswordWithPhone(forgotEmail.trim(), forgotPhone.trim(), newPassword)
      setResetMessage(response.message)
      setForgotEmail("")
      setForgotPhone("")
      setNewPassword("")
      setConfirmPassword("")
      setForgotPasswordOpen(false)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Erro ao redefinir a senha.")
    } finally {
      setForgotLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetToken) return

    if (!newPassword || !confirmPassword) {
      setAuthError("Preencha e confirme a nova senha.")
      return
    }

    if (newPassword !== confirmPassword) {
      setAuthError("A confirmacao da senha nao confere.")
      return
    }

    setResetLoading(true)
    setAuthError("")
    setResetMessage("")

    try {
      const response = await resetPassword(resetToken, newPassword)
      setResetMessage(response.message)
      setNewPassword("")
      setConfirmPassword("")
      setResetToken("")
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Erro ao redefinir a senha.")
    } finally {
      setResetLoading(false)
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

    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPhone.trim() || !newUserPassword) {
      setUsersError("Nome do responsavel, e-mail, telefone e senha sao obrigatorios.")
      return
    }

    if (newUserPassword.length < 6) {
      setUsersError("A senha deve ter pelo menos 6 caracteres.")
      return
    }

    if (newUserPassword !== newUserPasswordConfirmation) {
      setUsersError("A confirmacao da senha nao confere.")
      return
    }

    setUserSaving(true)
    setUsersError("")
    setUsersMessage("")

    try {
      await createAccessUser(consultor, {
        nomeResponsavel: newUserName.trim(),
        email: newUserEmail.trim(),
        telefone: newUserPhone.trim(),
        nivelAcesso: newUserLevel,
        password: newUserPassword,
        appOrigin: typeof window !== "undefined" ? window.location.origin : "",
      })

      setNewUserName("")
      setNewUserEmail("")
      setNewUserPhone("")
      setNewUserPassword("")
      setNewUserPasswordConfirmation("")
      setNewUserLevel("consultor")
      setUsersMessage("Usuario adicionado com sucesso com a senha definida pelo administrador.")
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
    setEditUserEmail(user.email)
    setEditUserPhone(user.telefone)
    setEditUserLevel(user.nivelAcesso)
    setEditUserStatus(user.ativo ? "ativo" : "inativo")
    setEditUserPassword(user.senha || "")
    setUsersError("")
    setUsersMessage("")
  }

  const cancelEditingUser = () => {
    setEditingUserId("")
    setEditUserName("")
    setEditUserEmail("")
    setEditUserPhone("")
    setEditUserLevel("consultor")
    setEditUserStatus("ativo")
    setEditUserPassword("")
  }

  const handleUpdateUser = async () => {
    if (!consultor || !editingUserId) return

    if (!editUserName.trim() || !editUserEmail.trim() || !editUserPhone.trim()) {
      setUsersError("Nome, e-mail, telefone, nivel e status precisam estar preenchidos.")
      return
    }

    setUserUpdating(true)
    setUsersError("")
    setUsersMessage("")

    try {
      await updateAccessUser(consultor, editingUserId, {
        nomeResponsavel: editUserName.trim(),
        email: editUserEmail.trim(),
        telefone: editUserPhone.trim(),
        nivelAcesso: editUserLevel,
        ativo: editUserStatus === "ativo",
        password: editUserPassword || undefined,
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

  const persistCreate = async (values: FichaFormValues, resolution?: DuplicateResolution) => {
    if (!consultor) return
    setCreateLoading(true)
    setCreateMessage("")
    setDuplicateMatches([])

    try {
      const response = await saveFichaWithPdfAndWebhook(values, consultor, resolution)
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

  const handleCreate = async () => {
    if (!consultor) return

    if (!createValues.nomeCliente.trim() || !createValues.cpfCnpj.trim()) {
      setCreateMessage("Nome Completo e CPF/CNPJ sao obrigatorios.")
      return
    }

    const paymentError = validatePaymentEntries(createValues.valorTotal, parsePaymentEntries(createValues.pagamentos, createValues))
    if (paymentError) {
      setCreateMessage(paymentError)
      return
    }

    const values = {
      ...createValues,
      nomeConsultor: createValues.nomeConsultor || getDefaultConsultorOption(consultor.nome),
    }

    setCreateLoading(true)
    setCreateMessage("")
    try {
      const { matches } = await checkFichaDuplicates(values)
      if (matches.length > 0) {
        setDuplicateMatches(matches)
        return
      }
    } catch (error) {
      setCreateMessage(error instanceof Error ? error.message : "Erro ao verificar cadastros semelhantes.")
      return
    } finally {
      setCreateLoading(false)
    }

    await persistCreate(values)
  }

  const handleDuplicateResolution = async (resolution: DuplicateResolution) => {
    if (!consultor || duplicateActionId) return
    const values = {
      ...createValues,
      nomeConsultor: createValues.nomeConsultor || getDefaultConsultorOption(consultor.nome),
    }
    setDuplicateActionId(resolution.matchedFichaId || resolution.action)
    try {
      await persistCreate(values, resolution)
    } finally {
      setDuplicateActionId("")
    }
  }

  const handleDeleteDuplicate = async (match: FichaDuplicateMatch) => {
    if (!consultor || duplicateActionId) return
    if (!window.confirm(`Excluir definitivamente a ficha de ${getClienteBaseName(match.nomeCliente)}? Esta ação não pode ser desfeita.`)) return

    setDuplicateActionId(match.id)
    try {
      await deleteFicha(match.id, consultor)
      const values = {
        ...createValues,
        nomeConsultor: createValues.nomeConsultor || getDefaultConsultorOption(consultor.nome),
      }
      const { matches } = await checkFichaDuplicates(values)
      if (matches.length > 0) {
        setDuplicateMatches(matches)
        setCreateMessage("Ficha duplicada excluída. Ainda existem outras correspondências para revisar.")
      } else {
        await persistCreate(values)
      }
    } catch (error) {
      setCreateMessage(error instanceof Error ? error.message : "Erro ao excluir a ficha duplicada.")
    } finally {
      setDuplicateActionId("")
    }
  }

  const handleConsultarFichas = async () => {
    setConsultaLoading(true)
    setConsultaError("")
    setEditMessage("")
    setViewMode("list")
    setSelectedFicha(null)

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
    setSelectedContratos([])
    setSelectedFicha(null)
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

  const openFicha = async (id: string, mode: ViewMode, contratos: FichaListItem[] = [], scrollToTop = true) => {
    setConsultaLoading(true)
    setConsultaError("")
    setEditMessage("")

    try {
      const response = await getFichaById(id)
      setSelectedFicha(response.ficha)
      setSelectedContratos(contratos)
      setEditValues(toRecordValues(response.ficha))
      setViewMode(mode)
      if (scrollToTop) {
        window.setTimeout(() => {
          consultaTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 0)
      }
    } catch (error) {
      setConsultaError(error instanceof Error ? error.message : "Erro ao abrir ficha.")
    } finally {
      setConsultaLoading(false)
    }
  }

  const handleContratoSelectionChange = async (id: string) => {
    if (!id) return

    if (viewMode !== "view" || selectedFicha?.id !== id) {
      await openFicha(id, "view", selectedContratos, false)
    }
  }

  const handleOpenFichaPicker = async (contratos: FichaListItem[]) => {
    setConsultaError("")
    setEditMessage("")
    setSelectedContratos(contratos)

    const fichaBaseId = contratos[0]?.id

    if (!fichaBaseId) {
      setSelectedFicha(null)
      setEditValues(emptyFichaValues)
      setViewMode("picker")
      return
    }

    setConsultaLoading(true)

    try {
      const response = await getFichaById(fichaBaseId)
      setSelectedFicha(response.ficha)
      setClientBaseFicha(response.ficha)
      setEditValues(toRecordValues(response.ficha))
      setViewMode("picker")
      window.setTimeout(() => {
        consultaTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 0)
    } catch (error) {
      setSelectedFicha(null)
      setEditValues(emptyFichaValues)
      setConsultaError(error instanceof Error ? error.message : "Erro ao abrir ficha.")
    } finally {
      setConsultaLoading(false)
    }
  }

  const handleAddNovoContrato = () => {
    setCreateMessage("")
    setCreateReturnToConsulta(true)
    setActiveTab("cadastrar")
    window.setTimeout(() => {
      cadastroTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 0)

    const fichaBase = clientBaseFicha || selectedFicha

    if (!fichaBase) {
      setCreateValues((current) => ({
        ...emptyFichaValues,
        nomeConsultor: current.nomeConsultor || (consultor ? getDefaultConsultorOption(consultor.nome) : ""),
      }))
      return
    }

    setCreateValues({
      ...emptyFichaValues,
      nomeCliente: getClienteBaseName(fichaBase.nomeCliente) || fichaBase.nomeCliente,
      terceiros: fichaBase.terceiros,
      telefones: fichaBase.telefones,
      endereco: fichaBase.endereco,
      numeroEndereco: fichaBase.numeroEndereco,
      complementoEndereco: fichaBase.complementoEndereco,
      cep: fichaBase.cep,
      municipio: fichaBase.municipio,
      uf: fichaBase.uf,
      cpfCnpj: fichaBase.cpfCnpj,
      cnh: fichaBase.cnh,
      dataNascimento: fichaBase.dataNascimento,
      dataPrimeiraCnh: fichaBase.dataPrimeiraCnh,
      nacionalidade: fichaBase.nacionalidade,
      estadoCivil: fichaBase.estadoCivil,
      profissao: fichaBase.profissao,
      email: fichaBase.email,
      nomeConsultor: fichaBase.nomeConsultor || (consultor ? getDefaultConsultorOption(consultor.nome) : ""),
      origem: fichaBase.origem,
      sne: fichaBase.sne,
    })
  }

  const handleEditClient = () => {
    const fichaBase = clientBaseFicha || selectedFicha
    if (!fichaBase) return

    setEditValues(toRecordValues(fichaBase))
    setViewMode("editClient")
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

    const paymentError = shouldValidatePayments(viewMode) ? validatePaymentEntries(editValues.valorTotal, parsePaymentEntries(editValues.pagamentos, editValues)) : ""
    if (paymentError) {
      setEditMessage(paymentError)
      return
    }

    setEditLoading(true)
    setEditMessage("")

    try {
      const isEditingClientBase = viewMode === "editClient" && Boolean(clientBaseFicha?.id)
      const targetFichaId = isEditingClientBase ? clientBaseFicha!.id : selectedFicha.id
      const response = await updateFicha(targetFichaId, editValues, consultor)

      if (isEditingClientBase) {
        setClientBaseFicha(response.ficha)
        if (selectedFicha.id === response.ficha.id) {
          setSelectedFicha(response.ficha)
        }
      } else {
        setSelectedFicha(response.ficha)
      }

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
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!resetToken && !forgotPasswordOpen && !authLoading) void handleLogin()
            }}
          >
          <CardContent className="space-y-4">
            {resetToken ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="novaSenha">Nova senha</Label>
                  <Input
                    id="novaSenha"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Digite a nova senha"
                    disabled={resetLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmarSenha">Confirmar senha</Label>
                  <Input
                    id="confirmarSenha"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirme a nova senha"
                    disabled={resetLoading}
                  />
                </div>
              </>
            ) : (
              <>
                {!forgotPasswordOpen ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="emailAcesso">E-mail</Label>
                      <Input
                        id="emailAcesso"
                        type="email"
                        value={emailAcesso}
                        onChange={(event) => setEmailAcesso(event.target.value)}
                        placeholder="Digite seu e-mail"
                        disabled={authLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="senhaAcesso">Senha</Label>
                      <Input
                        id="senhaAcesso"
                        type="password"
                        value={senhaAcesso}
                        onChange={(event) => setSenhaAcesso(event.target.value)}
                        placeholder="Digite sua senha"
                        disabled={authLoading}
                      />
                    </div>
                  </>
                ) : null}
                {forgotPasswordOpen ? (
                  <div className="rounded-md border border-border bg-muted/20 p-3 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="forgotEmail">Esqueceu senha</Label>
                      <Input
                        id="forgotEmail"
                        type="email"
                        value={forgotEmail}
                        onChange={(event) => setForgotEmail(event.target.value)}
                        placeholder="Digite seu e-mail"
                        disabled={forgotLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="forgotPhone">Telefone</Label>
                      <Input
                        id="forgotPhone"
                        type="tel"
                        value={forgotPhone}
                        onChange={(event) => setForgotPhone(event.target.value)}
                        placeholder="Digite seu telefone"
                        disabled={forgotLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="forgotNewPassword">Nova senha</Label>
                      <Input
                        id="forgotNewPassword"
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="Digite a nova senha"
                        disabled={forgotLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="forgotConfirmPassword">Confirmar senha</Label>
                      <Input
                        id="forgotConfirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Confirme a nova senha"
                        disabled={forgotLoading}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setForgotPasswordOpen(false)
                          setForgotEmail("")
                          setForgotPhone("")
                          setNewPassword("")
                          setConfirmPassword("")
                          setAuthError("")
                        }}
                        disabled={forgotLoading}
                      >
                        Fechar
                      </Button>
                      <Button type="button" onClick={() => void handleForgotPassword()} disabled={forgotLoading}>
                        {forgotLoading ? "Salvando..." : "Salvar nova senha"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
            {authError && <p className="text-sm text-red-600">{authError}</p>}
            {resetMessage ? <p className="text-sm text-primary">{resetMessage}</p> : null}
            {resetToken ? (
              <Button type="button" className="w-full" onClick={() => void handleResetPassword()} disabled={resetLoading}>
                {resetLoading ? "Atualizando..." : "Salvar nova senha"}
              </Button>
            ) : !forgotPasswordOpen ? (
              <>
                <Button type="submit" className="w-full" disabled={authLoading}>
                  {authLoading ? "Validando..." : "Entrar"}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-full"
                  onClick={() => {
                    setForgotPasswordOpen(true)
                    setAuthError("")
                    setResetMessage("")
                    setForgotEmail("")
                    setForgotPhone("")
                    setNewPassword("")
                    setConfirmPassword("")
                  }}
                >
                  Esqueceu senha
                </Button>
              </>
            ) : null}
          </CardContent>
          </form>
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
                            <Button
                              type="button"
                              variant="outline"
                              className="h-auto justify-start gap-3 p-5 text-left"
                              onClick={() => void handleOpenTemplateEditor("other-services-contract")}
                            >
                              <FileText className="h-5 w-5 text-primary" />
                              <span>
                                <span className="block font-semibold">Modelo de Contrato - Outros Serviços</span>
                                <span className="block text-sm font-normal text-muted-foreground">
                                  Editar contrato específico de outros serviços
                                </span>
                              </span>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-auto justify-start gap-3 p-5 text-left"
                              onClick={() => void handleOpenTemplateEditor("other-services-procuration")}
                            >
                              <FileText className="h-5 w-5 text-primary" />
                              <span>
                                <span className="block font-semibold">Modelo de Procuração - Outros Serviços</span>
                                <span className="block text-sm font-normal text-muted-foreground">
                                  Editar procuração específica de outros serviços
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
                            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 xl:items-end">
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
                                <Label htmlFor="novoUsuarioEmail">E-mail</Label>
                                <Input
                                  id="novoUsuarioEmail"
                                  type="email"
                                  value={newUserEmail}
                                  onChange={(event) => setNewUserEmail(event.target.value)}
                                  placeholder="Digite o e-mail"
                                  disabled={userSaving}
                                />
                              </div>
                              <div className="space-y-2 min-w-0">
                                <Label htmlFor="novoUsuarioTelefone">Telefone</Label>
                                <Input
                                  id="novoUsuarioTelefone"
                                  value={newUserPhone}
                                  onChange={(event) => setNewUserPhone(event.target.value)}
                                  placeholder="Digite o telefone"
                                  disabled={userSaving}
                                />
                              </div>
                              <div className="space-y-2 min-w-0">
                                <Label htmlFor="novoUsuarioSenha">Senha</Label>
                                <Input
                                  id="novoUsuarioSenha"
                                  type="text"
                                  value={newUserPassword}
                                  onChange={(event) => setNewUserPassword(event.target.value)}
                                  placeholder="Minimo de 6 caracteres"
                                  autoComplete="new-password"
                                  disabled={userSaving}
                                />
                              </div>
                              <div className="space-y-2 min-w-0">
                                <Label htmlFor="novoUsuarioConfirmarSenha">Confirmar senha</Label>
                                <Input
                                  id="novoUsuarioConfirmarSenha"
                                  type="text"
                                  value={newUserPasswordConfirmation}
                                  onChange={(event) => setNewUserPasswordConfirmation(event.target.value)}
                                  placeholder="Repita a senha"
                                  autoComplete="new-password"
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
                                        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_minmax(0,1fr)_180px_180px]">
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
                                            <Label htmlFor={`edit-email-${user.id}`}>E-mail</Label>
                                            <Input
                                              id={`edit-email-${user.id}`}
                                              type="email"
                                              value={editUserEmail}
                                              onChange={(event) => setEditUserEmail(event.target.value)}
                                              disabled={userUpdating}
                                            />
                                          </div>

                                          <div className="space-y-2 min-w-0">
                                            <Label htmlFor={`edit-telefone-${user.id}`}>Telefone</Label>
                                            <Input
                                              id={`edit-telefone-${user.id}`}
                                              value={editUserPhone}
                                              onChange={(event) => setEditUserPhone(event.target.value)}
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

                                          <div className="space-y-2 min-w-0 xl:col-start-4">
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

                                          <div className="space-y-2 min-w-0 lg:col-span-2">
                                            <Label htmlFor={`edit-senha-${user.id}`}>Senha</Label>
                                            <Input
                                              id={`edit-senha-${user.id}`}
                                              type="text"
                                              value={editUserPassword}
                                              onChange={(event) => setEditUserPassword(event.target.value)}
                                              placeholder="Deixe em branco para manter a senha atual"
                                              autoComplete="new-password"
                                              disabled={userUpdating}
                                            />
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
                                          <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(260px,1.45fr)_minmax(0,0.95fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] xl:gap-4 min-w-0">
                                            <div className="min-w-0">
                                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nome</p>
                                              <p className="mt-1 font-medium break-words">{user.nomeResponsavel}</p>
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">E-mail</p>
                                              <p className="mt-1 text-sm break-words">{user.email}</p>
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Telefone</p>
                                              <p className="mt-1 text-sm break-all">{user.telefone}</p>
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Senha</p>
                                              <div className="mt-1 flex items-center gap-1.5">
                                                <p className="text-sm break-all">
                                                  {user.senha
                                                    ? visibleUserPasswords[user.id]
                                                      ? user.senha
                                                      : "•".repeat(Math.min(user.senha.length, 10))
                                                    : "—"}
                                                </p>
                                                {user.senha ? (
                                                  <button
                                                    type="button"
                                                    className="text-muted-foreground hover:text-foreground"
                                                    onClick={() =>
                                                      setVisibleUserPasswords((prev) => ({
                                                        ...prev,
                                                        [user.id]: !prev[user.id],
                                                      }))
                                                    }
                                                    aria-label={visibleUserPasswords[user.id] ? "Ocultar senha" : "Mostrar senha"}
                                                  >
                                                    {visibleUserPasswords[user.id] ? (
                                                      <EyeOff className="h-3.5 w-3.5" />
                                                    ) : (
                                                      <Eye className="h-3.5 w-3.5" />
                                                    )}
                                                  </button>
                                                ) : null}
                                              </div>
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
                <form
                  data-ficha-search="true"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (!consultaLoading) void handleConsultarFichas()
                  }}
                  className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr_auto]"
                >
                  <div className="space-y-2">
                    <Label htmlFor="tipoBusca">Tipo de Consulta</Label>
                    <Select value={tipoBusca} onValueChange={(value) => setTipoBusca(value as TipoBusca)}>
                      <SelectTrigger id="tipoBusca">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpf">CPF</SelectItem>
                        <SelectItem value="cnpj">CNPJ</SelectItem>
                        <SelectItem value="nome">NOME</SelectItem>
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
                    <Button type="submit" disabled={consultaLoading}>
                      {consultaLoading ? "Consultando..." : "Consultar"}
                    </Button>
                  </div>
                </form>
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
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,2.4fr)_minmax(180px,0.95fr)_minmax(180px,0.95fr)_minmax(180px,1fr)_auto] xl:items-start">
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cliente</p>
                            <p className="mt-1 font-semibold break-words">{cliente.nomeCliente}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">CPF/CNPJ</p>
                            <p className="mt-1 text-sm break-words">{cliente.cpfCnpj || "-"}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Telefone</p>
                            <p className="mt-1 text-sm break-words">{cliente.telefones || "-"}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Consultor</p>
                            <p className="mt-1 text-sm break-words">{cliente.nomeConsultor || "-"}</p>
                          </div>
                          <div className="flex items-start xl:justify-end">
                            {fichaPrincipal ? (
                              <Button variant="outline" onClick={() => handleOpenFichaPicker(cliente.contratos)}>
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

            {(viewMode === "picker" || (selectedFicha && viewMode === "view")) && (
              <Card className="shadow-md">
                <CardContent className="space-y-5 p-4 md:p-6">
                  {selectedFicha ? (
                    <ClienteReadCard values={clientReadValues} onEdit={handleEditClient} canEdit={canEditSelectedFicha} />
                  ) : null}

                  {selectedFicha ? (
                    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
                      <div className="flex items-center gap-2 bg-[#214674] px-4 py-2 text-white">
                        <Calendar className="size-4" />
                        <h3 className="text-sm font-bold uppercase tracking-wide">Data do Contrato</h3>
                      </div>
                      <div className="px-4 py-3 text-base font-semibold text-slate-900">
                        {formatDisplayDate(selectedFicha.dataContrato)}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="listaFichas" className="leading-none">
                        {selectedContratos.length} {selectedContratos.length === 1 ? "Ficha Encontrada" : "Fichas Encontradas"}
                      </Label>
                      <Select value={viewMode === "view" ? selectedFicha?.id ?? "" : ""} onValueChange={(value) => void handleContratoSelectionChange(value)}>
                        <SelectTrigger id="listaFichas" className="min-w-[240px]">
                          <SelectValue placeholder="Selecionar ficha" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedContratos.map((contrato) => (
                            <SelectItem key={contrato.id} value={contrato.id}>
                              {getFichaLabel(contrato.numeroFicha, contrato.nomeCliente)} · {formatDisplayDate(contrato.dataContrato)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {viewMode === "view" && selectedFicha ? (
                      <div className="text-sm font-medium text-muted-foreground lg:text-right">
                        Data da ficha: <span className="font-semibold text-foreground">{formatDisplayDate(selectedFicha.dataContrato)}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    {editMessage && viewMode === "view" ? (
                      <p role="alert" className="text-sm font-medium text-red-600">{editMessage}</p>
                    ) : null}
                    {viewMode === "view" && selectedFicha ? (
                      <FichaReadView
                        values={editValues}
                        actions={
                          <>
                            {canEditSelectedFicha ? <Button onClick={() => setViewMode("edit")}>✏️</Button> : null}
                            {canEditSelectedFicha ? (
                              <Button type="button" size="icon" onClick={handleAddNovoContrato} aria-label="Adicionar ficha" title="Adicionar ficha">
                                <Plus className="size-4" />
                              </Button>
                            ) : null}
                            <Button variant="outline" onClick={() => void downloadFichaPdf(editValues)}>
                              🖨️ FICHA
                            </Button>
                            <Button type="button" variant="outline" disabled={documentLoading !== null} onClick={() => void handleDownloadDocument("contract")}>
                              {documentLoading === "contract" ? "Gerando contrato..." : "🖨️ CONTRATO"}
                            </Button>
                            <Button type="button" variant="outline" disabled={documentLoading !== null} onClick={() => void handleDownloadDocument("procuration")}>
                              {documentLoading === "procuration" ? "Gerando procuração..." : "🖨️ PROCURAÇÃO"}
                            </Button>
                            <Button type="button" variant="outline" disabled={documentLoading !== null} onClick={() => void handleDownloadDocument("other-services-contract")}>
                              {documentLoading === "other-services-contract" ? "Gerando contrato..." : "🖨️ CONTRATO OUTROS SERVIÇOS"}
                            </Button>
                            <Button type="button" variant="outline" disabled={documentLoading !== null} onClick={() => void handleDownloadDocument("other-services-procuration")}>
                              {documentLoading === "other-services-procuration" ? "Gerando procuração..." : "🖨️ PROCURAÇÃO OUTROS SERVIÇOS"}
                            </Button>
                          </>
                        }
                        details={<LogSummary log={latestFichaLog} showEntityLabel={false} />}
                      />
                    ) : (
                      <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                        Selecionar ficha
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedFicha && (viewMode === "edit" || viewMode === "editClient") && (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>
                    {viewMode === "editClient"
                      ? "Edicao dos Dados do Cliente"
                      : "Edicao da Ficha"}
                  </CardTitle>
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
        <Dialog open={duplicateMatches.length > 0} onOpenChange={(open) => !open && !duplicateActionId && setDuplicateMatches([])}>
          <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Possível cliente já cadastrado</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Revise as correspondências antes de criar a ficha. Unificar mantém o novo contrato e reutiliza os dados cadastrais do cliente escolhido.
            </p>
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {duplicateMatches.map((match) => (
                <div key={match.id} className="space-y-3 rounded-lg border border-border p-4">
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <p><span className="font-semibold">Cliente:</span> {getClienteBaseName(match.nomeCliente)}</p>
                    <p><span className="font-semibold">CPF/CNPJ:</span> {match.cpfCnpj || "-"}</p>
                    <p><span className="font-semibold">Telefone:</span> {match.telefones || "-"}</p>
                    <p><span className="font-semibold">E-mail:</span> {match.email || "-"}</p>
                    <p><span className="font-semibold">Número:</span> {match.numeroEndereco || "-"}</p>
                    <p><span className="font-semibold">Correspondências:</span> {match.reasons.join(", ")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => void handleDuplicateResolution({ action: "merge", matchedFichaId: match.id })}
                      disabled={Boolean(duplicateActionId)}
                    >
                      Unificar com este cadastro
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => void handleDeleteDuplicate(match)}
                      disabled={Boolean(duplicateActionId)}
                    >
                      <Trash2 className="size-4" />
                      Excluir duplicado
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDuplicateMatches([])} disabled={Boolean(duplicateActionId)}>
                Voltar e revisar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleDuplicateResolution({ action: "create_new" })}
                disabled={Boolean(duplicateActionId)}
              >
                Cadastrar como novo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={Boolean(templateEditorKind)}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseTemplateEditor()
            }
          }}
        >
          <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-h-none max-w-none flex-col overflow-hidden p-4 sm:max-w-none">
            <DialogHeader>
              <DialogTitle>
                Editar modelo: {templateEditorKind ? DOCUMENT_TEMPLATE_LABELS[templateEditorKind] : ""}
              </DialogTitle>
            </DialogHeader>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Visualizar log do modelo"
                  title="Visualizar log do modelo"
                  className="absolute right-12 top-2.5 z-10 h-8 gap-1.5 px-2.5"
                >
                  <Clock3 className="size-4" />
                  <span className="hidden sm:inline">Log</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={8} className="w-[min(360px,calc(100vw-2rem))] p-2">
                <LogSummary log={latestTemplateLog} />
              </PopoverContent>
            </Popover>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 xl:overflow-hidden">
              <p className="text-sm text-muted-foreground">
                Use placeholders como {"{{nomeCliente}}"}, {"{{cpfCnpj}}"}, {"{{processosResumo}}"} e {"{{multasResumo}}"}.
              </p>
              <div
                className="flex flex-wrap gap-2 rounded-md border border-border bg-muted/30 p-2"
                onPointerDown={captureTemplateSelection}
              >
                <div className="flex min-w-[220px] rounded-md border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                  <Input
                    aria-label="Fonte atual"
                    title="Fonte atual"
                    value={templateFontFamily}
                    onChange={(event) => setTemplateFontFamily(event.target.value)}
                    onBlur={(event) => handleTemplateFontChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        event.currentTarget.blur()
                      }
                    }}
                    disabled={templateLoading}
                    className="min-w-0 flex-1 border-0 shadow-none focus-visible:ring-0"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Abrir lista de fontes"
                        title="Abrir lista de fontes"
                        disabled={templateLoading}
                        className="shrink-0 rounded-l-none border-l border-input"
                      >
                        <ChevronDown className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[220px]">
                      <DropdownMenuRadioGroup value={templateFontFamily} onValueChange={handleTemplateFontChange}>
                        {DOCUMENT_TEMPLATE_FONT_OPTIONS.map((option) => (
                          <DropdownMenuRadioItem key={option.value} value={option.value} style={{ fontFamily: option.value }}>
                            {option.label}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex min-w-[118px] rounded-md border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                  <Input
                    type="number"
                    aria-label="Tamanho atual da fonte"
                    title="Tamanho atual da fonte em pixels"
                    min="6"
                    max="48"
                    step="1"
                    value={templateFontSize}
                    onChange={(event) => setTemplateFontSize(event.target.value)}
                    onBlur={(event) => handleTemplateFontSizeChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        event.currentTarget.blur()
                      }
                    }}
                    disabled={templateLoading}
                    className="min-w-0 flex-1 border-0 shadow-none focus-visible:ring-0"
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Abrir lista de tamanhos"
                        title="Abrir lista de tamanhos"
                        disabled={templateLoading}
                        className="shrink-0 rounded-l-none border-l border-input"
                      >
                        <ChevronDown className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[118px]">
                      <DropdownMenuRadioGroup value={templateFontSize} onValueChange={handleTemplateFontSizeChange}>
                        {DOCUMENT_TEMPLATE_FONT_SIZE_OPTIONS.map((option) => (
                          <DropdownMenuRadioItem key={option} value={option}>
                            {option}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
                <Button type="button" variant="outline" size="icon-sm" onClick={() => handleTemplateCommand("justifyRight")} disabled={templateLoading} aria-label="Alinhar à direita" title="Alinhar à direita">
                  <AlignRight className="size-4" />
                </Button>
                <Button type="button" variant="outline" size="icon-sm" onClick={() => handleTemplateCommand("justifyFull")} disabled={templateLoading} aria-label="Justificar" title="Justificar">
                  <AlignJustify className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => handleTemplateCommand("insertUnorderedList")}
                  disabled={templateLoading}
                  aria-label="Lista com marcadores"
                  title="Lista com marcadores"
                >
                  <List className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => handleTemplateCommand("insertOrderedList")}
                  disabled={templateLoading}
                  aria-label="Lista numerada"
                  title="Lista numerada"
                >
                  <ListOrdered className="size-4" />
                </Button>
                <Button type="button" variant="outline" size="icon-sm" onClick={() => handleTemplateCommand("outdent")} disabled={templateLoading} aria-label="Diminuir recuo" title="Diminuir recuo">
                  <IndentDecrease className="size-4" />
                </Button>
                <Button type="button" variant="outline" size="icon-sm" onClick={() => handleTemplateCommand("indent")} disabled={templateLoading} aria-label="Aumentar recuo" title="Aumentar recuo">
                  <IndentIncrease className="size-4" />
                </Button>
                <Button type="button" variant="outline" size="icon-sm" onClick={() => handleTemplateCommand("undo")} disabled={templateLoading} aria-label="Desfazer última alteração" title="Desfazer">
                  <Undo2 className="size-4" />
                </Button>
                <Button type="button" variant="outline" size="icon-sm" onClick={() => handleTemplateCommand("redo")} disabled={templateLoading} aria-label="Refazer última alteração" title="Refazer">
                  <Redo2 className="size-4" />
                </Button>
                <Button type="button" variant="outline" size="icon-sm" onClick={() => handleTemplateCommand("removeFormat")} disabled={templateLoading} aria-label="Limpar formatação" title="Limpar formatação">
                  <RemoveFormatting className="size-4" />
                </Button>
                <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground">
                  <Palette className="size-4" />
                  <span>Fonte</span>
                  <Input
                    type="color"
                    value={templateTextColor}
                    onChange={(event) => handleTemplateTextColorChange(event.target.value)}
                    disabled={templateLoading}
                    className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
                  />
                </label>
                <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground">
                  <span className="inline-flex size-4 items-center justify-center rounded-sm border border-border bg-yellow-200 text-[10px] font-bold text-foreground">
                    A
                  </span>
                  <span>Realce</span>
                  <Input
                    type="color"
                    value={templateHighlightColor}
                    onChange={(event) => handleTemplateHighlightColorChange(event.target.value)}
                    disabled={templateLoading}
                    className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
                  />
                </label>
                <Button
                  type="button"
                  variant={templateVariablesOpen ? "secondary" : "outline"}
                  size="icon-sm"
                  onClick={() => setTemplateVariablesOpen((current) => !current)}
                  disabled={templateLoading}
                >
                  <Tag className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => templateImageInputRef.current?.click()}
                  disabled={templateLoading}
                >
                  <FileImage className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => handleTemplateImageResize("decrease")}
                  disabled={templateLoading || !selectedTemplateImage}
                >
                  <Minus className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => handleTemplateImageResize("increase")}
                  disabled={templateLoading || !selectedTemplateImage}
                >
                  <Plus className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => handleTemplateImageAlign("left")}
                  disabled={templateLoading || !selectedTemplateImage}
                >
                  <AlignLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => handleTemplateImageAlign("center")}
                  disabled={templateLoading || !selectedTemplateImage}
                >
                  <AlignCenter className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => handleTemplateImageAlign("right")}
                  disabled={templateLoading || !selectedTemplateImage}
                >
                  <AlignRight className="size-4" />
                </Button>
                <input
                  ref={templateImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void handleTemplateImageSelect(event)}
                />
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
              <div className="grid grid-cols-1 gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-2">
                <div className="min-w-0 space-y-2 xl:flex xl:min-h-0 xl:flex-col">
                  <p className="text-sm font-medium text-foreground">Conteúdo do modelo</p>
                  <div
                    key={templateEditorKind ?? "template-editor"}
                    ref={handleTemplateEditorRef}
                    contentEditable={!templateLoading}
                    suppressContentEditableWarning
                    onInput={(event) => {
                      templateRedoHistoryRef.current = []
                      setTemplateContent(event.currentTarget.innerHTML)
                      captureTemplateSelection()
                    }}
                    onFocus={captureTemplateSelection}
                    onKeyUp={captureTemplateSelection}
                    onKeyDown={(event) => {
                      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
                        event.preventDefault()
                        handleTemplateCommand(event.shiftKey ? "redo" : "undo")
                        return
                      }
                      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
                        event.preventDefault()
                        handleTemplateCommand("redo")
                        return
                      }
                      if (event.key !== " ") return
                      if (!convertEmptyListItemToSpacer(event.currentTarget)) return

                      event.preventDefault()
                      setTemplateContent(event.currentTarget.innerHTML)
                      captureTemplateSelection()
                    }}
                    onMouseUp={captureTemplateSelection}
                    onClick={(event) => {
                      const target = event.target
                      if (target instanceof HTMLImageElement) {
                        handleSelectTemplateImage(target)
                      } else {
                        handleSelectTemplateImage(null)
                      }
                    }}
                    aria-label="Conteudo do modelo de documento"
                    style={{ fontFamily: "Arial, sans-serif" }}
                    className="document-template-editor document-rich-text h-[60vh] min-h-[420px] overflow-y-auto rounded-md border border-input bg-background px-3 pb-2 text-sm leading-6 outline-none xl:h-auto xl:min-h-0 xl:flex-1"
                  />
                </div>
                {templateEditorKind && templatePreviewContent ? (
                  <div className="min-w-0 space-y-2 xl:flex xl:min-h-0 xl:flex-col">
                    <p className="text-sm font-medium text-foreground">Preview do documento</p>
                    <div className="h-[60vh] min-h-[420px] overflow-auto rounded-md border border-border bg-muted/20 p-3 xl:h-auto xl:min-h-0 xl:flex-1">
                      <div style={{ minWidth: "620px" }}>
                        <div
                          style={{
                            width: "980px",
                            height: "860px",
                            transform: "scale(0.62)",
                            transformOrigin: "top left",
                          }}
                        >
                          <DocumentTemplatePdf
                            title={DOCUMENT_TEMPLATE_LABELS[templateEditorKind]}
                            content={templatePreviewContent}
                            renderTitle={false}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
              {templateLoading && !templateSaving ? <p className="text-sm text-muted-foreground">Carregando modelo...</p> : null}
              {templateMessage ? <p className="text-sm text-primary">{templateMessage}</p> : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseTemplateEditor} disabled={templateLoading}>
                Fechar
              </Button>
              <Button type="button" onClick={() => void handleSaveTemplate()} disabled={templateLoading}>
                {templateSaving ? "Salvando..." : "Salvar modelo"}
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
                )
              })}
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

