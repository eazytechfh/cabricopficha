"use client"

import { useEffect, useMemo, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FichaForm } from "@/components/ficha-form"
import { getCurrentAccess, loginWithAccessCode, logout } from "@/lib/accessService"
import { downloadFichaPdf } from "@/lib/ficha-pdf-client"
import { createFicha, getFichaById, getFichasByCpf, updateFicha } from "@/lib/fichas-api"
import { canEditFicha, normalizeCpfCnpj, toRecordValues } from "@/lib/ficha-utils"
import { emptyFichaValues, type ConsultorSession, type FichaFormValues, type FichaListItem, type FichaRecord } from "@/lib/ficha-types"

type ViewMode = "list" | "view" | "edit"

export default function FichasWorkspace() {
  const [consultor, setConsultor] = useState<ConsultorSession | null>(null)
  const [codigoAcesso, setCodigoAcesso] = useState("")
  const [authError, setAuthError] = useState("")
  const [authLoading, setAuthLoading] = useState(false)

  const [createValues, setCreateValues] = useState<FichaFormValues>(emptyFichaValues)
  const [createLoading, setCreateLoading] = useState(false)
  const [createMessage, setCreateMessage] = useState("")

  const [cpfBusca, setCpfBusca] = useState("")
  const [consultaLoading, setConsultaLoading] = useState(false)
  const [consultaError, setConsultaError] = useState("")
  const [consultaItems, setConsultaItems] = useState<FichaListItem[]>([])
  const [selectedFicha, setSelectedFicha] = useState<FichaRecord | null>(null)
  const [editValues, setEditValues] = useState<FichaFormValues>(emptyFichaValues)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [editLoading, setEditLoading] = useState(false)
  const [editMessage, setEditMessage] = useState("")

  useEffect(() => {
    const access = getCurrentAccess()
    if (!access) return

    setConsultor(access)
    setCreateValues((current) => ({ ...current, nomeConsultor: current.nomeConsultor || access.nome }))
  }, [])

  const canEditSelectedFicha = useMemo(() => {
    if (!consultor || !selectedFicha) return false
    return canEditFicha(consultor.id, consultor.nivelAcesso, selectedFicha)
  }, [consultor, selectedFicha])

  const handleLogin = async () => {
    setAuthLoading(true)
    setAuthError("")

    try {
      const access = await loginWithAccessCode(codigoAcesso)
      setConsultor(access)
      setCreateValues((current) => ({ ...current, nomeConsultor: access.nome }))
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

  const handleCreate = async () => {
    if (!consultor) return

    setCreateLoading(true)
    setCreateMessage("")

    try {
      const values = {
        ...createValues,
        nomeConsultor: createValues.nomeConsultor || consultor.nome,
      }

      await createFicha(values, consultor)
      await downloadFichaPdf(values)
      setCreateMessage("Ficha salva com sucesso, PDF baixado e planilha atualizada.")
      setCreateValues({
        ...emptyFichaValues,
        nomeConsultor: consultor.nome,
      })
    } catch (error) {
      setCreateMessage(error instanceof Error ? error.message : "Erro ao salvar a ficha.")
    } finally {
      setCreateLoading(false)
    }
  }

  const handleConsultarCpf = async () => {
    setConsultaLoading(true)
    setConsultaError("")
    setEditMessage("")
    setViewMode("list")
    setSelectedFicha(null)

    try {
      const response = await getFichasByCpf(normalizeCpfCnpj(cpfBusca))
      setConsultaItems(response.fichas)
      if (response.fichas.length === 0) {
        setConsultaError("Nenhuma ficha encontrada para este CPF.")
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
      setEditMessage("Ficha atualizada com sucesso.")
      setViewMode("view")
      await handleConsultarCpf()
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
          <Button variant="secondary" onClick={handleLogout}>
            Sair
          </Button>
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
            />
          </TabsContent>

          <TabsContent value="consultar" className="space-y-6">
            <Card className="border-l-4 border-l-primary shadow-md">
              <CardHeader>
                <CardTitle>Consulta de Ficha</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <Label htmlFor="cpfBusca">CPF</Label>
                    <Input
                      id="cpfBusca"
                      value={cpfBusca}
                      onChange={(event) => setCpfBusca(event.target.value)}
                      placeholder="Digite o CPF com ou sem mascara"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={() => void handleConsultarCpf()} disabled={consultaLoading}>
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
