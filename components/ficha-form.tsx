"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { CONSULTOR_OPTIONS, INSTANCIA_MULTA_OPTIONS, INSTANCIA_PROCESSO_OPTIONS, ORIGEM_OPTIONS, SNE_OPTIONS, TIPO_PROCESSO_OPTIONS } from "@/lib/ficha-options"
import { validarCPF } from "@/lib/cpf-utils"
import type { FichaFormValues } from "@/lib/ficha-types"
import { MULTI_ENTRY_SEPARATOR, parseCurrency, splitSerializedEntries } from "@/lib/ficha-utils"
import { Calendar, User, CreditCard, FileText, AlertCircle, X } from "lucide-react"

type MultaBlock = {
  instanciaMulta: string
  autoDetran: string
  autoRenainf: string
  tipoMulta: string
  placa: string
  renavam: string
  prazoMulta: string
}

type MultaDetailLine = {
  instanciaMulta: string
  autoDetran: string
  autoRenainf: string
  tipoMulta: string
  prazoMulta: string
}

type ProcessoLine = {
  instanciaProcesso: string
  tipoProcesso: string
  numeroProcesso: string
  prazoProcesso: string
}

function splitLineValues(value: string) {
  if (!value) return [""]
  return value.split("\n")
}

function parseTelefoneValues(value: string) {
  return (value || "")
    .split(/[\n;,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getProcessoLines(values: FichaFormValues): ProcessoLine[] {
  const instancias = splitLineValues(values.instanciaProcesso)
  const tipos = splitLineValues(values.tipoProcesso)
  const numeros = splitLineValues(values.numeroProcesso)
  const prazos = splitLineValues(values.prazoProcesso)

  const maxLength = Math.max(instancias.length, tipos.length, numeros.length, prazos.length, 1)

  return Array.from({ length: maxLength }, (_, index) => ({
    instanciaProcesso: instancias[index] || "",
    tipoProcesso: tipos[index] || "",
    numeroProcesso: numeros[index] || "",
    prazoProcesso: prazos[index] || "",
  }))
}

function parseMultaBlocks(values: FichaFormValues): MultaBlock[] {
  const instancias = splitSerializedEntries(values.instanciaMulta)
  const autosDetran = splitSerializedEntries(values.autoDetran)
  const autosRenainf = splitSerializedEntries(values.autoRenainf)
  const tipos = splitSerializedEntries(values.tipoMulta)
  const placas = splitSerializedEntries(values.placa)
  const renavams = splitSerializedEntries(values.renavam)
  const prazos = splitSerializedEntries(values.prazoMulta)

  const maxLength = Math.max(instancias.length, autosDetran.length, autosRenainf.length, tipos.length, placas.length, renavams.length, prazos.length, 1)

  return Array.from({ length: maxLength }, (_, index) => ({
    instanciaMulta: instancias[index] || "",
    autoDetran: autosDetran[index] || "",
    autoRenainf: autosRenainf[index] || "",
    tipoMulta: tipos[index] || "",
    placa: placas[index] || "",
    renavam: renavams[index] || "",
    prazoMulta: prazos[index] || "",
  }))
}

function serializeMultaBlocks(blocks: MultaBlock[]) {
  return {
    instanciaMulta: blocks.map((block) => block.instanciaMulta).join(MULTI_ENTRY_SEPARATOR),
    autoDetran: blocks.map((block) => block.autoDetran).join(MULTI_ENTRY_SEPARATOR),
    autoRenainf: blocks.map((block) => block.autoRenainf).join(MULTI_ENTRY_SEPARATOR),
    tipoMulta: blocks.map((block) => block.tipoMulta).join(MULTI_ENTRY_SEPARATOR),
    placa: blocks.map((block) => block.placa).join(MULTI_ENTRY_SEPARATOR),
    renavam: blocks.map((block) => block.renavam).join(MULTI_ENTRY_SEPARATOR),
    prazoMulta: blocks.map((block) => block.prazoMulta).join(MULTI_ENTRY_SEPARATOR),
  }
}

function getMultaDetailLines(block: MultaBlock): MultaDetailLine[] {
  const instancias = splitLineValues(block.instanciaMulta)
  const autosDetran = splitLineValues(block.autoDetran)
  const autosRenainf = splitLineValues(block.autoRenainf)
  const tipos = splitLineValues(block.tipoMulta)
  const prazos = splitLineValues(block.prazoMulta)

  const maxLength = Math.max(instancias.length, autosDetran.length, autosRenainf.length, tipos.length, prazos.length, 1)

  return Array.from({ length: maxLength }, (_, index) => ({
    instanciaMulta: instancias[index] || "",
    autoDetran: autosDetran[index] || "",
    autoRenainf: autosRenainf[index] || "",
    tipoMulta: tipos[index] || "",
    prazoMulta: prazos[index] || "",
  }))
}

type FichaFormProps = {
  values: FichaFormValues
  onChange: (values: FichaFormValues) => void
  onSubmit?: () => void | Promise<void>
  submitLabel?: string
  loading?: boolean
  loadingLabel?: string
  readOnly?: boolean
  showActions?: boolean
  onCancelEdit?: () => void
  requiredFields?: Array<keyof FichaFormValues>
  identifierPreview?: string
}

function updateValue(
  values: FichaFormValues,
  field: keyof FichaFormValues,
  value: string
): FichaFormValues {
  const normalizedValue = field === "nomeCliente" || field === "terceiros" ? value.toUpperCase() : value
  const next = {
    ...values,
    [field]: normalizedValue,
  }

  if (field === "valorTotal" || field === "valorEntrada") {
    const valorEntradaPreenchido = next.valorEntrada.trim() !== ""

    if (valorEntradaPreenchido) {
      const restante = Math.max(parseCurrency(next.valorTotal) - parseCurrency(next.valorEntrada), 0)
      next.valorRestante = restante.toFixed(2)
    } else {
      next.valorRestante = ""
    }
  }

  if (field === "banco" && value !== "outros" && values.banco !== value) {
    next.banco = value
  }

  return next
}

export function FichaForm({
  values,
  onChange,
  onSubmit,
  submitLabel = "Salvar Ficha de Venda",
  loading = false,
  loadingLabel = "Salvando...",
  readOnly = false,
  showActions = true,
  onCancelEdit,
  requiredFields = [],
  identifierPreview,
}: FichaFormProps) {
  const lastFetchedCepRef = useRef("")
  const [cepLookupMessage, setCepLookupMessage] = useState("")
  const [cepLookupLoading, setCepLookupLoading] = useState(false)
  const [enderecoRua, setEnderecoRua] = useState(values.endereco)
  const [enderecoNumero, setEnderecoNumero] = useState("")
  const [enderecoComplemento, setEnderecoComplemento] = useState("")
  const [cnhNumero, setCnhNumero] = useState("")
  const [cnhUf, setCnhUf] = useState("RJ")
  const [telefoneInput, setTelefoneInput] = useState("")

  useEffect(() => {
    const enderecoAtual = values.endereco || ""
    const numeroMatch = enderecoAtual.match(/,\s*Numero\s+([^,]+)(?=,\s*Complemento\s+|$)/i)
    const complementoMatch = enderecoAtual.match(/,\s*Complemento\s+(.+)$/i)
    const enderecoBase = enderecoAtual
      .replace(/,\s*Numero\s+([^,]+)(?=,\s*Complemento\s+|$)/i, "")
      .replace(/,\s*Complemento\s+(.+)$/i, "")
      .trim()
      .replace(/,\s*$/, "")

    setEnderecoRua(enderecoBase)
    setEnderecoNumero(numeroMatch?.[1]?.trim() || "")
    setEnderecoComplemento(complementoMatch?.[1]?.trim() || "")
  }, [values.endereco])

  useEffect(() => {
    const cnhAtual = values.cnh || ""
    const cnhMatch = cnhAtual.match(/^(.*?)(?:\s*[\/-]\s*([A-Za-z]{2}))?$/)
    const numero = cnhMatch?.[1]?.trim() || ""
    const uf = cnhMatch?.[2]?.trim().toUpperCase() || "RJ"

    setCnhNumero(numero)
    setCnhUf(uf)
  }, [values.cnh])

  useEffect(() => {
    if (readOnly) return

    const cepDigits = values.cep.replace(/\D/g, "")

    if (cepDigits.length !== 8) {
      setCepLookupLoading(false)
      setCepLookupMessage("")
      if (cepDigits.length === 0) {
        lastFetchedCepRef.current = ""
      }
      return
    }

    if (lastFetchedCepRef.current === cepDigits) {
      return
    }

    let cancelled = false

    const fetchAddress = async () => {
      setCepLookupLoading(true)
      setCepLookupMessage("")

      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`)
        const payload = (await response.json()) as {
          erro?: boolean
          logradouro?: string
          bairro?: string
          localidade?: string
          uf?: string
        }

        if (!response.ok || payload.erro) {
          throw new Error("CEP nao encontrado.")
        }

        const enderecoParts = [payload.logradouro, payload.bairro]
          .map((part) => (part || "").trim())
          .filter(Boolean)

        const endereco = enderecoParts.join(", ")

        if (cancelled) return

        lastFetchedCepRef.current = cepDigits
        setCepLookupMessage(endereco ? "Endereco preenchido automaticamente." : "CEP encontrado.")

        if (endereco && endereco !== values.endereco) {
          onChange(
            updateValue(values, "endereco", endereco)
          )
        }
      } catch {
        if (cancelled) return
        setCepLookupMessage("Nao foi possivel localizar o endereco pelo CEP.")
      } finally {
        if (!cancelled) {
          setCepLookupLoading(false)
        }
      }
    }

    void fetchAddress()

    return () => {
      cancelled = true
    }
  }, [onChange, readOnly, values])

  const setField = (field: keyof FichaFormValues, value: string) => {
    if (readOnly) return
    onChange(updateValue(values, field, value))
  }

  const setEnderecoParts = (rua: string, numero: string, complemento: string) => {
    const parts = [rua.trim()]

    if (numero.trim()) {
      parts.push(`Numero ${numero.trim()}`)
    }

    if (complemento.trim()) {
      parts.push(`Complemento ${complemento.trim()}`)
    }

    setField("endereco", parts.filter(Boolean).join(", "))
  }

  const setCnhParts = (numero: string, uf: string) => {
    const normalizedUf = (uf || "").trim().toUpperCase()
    const normalizedNumero = numero.trim()

    setField("cnh", normalizedNumero ? `${normalizedNumero}${normalizedUf ? ` / ${normalizedUf}` : ""}` : "")
  }

  const fieldDisabled = readOnly || loading
  const cpfDigits = values.cpfCnpj.replace(/\D/g, "")
  const cpfStatus =
    cpfDigits.length === 11
      ? validarCPF(values.cpfCnpj)
        ? "CPF valido"
        : "CPF invalido"
      : ""
  const telefonesLista = parseTelefoneValues(values.telefones)
  const processoLines = getProcessoLines(values)
  const multaBlocks = parseMultaBlocks(values)

  const setTelefones = (nextTelefones: string[]) => {
    setField("telefones", nextTelefones.join("\n"))
  }

  const addTelefone = (rawValue: string) => {
    const nextTelefone = rawValue.trim()
    if (!nextTelefone) return

    const currentTelefones = parseTelefoneValues(values.telefones)
    if (currentTelefones.includes(nextTelefone)) {
      setTelefoneInput("")
      return
    }

    setTelefones([...currentTelefones, nextTelefone])
    setTelefoneInput("")
  }

  const removeTelefone = (telefone: string) => {
    setTelefones(telefonesLista.filter((item) => item !== telefone))
  }

  const setMultaBlocks = (nextBlocks: MultaBlock[]) => {
    onChange({
      ...values,
      ...serializeMultaBlocks(nextBlocks),
    })
  }

  const updateMultaBlockField = (index: number, field: keyof MultaBlock, value: string) => {
    const normalizedValue = field === "placa" ? value.toUpperCase() : value
    const nextBlocks = multaBlocks.map((block, blockIndex) =>
      blockIndex === index ? { ...block, [field]: normalizedValue } : block
    )
    setMultaBlocks(nextBlocks)
  }

  const updateMultaDetailLines = (index: number, lines: MultaDetailLine[]) => {
    const nextBlocks = multaBlocks.map((block, blockIndex) =>
      blockIndex === index
        ? {
            ...block,
            instanciaMulta: lines.map((line) => line.instanciaMulta).join("\n"),
            autoDetran: lines.map((line) => line.autoDetran).join("\n"),
            autoRenainf: lines.map((line) => line.autoRenainf).join("\n"),
            tipoMulta: lines.map((line) => line.tipoMulta).join("\n"),
            prazoMulta: lines.map((line) => line.prazoMulta).join("\n"),
          }
        : block
    )

    setMultaBlocks(nextBlocks)
  }

  const updateMultaDetailLineField = (
    blockIndex: number,
    lineIndex: number,
    field: keyof MultaDetailLine,
    value: string
  ) => {
    const currentLines = getMultaDetailLines(multaBlocks[blockIndex] || {
      instanciaMulta: "",
      autoDetran: "",
      autoRenainf: "",
      tipoMulta: "",
      placa: "",
      renavam: "",
      prazoMulta: "",
    })

    const nextLines = currentLines.map((line, currentLineIndex) =>
      currentLineIndex === lineIndex ? { ...line, [field]: value } : line
    )

    updateMultaDetailLines(blockIndex, nextLines)
  }

  const addMultaDetailLine = (blockIndex: number) => {
    const currentLines = getMultaDetailLines(multaBlocks[blockIndex])
    updateMultaDetailLines(blockIndex, [
      ...currentLines,
      { instanciaMulta: "", autoDetran: "", autoRenainf: "", tipoMulta: "", prazoMulta: "" },
    ])
  }

  const removeMultaDetailLine = (blockIndex: number, lineIndex: number) => {
    const currentLines = getMultaDetailLines(multaBlocks[blockIndex])
    if (currentLines.length === 1) return

    updateMultaDetailLines(
      blockIndex,
      currentLines.filter((_, currentLineIndex) => currentLineIndex !== lineIndex)
    )
  }

  const addMultaBlock = () => {
    setMultaBlocks([
      ...multaBlocks,
      {
        instanciaMulta: "",
        autoDetran: "",
        autoRenainf: "",
        tipoMulta: "",
        placa: "",
        renavam: "",
        prazoMulta: "",
      },
    ])
  }

  const removeMultaBlock = (index: number) => {
    if (multaBlocks.length === 1) return
    setMultaBlocks(multaBlocks.filter((_, blockIndex) => blockIndex !== index))
  }

  const setProcessoLines = (lines: ProcessoLine[]) => {
    onChange({
      ...values,
      instanciaProcesso: lines.map((line) => line.instanciaProcesso).join("\n"),
      tipoProcesso: lines.map((line) => line.tipoProcesso).join("\n"),
      numeroProcesso: lines.map((line) => line.numeroProcesso).join("\n"),
      prazoProcesso: lines.map((line) => line.prazoProcesso).join("\n"),
    })
  }

  const updateProcessoLineField = (
    lineIndex: number,
    field: keyof ProcessoLine,
    value: string
  ) => {
    const nextLines = processoLines.map((line, currentLineIndex) =>
      currentLineIndex === lineIndex ? { ...line, [field]: value } : line
    )

    setProcessoLines(nextLines)
  }

  const addProcessoLine = () => {
    setProcessoLines([
      ...processoLines,
      {
        instanciaProcesso: "",
        tipoProcesso: "",
        numeroProcesso: "",
        prazoProcesso: "",
      },
    ])
  }

  const removeProcessoLine = (lineIndex: number) => {
    if (processoLines.length === 1) return
    setProcessoLines(processoLines.filter((_, currentLineIndex) => currentLineIndex !== lineIndex))
  }

  const renderInput = (field: keyof FichaFormValues, label: string, props?: React.ComponentProps<typeof Input>) => (
    <div className="space-y-2">
      <Label htmlFor={field}>
        {label}
        {requiredFields.includes(field) ? " *" : ""}
      </Label>
      <Input
        id={field}
        name={field}
        value={values[field]}
        onChange={(event) => setField(field, event.target.value)}
        disabled={fieldDisabled}
        required={requiredFields.includes(field)}
        aria-required={requiredFields.includes(field)}
        {...props}
      />
    </div>
  )

  const renderPrazoField = (field: "prazoProcesso" | "prazoMulta", label: string) => {
    const isVencida = values[field] === "VENCIDA"

    return (
      <div className="space-y-2">
        <Label htmlFor={field}>{label}</Label>
        <div className="grid grid-cols-[150px_1fr] gap-2">
          <Select
            value={isVencida ? "VENCIDA" : "DATA"}
            onValueChange={(value) => setField(field, value === "VENCIDA" ? "VENCIDA" : values[field] === "VENCIDA" ? "" : values[field])}
            disabled={fieldDisabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DATA">Data</SelectItem>
              <SelectItem value="VENCIDA">VENCIDA</SelectItem>
            </SelectContent>
          </Select>

          <Input
            id={field}
            name={field}
            type="date"
            value={isVencida ? "" : values[field]}
            onChange={(event) => setField(field, event.target.value)}
            disabled={fieldDisabled || isVencida}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-primary shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Calendar className="w-5 h-5" />
            Data do Contrato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {identifierPreview ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-sm font-semibold text-primary">Identificador: {identifierPreview}</p>
            </div>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput("dataContrato", "Data do Contrato", { type: "date" })}
            {renderInput("prazoServico", "Prazo", { type: "date" })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-primary shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-primary">
            <User className="w-5 h-5" />
            Dados do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput("nomeCliente", "Nome Completo")}
            {renderInput("terceiros", "Terceiros")}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefonesInput">Telefone(s)</Label>
              <div className="min-h-[48px] rounded-md border border-input bg-background px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  {telefonesLista.map((telefone) => (
                    <span
                      key={telefone}
                      className="inline-flex items-center gap-2 rounded-full border border-amber-400 bg-amber-50 px-3 py-1 text-sm font-medium text-slate-700"
                    >
                      <span>{telefone}</span>
                      {!fieldDisabled ? (
                        <button
                          type="button"
                          onClick={() => removeTelefone(telefone)}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-500 transition hover:bg-amber-100 hover:text-slate-700"
                          aria-label={`Remover telefone ${telefone}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </span>
                  ))}

                  {!fieldDisabled ? (
                    <input
                      id="telefonesInput"
                      name="telefonesInput"
                      value={telefoneInput}
                      onChange={(event) => setTelefoneInput(event.target.value)}
                      onBlur={() => addTelefone(telefoneInput)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === "," || event.key === ";") {
                          event.preventDefault()
                          addTelefone(telefoneInput)
                        }
                      }}
                      className="min-w-[220px] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
                      placeholder={telefonesLista.length === 0 ? "Digite um telefone e pressione Enter" : "Adicionar telefone"}
                      inputMode="tel"
                      disabled={fieldDisabled}
                    />
                  ) : null}
                </div>
              </div>
            </div>
            {renderInput("email", "E-mail", { type: "email" })}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                name="cep"
                value={values.cep}
                onChange={(event) => setField("cep", event.target.value)}
                disabled={fieldDisabled}
                inputMode="numeric"
                placeholder="00000-000"
              />
              {cepLookupLoading ? <p className="text-xs text-muted-foreground">Buscando endereco pelo CEP...</p> : null}
              {!cepLookupLoading && cepLookupMessage ? <p className="text-xs text-muted-foreground">{cepLookupMessage}</p> : null}
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="endereco">Endereco</Label>
              <Input
                id="endereco"
                name="endereco"
                value={enderecoRua}
                onChange={(event) => {
                  const nextValue = event.target.value
                  setEnderecoRua(nextValue)
                  setEnderecoParts(nextValue, enderecoNumero, enderecoComplemento)
                }}
                disabled={fieldDisabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numeroEndereco">Numero</Label>
              <Input
                id="numeroEndereco"
                name="numeroEndereco"
                value={enderecoNumero}
                onChange={(event) => {
                  const nextValue = event.target.value
                  setEnderecoNumero(nextValue)
                  setEnderecoParts(enderecoRua, nextValue, enderecoComplemento)
                }}
                disabled={fieldDisabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="complementoEndereco">Complemento</Label>
              <Input
                id="complementoEndereco"
                name="complementoEndereco"
                value={enderecoComplemento}
                onChange={(event) => {
                  const nextValue = event.target.value
                  setEnderecoComplemento(nextValue)
                  setEnderecoParts(enderecoRua, enderecoNumero, nextValue)
                }}
                disabled={fieldDisabled}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.05fr_88px] gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpfCnpj">CPF/CNPJ{requiredFields.includes("cpfCnpj") ? " *" : ""}</Label>
              <Input
                id="cpfCnpj"
                name="cpfCnpj"
                value={values.cpfCnpj}
                onChange={(event) => setField("cpfCnpj", event.target.value)}
                disabled={fieldDisabled}
                required={requiredFields.includes("cpfCnpj")}
                aria-required={requiredFields.includes("cpfCnpj")}
              />
              {cpfStatus ? (
                <p className={`text-xs ${cpfStatus === "CPF valido" ? "text-green-600" : "text-red-600"}`}>{cpfStatus}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnhNumero">CNH</Label>
              <Input
                id="cnhNumero"
                name="cnhNumero"
                value={cnhNumero}
                onChange={(event) => {
                  const nextValue = event.target.value
                  setCnhNumero(nextValue)
                  setCnhParts(nextValue, cnhUf)
                }}
                disabled={fieldDisabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnhUf">UF</Label>
              <Input
                id="cnhUf"
                name="cnhUf"
                value={cnhUf}
                maxLength={2}
                onChange={(event) => {
                  const nextValue = event.target.value.toUpperCase()
                  setCnhUf(nextValue)
                  setCnhParts(cnhNumero, nextValue)
                }}
                disabled={fieldDisabled}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput("dataNascimento", "Data de Nascimento", { type: "date" })}
            {renderInput("dataPrimeiraCnh", "Data da 1a CNH", { type: "date" })}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nomeConsultor">Nome do Consultor</Label>
              <Select
                value={values.nomeConsultor || undefined}
                onValueChange={(value) => setField("nomeConsultor", value)}
                disabled={fieldDisabled}
              >
                <SelectTrigger id="nomeConsultor">
                  <SelectValue placeholder="Selecione o consultor" />
                </SelectTrigger>
                <SelectContent>
                  {CONSULTOR_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="origem">Origem</Label>
              <Select value={values.origem || undefined} onValueChange={(value) => setField("origem", value)} disabled={fieldDisabled}>
                <SelectTrigger id="origem">
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  {ORIGEM_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sne">SNE</Label>
              <Select value={values.sne || undefined} onValueChange={(value) => setField("sne", value)} disabled={fieldDisabled}>
                <SelectTrigger id="sne">
                  <SelectValue placeholder="Selecione o SNE" />
                </SelectTrigger>
                <SelectContent>
                  {SNE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-secondary shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-primary">
            <CreditCard className="w-5 h-5" />
            Dados do Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="formaPagamento">Forma de Pagamento</Label>
              <Select value={values.formaPagamento} onValueChange={(value) => setField("formaPagamento", value)} disabled={fieldDisabled}>
                <SelectTrigger id="formaPagamento">
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credito">Credito</SelectItem>
                  <SelectItem value="debito">Debito</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="ted">TED</SelectItem>
                  <SelectItem value="especie">Especie</SelectItem>
                  <SelectItem value="deposito">Deposito</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="banco">Banco</Label>
              <Select value={values.banco || undefined} onValueChange={(value) => setField("banco", value)} disabled={fieldDisabled}>
                <SelectTrigger id="banco">
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asaas">ASAAS</SelectItem>
                  <SelectItem value="rede">REDE</SelectItem>
                  <SelectItem value="itau">ITAU</SelectItem>
                  <SelectItem value="outros">OUTROS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {values.banco === "outros" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderInput("bancoOutro", "Nome do Banco", { placeholder: "Digite o nome do banco" })}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderInput("valorTotal", "Valor Total", { type: "number", step: "0.01", min: "0" })}
            {renderInput("valorEntrada", "Valor de Entrada", { type: "number", step: "0.01", min: "0" })}
            {renderInput("valorRestante", "Valor Restante", { type: "number", step: "0.01", min: "0", readOnly: true })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-primary shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-primary">
              <FileText className="w-5 h-5" />
              Processos
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addProcessoLine} disabled={fieldDisabled}>
              Adicionar Linha
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <div className="space-y-3">
            {processoLines.map((line, lineIndex) => (
              <div
                key={`processo-line-${lineIndex}`}
                className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-slate-50/60 p-3 xl:grid-cols-[180px_220px_minmax(0,1fr)_250px_auto]"
              >
                <div className="space-y-2">
                  <Label htmlFor={`instanciaProcesso-${lineIndex}`}>Instancia do Processo</Label>
                  <Select
                    value={line.instanciaProcesso || undefined}
                    onValueChange={(value) => updateProcessoLineField(lineIndex, "instanciaProcesso", value)}
                    disabled={fieldDisabled}
                  >
                    <SelectTrigger id={`instanciaProcesso-${lineIndex}`}>
                      <SelectValue placeholder="Selecione a instancia" />
                    </SelectTrigger>
                    <SelectContent>
                      {INSTANCIA_PROCESSO_OPTIONS.map((option) => (
                        <SelectItem key={`${option}-${lineIndex}`} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`tipoProcesso-${lineIndex}`}>Tipo do Processo</Label>
                  <Select
                    value={line.tipoProcesso || undefined}
                    onValueChange={(value) => updateProcessoLineField(lineIndex, "tipoProcesso", value)}
                    disabled={fieldDisabled}
                  >
                    <SelectTrigger id={`tipoProcesso-${lineIndex}`}>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPO_PROCESSO_OPTIONS.map((option) => (
                        <SelectItem key={`${option}-processo-${lineIndex}`} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`numeroProcesso-${lineIndex}`}>No do Processo</Label>
                  <Input
                    id={`numeroProcesso-${lineIndex}`}
                    value={line.numeroProcesso}
                    onChange={(event) => updateProcessoLineField(lineIndex, "numeroProcesso", event.target.value)}
                    disabled={fieldDisabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`prazoProcesso-${lineIndex}`}>Prazo</Label>
                  <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
                    <Select
                      value={line.prazoProcesso === "VENCIDA" ? "VENCIDA" : "DATA"}
                      onValueChange={(value) =>
                        updateProcessoLineField(
                          lineIndex,
                          "prazoProcesso",
                          value === "VENCIDA"
                            ? "VENCIDA"
                            : line.prazoProcesso === "VENCIDA"
                              ? ""
                              : line.prazoProcesso
                        )
                      }
                      disabled={fieldDisabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DATA">Data</SelectItem>
                        <SelectItem value="VENCIDA">VENCIDA</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      id={`prazoProcesso-${lineIndex}`}
                      type="date"
                      value={line.prazoProcesso === "VENCIDA" ? "" : line.prazoProcesso}
                      onChange={(event) => updateProcessoLineField(lineIndex, "prazoProcesso", event.target.value)}
                      disabled={fieldDisabled || line.prazoProcesso === "VENCIDA"}
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeProcessoLine(lineIndex)}
                    disabled={fieldDisabled || processoLines.length === 1}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-secondary shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-primary">
            <AlertCircle className="w-5 h-5" />
            Multas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {multaBlocks.map((block, index) => {
            const multaDetailLines = getMultaDetailLines(block)

            return (
              <div key={`multa-block-${index}`} className="space-y-3 rounded-xl border border-border bg-slate-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-primary">Placa</span>
                    <span className="rounded-md bg-primary px-2.5 py-1 text-sm font-bold text-primary-foreground shadow-sm">
                      {block.placa?.trim() || `${index + 1}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => addMultaDetailLine(index)} disabled={fieldDisabled}>
                      Adicionar Linha
                    </Button>
                    {multaBlocks.length > 1 ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => removeMultaBlock(index)} disabled={fieldDisabled}>
                        Remover
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`placa-${index}`}>Placa</Label>
                        <Input
                          id={`placa-${index}`}
                          value={block.placa}
                          onChange={(event) => updateMultaBlockField(index, "placa", event.target.value)}
                          disabled={fieldDisabled}
                          className="uppercase"
                        />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`renavam-${index}`}>RENAVAM</Label>
                      <Input
                        id={`renavam-${index}`}
                        value={block.renavam}
                        onChange={(event) => updateMultaBlockField(index, "renavam", event.target.value)}
                        disabled={fieldDisabled}
                      />
                    </div>
                  </div>

                  {multaDetailLines.map((line, lineIndex) => (
                    <div
                      key={`multa-detail-${index}-${lineIndex}`}
                      className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-background p-3 xl:grid-cols-[170px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_250px_auto]"
                    >
                      <div className="space-y-2">
                        <Label htmlFor={`instanciaMulta-${index}-${lineIndex}`}>Instancia da Multa</Label>
                        <Select
                          value={line.instanciaMulta || undefined}
                          onValueChange={(value) => updateMultaDetailLineField(index, lineIndex, "instanciaMulta", value)}
                          disabled={fieldDisabled}
                        >
                          <SelectTrigger id={`instanciaMulta-${index}-${lineIndex}`}>
                            <SelectValue placeholder="Selecione a instancia" />
                          </SelectTrigger>
                          <SelectContent>
                            {INSTANCIA_MULTA_OPTIONS.map((option) => (
                              <SelectItem key={`${option}-${index}-${lineIndex}`} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`autoDetran-${index}-${lineIndex}`}>Auto DETRAN</Label>
                        <Input
                          id={`autoDetran-${index}-${lineIndex}`}
                          value={line.autoDetran}
                          onChange={(event) => updateMultaDetailLineField(index, lineIndex, "autoDetran", event.target.value)}
                          disabled={fieldDisabled}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`autoRenainf-${index}-${lineIndex}`}>Auto RENAINF</Label>
                        <Input
                          id={`autoRenainf-${index}-${lineIndex}`}
                          value={line.autoRenainf}
                          onChange={(event) => updateMultaDetailLineField(index, lineIndex, "autoRenainf", event.target.value)}
                          disabled={fieldDisabled}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`tipoMulta-${index}-${lineIndex}`}>Tipo de Multa</Label>
                        <Input
                          id={`tipoMulta-${index}-${lineIndex}`}
                          value={line.tipoMulta}
                          onChange={(event) => updateMultaDetailLineField(index, lineIndex, "tipoMulta", event.target.value)}
                          disabled={fieldDisabled}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`prazoMulta-${index}-${lineIndex}`}>Prazo</Label>
                        <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
                          <Select
                            value={line.prazoMulta === "VENCIDA" ? "VENCIDA" : "DATA"}
                            onValueChange={(value) =>
                              updateMultaDetailLineField(
                                index,
                                lineIndex,
                                "prazoMulta",
                                value === "VENCIDA"
                                  ? "VENCIDA"
                                  : line.prazoMulta === "VENCIDA"
                                    ? ""
                                    : line.prazoMulta
                              )
                            }
                            disabled={fieldDisabled}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DATA">Data</SelectItem>
                              <SelectItem value="VENCIDA">VENCIDA</SelectItem>
                            </SelectContent>
                          </Select>

                          <Input
                            id={`prazoMulta-${index}-${lineIndex}`}
                            type="date"
                            value={line.prazoMulta === "VENCIDA" ? "" : line.prazoMulta}
                            onChange={(event) => updateMultaDetailLineField(index, lineIndex, "prazoMulta", event.target.value)}
                            disabled={fieldDisabled || line.prazoMulta === "VENCIDA"}
                          />
                        </div>
                      </div>

                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeMultaDetailLine(index, lineIndex)}
                          disabled={fieldDisabled || multaDetailLines.length === 1}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )
          })}

          <div>
            <Button type="button" variant="outline" onClick={addMultaBlock} disabled={fieldDisabled}>
              Adicionar Outra Placa
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-muted shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-primary">Observacoes Adicionais</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={values.observacoes}
            onChange={(event) => setField("observacoes", event.target.value)}
            disabled={fieldDisabled}
            className="min-h-[120px]"
            placeholder="Digite observacoes adicionais sobre a venda..."
          />
        </CardContent>
      </Card>

      {showActions && (
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
          {onCancelEdit && (
            <Button type="button" variant="outline" className="px-8 py-6 text-lg" onClick={onCancelEdit} disabled={loading}>
              Cancelar
            </Button>
          )}
          <Button
            type="button"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold shadow-lg"
            onClick={() => void onSubmit?.()}
            disabled={loading || readOnly}
          >
            {loading ? (
              <>
                <Spinner className="w-5 h-5 mr-2" />
                {loadingLabel}
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
