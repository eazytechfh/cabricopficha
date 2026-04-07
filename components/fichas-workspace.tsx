"use client"

import { useEffect, useMemo, useState } from "react"
import { Settings, Trash2, UserPlus } from "lucide-react"
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
import { createAccessUser, deleteAccessUser, getAccessUsers } from "@/lib/accessAdminService"
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

function formatAccessDate(value: string) {
  if (!value) return "-"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

export default function FichasWorkspace() {
  const [consultor, setConsultor] = useState<ConsultorSession | null>(null)
  const [codigoAcesso, setCodigoAcesso] = useState("")
  const [authError, setAuthError] = useState("")
  const [authLoading, setAuthLoading] = useState(false)

  const [createValues, setCreateValues] = useState<FichaFormValues>(emptyFichaValues)
  const [createLoading, setCreateLoading] = useState(false)
  const [createMessage, setCreateMessage] = useState("")

  const [tipoBusca, setTipoBusca] = useState<"cpf" | "nome">("cpf")
  const [cpfBusca, setCpfBusca] = useState("")
  const [nomeBusca, setNomeBusca] = useState("")
  const [consultaLoading, setConsultaLoading] = useState(false)
  const [consultaError, setConsultaError] = useState("")
  const [consultaItems, setConsultaItems] = useState<FichaListItem[]>([])
  const [selectedFicha, setSelectedFicha] = useState<FichaRecord | null>(null)
  const [editValues, setEditValues] = useState<FichaFormValues>(emptyFichaValues)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
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

  useEffect(() => {
    const access = getCurrentAccess()
    if (!access) return

    const defaultConsultor = getDefaultConsultorOption(access.nome)

    setConsultor(access)
    setCreateValues((current) => ({ ...current, nomeConsultor: current.nomeConsultor || defaultConsultor }))
  }, [])

  const canEditSelectedFicha = useMemo(() => {
    if (!consultor || !selectedFicha) return false
    return canEditFicha(consultor.id, consultor.nivelAcesso, selectedFicha)
  }, [consultor, selectedFicha])

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

    try {
      const cpfNormalizado = tipoBusca === "cpf" ? normalizeCpfCnpj(cpfBusca) : ""
      const nomeNormalizado = tipoBusca === "nome" ? nomeBusca.trim() : ""

      const response = await getFichas({ cpf: cpfNormalizado, nome: nomeNormalizado })
      setConsultaItems(response.fichas)
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

  const openFicha = async (id: string, mode: ViewMode) => {
    setConsultaLoading(true)
    setConsultaError("")
    setEditMessage("")

    try {
      const response = await getFichaById(id)
      setSelectedFicha(response.ficha)
      setEditValues(toRecordValues(response.ficha))
      setViewMode(mode)
    } catch (error) {
      setConsultaError(error instanceof Error ? error.message : "Erro ao abrir ficha.")
    } finally {
      setConsultaLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!consultor || !selectedFicha) return

    setEditLoading(true)
    setEditMessage("")

    try {
      const response = await updateFicha(selectedFicha.id, editValues, consultor)
      setSelectedFicha(response.ficha)
      setEditValues(toRecordValues(response.ficha))
      await downloadFichaPdf(toRecordValues(response.ficha))
      setEditMessage(
        response.webhookSent
          ? "Ficha atualizada com sucesso."
          : "Ficha atualizada, mas houve erro ao enviar os dados para a automacao."
      )
      setViewMode("view")
      await handleConsultarFichas()
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

                                  <div className="flex justify-end">
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
        <Tabs defaultValue="cadastrar" className="space-y-6">
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
            />
          </TabsContent>

          <TabsContent value="consultar" className="space-y-6">
            <Card className="border-l-4 border-l-primary shadow-md">
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
                  {consultaItems.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold">{item.nomeCliente}</p>
                        <p className="text-sm text-muted-foreground">CPF: {item.cpfCnpj}</p>
                        <p className="text-sm text-muted-foreground">Telefone: {item.telefones || "-"}</p>
                        <p className="text-sm text-muted-foreground">Endereco: {item.endereco || "-"}</p>
                        <p className="text-sm text-muted-foreground">Consultor: {item.nomeConsultor || "-"}</p>
                        <p className="text-sm text-muted-foreground">Atualizada em: {item.updatedAt || item.createdAt || "-"}</p>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => void openFicha(item.id, "view")}>
                          Visualizar
                        </Button>
                        {canEditFicha(consultor.id, consultor.nivelAcesso, item) && (
                          <Button onClick={() => void openFicha(item.id, "edit")}>Editar</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {selectedFicha && viewMode === "view" && (
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Visualizacao da Ficha</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FichaForm values={editValues} onChange={setEditValues} readOnly showActions={false} />
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {canEditSelectedFicha ? (
                      <Button onClick={() => setViewMode("edit")}>Editar Ficha</Button>
                    ) : (
                      <p className="text-sm text-red-600">Voce nao tem permissao para editar esta ficha.</p>
                    )}
                    <Button variant="outline" onClick={() => void downloadFichaPdf(editValues)}>
                      Gerar PDF novamente
                    </Button>
                  </div>
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
