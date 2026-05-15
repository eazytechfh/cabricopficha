"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Plus, Settings, Trash2, UserPlus } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FichaForm } from "@/components/ficha-form"
import { FichaReadView } from "@/components/ficha-read-view"
import { createAccessUser, deleteAccessUser, getAccessUsers, updateAccessUser } from "@/lib/accessAdminService"
import { getCurrentAccess, hasAdminAccess, loginWithAccessCode, logout } from "@/lib/accessService"
import { getDefaultConsultorOption } from "@/lib/ficha-options"
import { downloadFichaPdf } from "@/lib/ficha-pdf-client"
import { updateFicha } from "@/lib/fichaService"
import { saveFichaWithPdfAndWebhook } from "@/lib/fichaCreateService"
import { getFichaById, getFichas } from "@/lib/fichas-api"
import { canEditFicha, normalizeCpfCnpj, toRecordValues } from "@/lib/ficha-utils"
import {
  emptyFichaValues,
  type AccessCodeRecord,
  type ConsultorSession,
  type FichaFormValues,
  type FichaListItem,
  type FichaRecord,
} from "@/lib/ficha-types"

type ViewMode = "list" | "view" | "edit"
type WorkspaceTab = "cadastrar" | "consultar"

function getFichaLabel(nomeCliente: string) {
  const match = (nomeCliente || "").trim().match(/(\d{1,2})$/)
  if (match) {
    return `Contrato ${match[1]}`
  }

  return "Contrato"
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

function ClienteReadCard({ values, onEdit }: { values: FichaFormValues; onEdit: () => void }) {
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

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <ClienteValue label="Nome do Consultor" value={values.nomeConsultor} />
        <ClienteValue label="Origem" value={values.origem} />
        <ClienteValue label="SNE" value={values.sne} />
      </div>

      <Button type="button" variant="outline" size="sm" onClick={onEdit} className="absolute bottom-4 right-4">
        <Plus className="size-4" />
        Editar
      </Button>
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

export default function FichasWorkspace() {
  const [consultor, setConsultor] = useState<ConsultorSession | null>(null)
  const [codigoAcesso, setCodigoAcesso] = useState("")
  const [authError, setAuthError] = useState("")
  const [authLoading, setAuthLoading] = useState(false)

  const [createValues, setCreateValues] = useState<FichaFormValues>(emptyFichaValues)
  const [createLoading, setCreateLoading] = useState(false)
  const [createMessage, setCreateMessage] = useState("")
  const [createIdentifierPreview, setCreateIdentifierPreview] = useState("")
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("cadastrar")

  const [tipoBusca, setTipoBusca] = useState<"cpf" | "nome">("cpf")
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

        const nextSequence = String(response.fichas.length + 1).padStart(2, "0")
        setCreateIdentifierPreview(`${nomeBase} ${nextSequence}`)
      } catch {
        if (!cancelled) {
          setCreateIdentifierPreview(`${nomeBase} 01`)
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
      setUsers(response.users)
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "Erro ao carregar usuarios.")
    } finally {
      setUsersLoading(false)
    }
  }

  const handleOpenSettings = async (open: boolean) => {
    setSettingsOpen(open)

    if (!open) {
      setUsersError("")
      setUsersMessage("")
      return
    }

    await loadAccessUsers()
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
      const cpfNormalizado = tipoBusca === "cpf" ? normalizeCpfCnpj(cpfBusca) : ""
      const nomeNormalizado = tipoBusca === "nome" ? nomeBusca.trim() : ""

      const response = await getFichas({ cpf: cpfNormalizado, nome: nomeNormalizado })
      setConsultaItems(response.fichas)
      setSelectedContratos([])
      if (response.fichas.length === 0) {
        setConsultaError(tipoBusca === "cpf" ? "Nenhuma ficha encontrada para este CPF." : "Nenhuma ficha encontrada para este nome.")
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
    setActiveTab("cadastrar")

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
      email: selectedFicha.email,
      nomeConsultor: selectedFicha.nomeConsultor || (consultor ? getDefaultConsultorOption(consultor.nome) : ""),
      origem: selectedFicha.origem,
      sne: selectedFicha.sne,
    })
  }

  const handleUpdate = async () => {
    if (!consultor || !selectedFicha) return

    setEditLoading(true)
    setEditMessage("")

    try {
      const response = await updateFicha(selectedFicha.id, editValues, consultor)
      setSelectedFicha(response.ficha)
      setEditValues(toRecordValues(response.ficha))
      setEditMessage(
        response.webhookSent
          ? "Ficha atualizada com sucesso."
          : "Ficha atualizada, mas houve erro ao enviar os dados para a automacao."
      )
      setViewMode("view")
      const cpfNormalizado = tipoBusca === "cpf" ? normalizeCpfCnpj(cpfBusca) : ""
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
              <p className="text-sm opacity-80">Nivel: {consultor.nivelAcesso}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Dialog open={settingsOpen} onOpenChange={(open) => void handleOpenSettings(open)}>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="icon" aria-label="Configuracoes">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-[1200px] max-h-[88vh] overflow-x-hidden overflow-y-auto p-0">
                  <DialogHeader>
                    <DialogTitle className="px-6 pt-6">Usuarios</DialogTitle>
                    <DialogDescription className="px-6 pb-4">
                      Gerencie os acessos de administradores e consultores.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-5 px-6 pb-6">
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
                              <SelectItem value="consultor">Consultor</SelectItem>
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
                                          <SelectItem value="consultor">Consultor</SelectItem>
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
                                      <p className="mt-1 capitalize">{user.nivelAcesso}</p>
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
                </DialogContent>
              </Dialog>
            )}

            <Button variant="secondary" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cadastrar">Cadastrar Ficha</TabsTrigger>
            <TabsTrigger value="consultar">Consulta de Ficha</TabsTrigger>
          </TabsList>

          <TabsContent value="cadastrar" className="space-y-4">
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
            />
          </TabsContent>

          <TabsContent value="consultar" className="space-y-6">
            <Card ref={consultaTopRef} className="border-l-4 border-l-primary shadow-md">
              <CardHeader>
                <CardTitle>Consulta de Ficha</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr_auto]">
                  <div className="space-y-2">
                    <Label htmlFor="tipoBusca">Tipo de Consulta</Label>
                    <Select value={tipoBusca} onValueChange={(value) => setTipoBusca(value as "cpf" | "nome")}>
                      <SelectTrigger id="tipoBusca">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpf">CPF</SelectItem>
                        <SelectItem value="nome">Nome</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valorBusca">{tipoBusca === "cpf" ? "CPF" : "Nome"}</Label>
                    <Input
                      id="valorBusca"
                      value={tipoBusca === "cpf" ? cpfBusca : nomeBusca}
                      onChange={(event) => {
                        if (tipoBusca === "cpf") {
                          setCpfBusca(event.target.value)
                        } else {
                          setNomeBusca(event.target.value)
                        }
                      }}
                      placeholder={tipoBusca === "cpf" ? "Digite o CPF com ou sem mascara" : "Digite o nome do cliente"}
                    />
                  </div>
                  <div className="flex flex-col items-stretch justify-end gap-2 md:items-end">
                    {viewMode !== "list" && consultaItems.length > 0 && (
                      <Button type="button" variant="outline" onClick={handleVoltarConsulta}>
                        <ArrowLeft className="size-4" />
                        Voltar
                      </Button>
                    )}
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
                  <ClienteReadCard values={editValues} onEdit={() => setViewMode("edit")} />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-semibold text-foreground">Contratos</h2>
                    <Button type="button" onClick={handleAddNovoContrato}>
                      <Plus className="size-4" />
                      Adicionar Novo Contrato
                    </Button>
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
                              Data do contrato: {formatDisplayDate(contrato.dataContrato)}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          {selectedFicha.id === contrato.id ? (
                            <div className="space-y-4">
                              <FichaReadView values={editValues} />
                              <div className="flex flex-col gap-4 sm:flex-row">
                                {canEditSelectedFicha ? (
                                  <Button onClick={() => setViewMode("edit")}>Editar Contrato</Button>
                                ) : (
                                  <p className="text-sm text-red-600">Voce nao tem permissao para editar esta ficha.</p>
                                )}
                                <Button variant="outline" onClick={() => void downloadFichaPdf(editValues)}>
                                  Gerar PDF novamente
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            )}

            {selectedFicha && viewMode === "edit" && (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Edicao da Ficha</CardTitle>
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
                        submitLabel="Atualizar Ficha"
                        loading={editLoading}
                        loadingLabel="Atualizando..."
                        onCancelEdit={() => setViewMode("view")}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
