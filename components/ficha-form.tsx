"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { CONSULTOR_OPTIONS, ESTADO_CIVIL_OPTIONS, INSTANCIA_MULTA_OPTIONS, INSTANCIA_PROCESSO_OPTIONS, ORIGEM_OPTIONS, SNE_OPTIONS, TIPO_PROCESSO_OPTIONS } from "@/lib/ficha-options"
import { validarCPF } from "@/lib/cpf-utils"
import type { FichaFormValues } from "@/lib/ficha-types"
import { MULTI_ENTRY_SEPARATOR, normalizeMultasProcessoLabels, parseCurrency, splitSerializedEntries } from "@/lib/ficha-utils"
import { formatPaymentAmount, parsePaymentEntries, reconcilePaymentValues, serializePaymentEntries, validatePaymentEntries, type PaymentEntry } from "@/lib/payment-details"
import { Calendar, User, CreditCard, FileText, AlertCircle, ChevronDown, Plus, X } from "lucide-react"

type MultaBlock = {
  instanciaMulta: string
  autoDetran: string
  autoRenainf: string
  tipoMulta: string
  placa: string
  placaProprietario: string
  cpfProprietario: string
  renavam: string
  prazoMulta: string
  processoVinculado: string
}

type MultaDetailLine = {
  instanciaMulta: string
  autoDetran: string
  autoRenainf: string
  tipoMulta: string
  prazoMulta: string
  processoVinculado: string
}

type ProcessoLine = {
  instanciaProcesso: string
  tipoProcesso: string
  numeroProcesso: string
  multasProcesso: string
  prazoProcesso: string
}

type MultaProcessoOption = {
  label: string
  blockIndex: number
  lineIndex: number
}

function splitLineValues(value: string) {
  if (!value) return [""]
  return value.split("\n")
}

function getSelectedOptions(value: string) {
  return (value || "")
    .split(/[,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function MultiSelectInstancia({
  id,
  value,
  options,
  onChange,
  disabled,
}: {
  id: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const selected = getSelectedOptions(value)

  const toggleOption = (option: string, checked: boolean) => {
    const selectedSet = new Set(selected)

    if (checked) {
      selectedSet.add(option)
    } else {
      selectedSet.delete(option)
    }

    const orderedValues = options.filter((item) => selectedSet.has(item))
    onChange(orderedValues.join(", "))
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="h-10 w-full justify-between px-3 text-left font-normal"
          disabled={disabled}
        >
          <span className="truncate">{selected.length > 0 ? selected.join(", ") : "Selecione"}</span>
          <ChevronDown className="size-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <div className="space-y-1">
          {options.map((option) => {
            const optionId = `${id}-${option.replace(/\W+/g, "-")}`
            const checked = selected.includes(option)

            return (
              <label
                key={option}
                htmlFor={optionId}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
              >
                <Checkbox
                  id={optionId}
                  checked={checked}
                  onCheckedChange={(nextChecked) => toggleOption(option, nextChecked === true)}
                />
                <span>{option}</span>
              </label>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function parseTelefoneValues(value: string) {
  return (value || "")
    .split(/[\n;,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseCnhParts(value: string) {
  const cnhAtual = (value || "").trim()
  const cnhMatch = cnhAtual.match(/^(.*?)(?:\s+\/\s+([A-Za-z]{1,2}))?$/)
  const numero = (cnhMatch?.[1] || cnhAtual).trim().replace(/(?:\s+\/\s+[A-Za-z]?)+$/g, "").trim()

  return {
    numero,
  }
}

function getProcessoLines(values: FichaFormValues): ProcessoLine[] {
  const instancias = splitLineValues(values.instanciaProcesso)
  const tipos = splitLineValues(values.tipoProcesso)
  const numeros = splitLineValues(values.numeroProcesso)
  const multas = splitLineValues(normalizeMultasProcessoLabels(values.vistoJuridico))
  const prazos = splitLineValues(values.prazoProcesso)

  const maxLength = Math.max(instancias.length, tipos.length, numeros.length, multas.length, prazos.length, 1)

  return Array.from({ length: maxLength }, (_, index) => ({
    instanciaProcesso: instancias[index] || "",
    tipoProcesso: tipos[index] || "",
    numeroProcesso: numeros[index] || "",
    multasProcesso: multas[index] || "",
    prazoProcesso: prazos[index] || "",
  }))
}

function parseMultaBlocks(values: FichaFormValues): MultaBlock[] {
  const instancias = splitSerializedEntries(values.instanciaMulta)
  const autosDetran = splitSerializedEntries(values.autoDetran)
  const autosRenainf = splitSerializedEntries(values.autoRenainf)
  const tipos = splitSerializedEntries(values.tipoMulta)
  const placas = splitSerializedEntries(values.placa)
  const placasProprietario = splitSerializedEntries(values.placaProprietario)
  const cpfsProprietario = splitSerializedEntries(values.cpfProprietario)
  const renavams = splitSerializedEntries(values.renavam)
  const prazos = splitSerializedEntries(values.prazoMulta)
  const processosVinculados = splitSerializedEntries(values.vistoJuridicoMulta)

  const maxLength = Math.max(
    instancias.length,
    autosDetran.length,
    autosRenainf.length,
    tipos.length,
    placas.length,
    placasProprietario.length,
    cpfsProprietario.length,
    renavams.length,
    prazos.length,
    processosVinculados.length,
    1
  )

  return Array.from({ length: maxLength }, (_, index) => ({
    instanciaMulta: instancias[index] || "",
    autoDetran: autosDetran[index] || "",
    autoRenainf: autosRenainf[index] || "",
    tipoMulta: tipos[index] || "",
    placa: placas[index] || "",
    placaProprietario: placasProprietario[index] || "sim",
    cpfProprietario: cpfsProprietario[index] || "",
    renavam: renavams[index] || "",
    prazoMulta: prazos[index] || "",
    processoVinculado: processosVinculados[index] || "",
  }))
}

function serializeMultaBlocks(blocks: MultaBlock[]) {
  return {
    instanciaMulta: blocks.map((block) => block.instanciaMulta).join(MULTI_ENTRY_SEPARATOR),
    autoDetran: blocks.map((block) => block.autoDetran).join(MULTI_ENTRY_SEPARATOR),
    autoRenainf: blocks.map((block) => block.autoRenainf).join(MULTI_ENTRY_SEPARATOR),
    tipoMulta: blocks.map((block) => block.tipoMulta).join(MULTI_ENTRY_SEPARATOR),
    placa: blocks.map((block) => block.placa).join(MULTI_ENTRY_SEPARATOR),
    placaProprietario: blocks.map((block) => block.placaProprietario).join(MULTI_ENTRY_SEPARATOR),
    cpfProprietario: blocks.map((block) => block.cpfProprietario).join(MULTI_ENTRY_SEPARATOR),
    renavam: blocks.map((block) => block.renavam).join(MULTI_ENTRY_SEPARATOR),
    prazoMulta: blocks.map((block) => block.prazoMulta).join(MULTI_ENTRY_SEPARATOR),
    vistoJuridicoMulta: blocks.map((block) => block.processoVinculado).join(MULTI_ENTRY_SEPARATOR),
  }
}

function getMultaDetailLines(block: MultaBlock): MultaDetailLine[] {
  const instancias = splitLineValues(block.instanciaMulta)
  const autosDetran = splitLineValues(block.autoDetran)
  const autosRenainf = splitLineValues(block.autoRenainf)
  const tipos = splitLineValues(block.tipoMulta)
  const prazos = splitLineValues(block.prazoMulta)
  const processosVinculados = splitLineValues(block.processoVinculado)

  const maxLength = Math.max(
    instancias.length,
    autosDetran.length,
    autosRenainf.length,
    tipos.length,
    prazos.length,
    processosVinculados.length,
    1
  )

  return Array.from({ length: maxLength }, (_, index) => ({
    instanciaMulta: instancias[index] || "",
    autoDetran: autosDetran[index] || "",
    autoRenainf: autosRenainf[index] || "",
    tipoMulta: tipos[index] || "",
    prazoMulta: prazos[index] || "",
    processoVinculado: processosVinculados[index] || "",
  }))
}

function getMultaProcessoOptions(blocks: MultaBlock[]): MultaProcessoOption[] {
  let count = 0

  return blocks.flatMap((block, blockIndex) => {
    const lines = getMultaDetailLines(block)

    return lines.map((line, lineIndex) => {
      count += 1
      const auto = line.autoDetran?.trim() || line.autoRenainf?.trim()

      return {
        label: auto || `Multa ${count}`,
        blockIndex,
        lineIndex,
      }
    })
  })
}

function getPrazoMode(value: string) {
  if (value === "Vencida" || value === "VENCIDA") return "Vencida"
  if (value === "Revisão de Ato") return "Revisão de Ato"
  return "DATA"
}

function getPrazoValue(currentValue: string, nextMode: string) {
  const currentMode = getPrazoMode(currentValue)
  if (nextMode === "DATA") return currentMode === "DATA" ? currentValue : ""
  return nextMode
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
  showInlineSubmit?: boolean
  onCancelEdit?: () => void
  onBack?: () => void
  backLabel?: string
  requiredFields?: Array<keyof FichaFormValues>
  identifierPreview?: string
  visibleSections?: FichaFormSection[]
}

type FichaFormSection = "contract" | "client" | "payment" | "processes" | "fines" | "notes" | "clause"

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

    if (!next.valorRestante || parseCurrency(next.valorRestante) <= 0) {
      next.observacaoValorRestante = ""
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
  showInlineSubmit = false,
  onCancelEdit,
  onBack,
  backLabel = "Voltar",
  requiredFields = [],
  identifierPreview,
  visibleSections,
}: FichaFormProps) {
  const lastFetchedCepRef = useRef("")
  const [cepLookupMessage, setCepLookupMessage] = useState("")
  const [cepLookupLoading, setCepLookupLoading] = useState(false)
  const [enderecoRua, setEnderecoRua] = useState(values.endereco)
  const [enderecoNumero, setEnderecoNumero] = useState(values.numeroEndereco)
  const [enderecoComplemento, setEnderecoComplemento] = useState(values.complementoEndereco)
  const [cnhNumero, setCnhNumero] = useState("")
  const [telefoneInput, setTelefoneInput] = useState("")

  useEffect(() => {
    setEnderecoRua(values.endereco || "")
    setEnderecoNumero(values.numeroEndereco || "")
    setEnderecoComplemento(values.complementoEndereco || "")
  }, [values.endereco, values.numeroEndereco, values.complementoEndereco])

  useEffect(() => {
    const { numero } = parseCnhParts(values.cnh)

    setCnhNumero(numero)
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
          onChange({
            ...updateValue(values, "endereco", endereco),
            municipio: (payload.localidade || "").trim() || values.municipio,
            uf: (payload.uf || "").trim().toUpperCase() || values.uf,
          })
        } else if ((payload.localidade || payload.uf) && !cancelled) {
          onChange({
            ...values,
            municipio: (payload.localidade || "").trim() || values.municipio,
            uf: (payload.uf || "").trim().toUpperCase() || values.uf,
          })
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
    if (readOnly) return
    onChange({
      ...values,
      endereco: rua,
      numeroEndereco: numero,
      complementoEndereco: complemento,
    })
  }

  const setCnhParts = (numero: string) => {
    const normalizedNumero = numero.trim()

    setField("cnh", normalizedNumero)
  }

  const fieldDisabled = readOnly || loading
  const cpfDigits = values.cpfCnpj.replace(/\D/g, "")
  const cpfStatus =
    cpfDigits.length === 11
      ? validarCPF(values.cpfCnpj)
        ? "CPF valido"
        : "CPF invalido"
      : ""
  const submitContent = loading ? (
    <>
      <Spinner className="w-5 h-5 mr-2" />
      {loadingLabel}
    </>
  ) : (
    submitLabel
  )
  const renderSectionSubmit = () =>
    showActions && showInlineSubmit && onSubmit ? (
      <CardAction>
        <Button
          type="button"
          size="sm"
          className="whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => void onSubmit()}
          disabled={loading || readOnly}
        >
          {submitContent}
        </Button>
      </CardAction>
    ) : null
  const shouldShowSection = (section: FichaFormSection) => !visibleSections || visibleSections.includes(section)
  const telefonesLista = parseTelefoneValues(values.telefones)
  const processoLines = getProcessoLines(values)
  const multaBlocks = parseMultaBlocks(values)
  const multaProcessoOptions = getMultaProcessoOptions(multaBlocks)
  const paymentLines = parsePaymentEntries(values.pagamentos, {
    formaPagamento: values.formaPagamento,
    banco: values.banco === "outros" ? values.bancoOutro : values.banco,
    valorEntrada: values.valorEntrada,
  })
  const visiblePaymentLines = paymentLines.length > 0 ? paymentLines : [{ id: "payment-1", formaPagamento: "", banco: "", valor: "" }]
  const paymentValidationMessage = validatePaymentEntries(values.valorTotal, paymentLines)
  const shouldShowValorRestanteObservacao = values.valorRestante.trim() !== "" && parseCurrency(values.valorRestante) > 0

  const setPaymentLines = (nextLines: PaymentEntry[]) => {
    if (readOnly) return
    const startedLines = nextLines.filter((line) => line.formaPagamento || line.banco || line.valor)
    const totals = reconcilePaymentValues(values.valorTotal, startedLines)
    onChange({
      ...values,
      pagamentos: serializePaymentEntries(startedLines),
      formaPagamento: startedLines.map((line) => line.formaPagamento).filter(Boolean).join("\n"),
      banco: startedLines.map((line) => line.banco).filter(Boolean).join("\n"),
      bancoOutro: "",
      valorEntrada: totals.paid > 0 ? formatPaymentAmount(totals.paid) : "",
      valorRestante: totals.total > 0 ? formatPaymentAmount(totals.remaining) : "",
      observacaoValorRestante: totals.remaining > 0 ? values.observacaoValorRestante : "",
    })
  }

  const updatePaymentLine = (index: number, field: keyof Omit<PaymentEntry, "id">, value: string) => {
    setPaymentLines(visiblePaymentLines.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line))
  }
  const addPaymentLine = () => setPaymentLines([...visiblePaymentLines, { id: `payment-${Date.now()}`, formaPagamento: "", banco: "", valor: "" }])
  const removePaymentLine = (index: number) => setPaymentLines(visiblePaymentLines.filter((_, lineIndex) => lineIndex !== index))

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
    const shouldUppercase = field === "placa" || field === "renavam"
    const normalizedValue = shouldUppercase ? value.toUpperCase() : value
    const nextBlocks = multaBlocks.map((block, blockIndex) =>
      blockIndex === index ? { ...block, [field]: normalizedValue } : block
    )
    setMultaBlocks(nextBlocks)
  }

  const updateMultaBlockProprietario = (index: number, checked: boolean) => {
    const nextBlocks = multaBlocks.map((block, blockIndex) =>
      blockIndex === index
        ? {
            ...block,
            placaProprietario: checked ? "sim" : "nao",
            cpfProprietario: checked ? "" : block.cpfProprietario,
          }
        : block
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
            processoVinculado: lines.map((line) => line.processoVinculado).join("\n"),
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
    const shouldUppercase =
      field === "autoDetran" ||
      field === "autoRenainf" ||
      field === "tipoMulta"

    const currentLines = getMultaDetailLines(multaBlocks[blockIndex] || {
      instanciaMulta: "",
      autoDetran: "",
      autoRenainf: "",
      tipoMulta: "",
      placa: "",
      placaProprietario: "sim",
      cpfProprietario: "",
      renavam: "",
      prazoMulta: "",
      processoVinculado: "",
    })

    const nextLines = currentLines.map((line, currentLineIndex) =>
      currentLineIndex === lineIndex
        ? { ...line, [field]: shouldUppercase ? value.toUpperCase() : value }
        : line
    )

    updateMultaDetailLines(blockIndex, nextLines)
  }

  const addMultaDetailLine = (blockIndex: number) => {
    const currentLines = getMultaDetailLines(multaBlocks[blockIndex])
    updateMultaDetailLines(blockIndex, [
      ...currentLines,
      { instanciaMulta: "", autoDetran: "", autoRenainf: "", tipoMulta: "", prazoMulta: "", processoVinculado: "" },
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
        placaProprietario: "sim",
        cpfProprietario: "",
        renavam: "",
        prazoMulta: "",
        processoVinculado: "",
      },
    ])
  }

  const removeMultaBlock = (index: number) => {
    if (multaBlocks.length === 1) return
    setMultaBlocks(multaBlocks.filter((_, blockIndex) => blockIndex !== index))
  }

  const setProcessoLines = (lines: ProcessoLine[]) => {
    const selectedMultas = new Set(lines.flatMap((line) => getSelectedOptions(normalizeMultasProcessoLabels(line.multasProcesso))))
    const nextBlocks = multaBlocks.map((block, blockIndex) => {
      const currentLines = getMultaDetailLines(block)
      const nextLines = currentLines.map((line, lineIndex) => {
        const option = multaProcessoOptions.find((item) => item.blockIndex === blockIndex && item.lineIndex === lineIndex)
        return {
          ...line,
          processoVinculado: option && selectedMultas.has(option.label) ? "sim" : "",
        }
      })

      return {
        ...block,
        processoVinculado: nextLines.map((line) => line.processoVinculado).join("\n"),
      }
    })

    onChange({
      ...values,
      instanciaProcesso: lines.map((line) => line.instanciaProcesso).join("\n"),
      tipoProcesso: lines.map((line) => line.tipoProcesso).join("\n"),
      numeroProcesso: lines.map((line) => line.numeroProcesso).join("\n"),
      vistoJuridico: lines.map((line) => line.multasProcesso).join("\n"),
      prazoProcesso: lines.map((line) => line.prazoProcesso).join("\n"),
      ...serializeMultaBlocks(nextBlocks),
    })
  }

  const updateProcessoLineField = (
    lineIndex: number,
    field: keyof ProcessoLine,
    value: string
  ) => {
    const normalizedValue =
      field === "numeroProcesso" ? value.toUpperCase() : field === "multasProcesso" ? normalizeMultasProcessoLabels(value) : value
    const nextLines = processoLines.map((line, currentLineIndex) =>
      currentLineIndex === lineIndex ? { ...line, [field]: normalizedValue } : line
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
        multasProcesso: "",
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

  const renderCurrencyInput = (
    field: "valorTotal" | "valorEntrada" | "valorRestante",
    label: string,
    props?: React.ComponentProps<typeof InputGroupInput>
  ) => (
    <div className="space-y-2">
      <Label htmlFor={field}>
        {label}
        {requiredFields.includes(field) ? " *" : ""}
      </Label>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>R$</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          id={field}
          name={field}
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          value={values[field]}
          onChange={(event) => setField(field, event.target.value)}
          disabled={fieldDisabled}
          {...props}
        />
      </InputGroup>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <Card className={`order-[10] border-l-4 border-l-primary shadow-md ${shouldShowSection("contract") ? "" : "hidden"}`}>
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
            <div className="grid grid-cols-1 gap-4">
              {renderInput("dataContrato", "Data do Contrato", { type: "date" })}
            </div>
          </CardContent>
        </Card>

      <Card className={`order-[20] border-l-4 border-l-primary shadow-md ${shouldShowSection("client") ? "" : "hidden"}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-primary">
            <User className="w-5 h-5" />
            Dados do Cliente
          </CardTitle>
          {renderSectionSubmit()}
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[110px_minmax(0,1.45fr)_110px_140px_minmax(0,1fr)_90px]">
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
            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
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
              <Label htmlFor="numeroEndereco">Número</Label>
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
            <div className="space-y-2">
              <Label htmlFor="municipio">Municipio</Label>
              <Input
                id="municipio"
                name="municipio"
                value={values.municipio}
                onChange={(event) => setField("municipio", event.target.value)}
                disabled={fieldDisabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf">UF</Label>
              <Input
                id="uf"
                name="uf"
                value={values.uf}
                maxLength={2}
                onChange={(event) => setField("uf", event.target.value.toUpperCase())}
                disabled={fieldDisabled}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-4">
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
                  setCnhParts(nextValue)
                }}
                disabled={fieldDisabled}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput("dataNascimento", "Data de Nascimento", { type: "date" })}
            {renderInput("dataPrimeiraCnh", "Data da 1a CNH", { type: "date" })}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {renderInput("nacionalidade", "Nacionalidade")}
            <div className="space-y-2">
              <Label htmlFor="estadoCivil">Estado Civil</Label>
              <Select value={values.estadoCivil || undefined} onValueChange={(value) => setField("estadoCivil", value)} disabled={fieldDisabled}>
                <SelectTrigger id="estadoCivil">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADO_CIVIL_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {renderInput("profissao", "Profissão")}
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
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

      <Card className={`order-[30] border-l-4 border-l-secondary shadow-md ${shouldShowSection("payment") ? "" : "hidden"}`}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-primary">
            <CreditCard className="w-5 h-5" />
            Dados do Pagamento
          </CardTitle>
          {renderSectionSubmit()}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {visiblePaymentLines.map((payment, index) => {
              const bankKey = payment.banco.toLowerCase()
              const bankSelection = payment.banco ? (["asaas", "rede", "itau"].includes(bankKey) ? bankKey : "outros") : undefined
              return (
                <div key={payment.id} className="grid grid-cols-1 gap-3 rounded-lg border bg-slate-50/60 p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                  <div className="space-y-2">
                    <Label htmlFor={`formaPagamento-${index}`}>Forma de Pagamento</Label>
                    <Select value={payment.formaPagamento || undefined} onValueChange={(value) => updatePaymentLine(index, "formaPagamento", value)} disabled={fieldDisabled}>
                      <SelectTrigger id={`formaPagamento-${index}`}><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credito">Crédito</SelectItem><SelectItem value="debito">Débito</SelectItem><SelectItem value="pix">PIX</SelectItem><SelectItem value="transferencia">Transferência</SelectItem><SelectItem value="ted">TED</SelectItem><SelectItem value="especie">Espécie</SelectItem><SelectItem value="deposito">Depósito</SelectItem><SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`banco-${index}`}>Banco / Operadora</Label>
                    <Select value={bankSelection} onValueChange={(value) => updatePaymentLine(index, "banco", value === "outros" ? "Outro" : value)} disabled={fieldDisabled}>
                      <SelectTrigger id={`banco-${index}`}><SelectValue placeholder="Opcional" /></SelectTrigger>
                      <SelectContent><SelectItem value="asaas">ASAAS</SelectItem><SelectItem value="rede">REDE</SelectItem><SelectItem value="itau">ITAÚ</SelectItem><SelectItem value="outros">OUTROS</SelectItem></SelectContent>
                    </Select>
                    {bankSelection === "outros" ? <Input value={payment.banco === "Outro" ? "" : payment.banco} onChange={(event) => updatePaymentLine(index, "banco", event.target.value)} placeholder="Informe o banco/operadora" disabled={fieldDisabled} /> : null}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`valorPagamento-${index}`}>Valor</Label>
                    <InputGroup><InputGroupAddon><InputGroupText>R$</InputGroupText></InputGroupAddon><InputGroupInput id={`valorPagamento-${index}`} type="number" step="0.01" min="0" inputMode="decimal" value={payment.valor} onChange={(event) => updatePaymentLine(index, "valor", event.target.value)} disabled={fieldDisabled} /></InputGroup>
                  </div>
                  <div className="flex items-end"><Button type="button" variant="ghost" size="icon" onClick={() => removePaymentLine(index)} disabled={fieldDisabled} aria-label={`Remover pagamento ${index + 1}`}><X className="size-4" /></Button></div>
                </div>
              )
            })}
            <Button type="button" variant="outline" onClick={addPaymentLine} disabled={fieldDisabled}><Plus className="mr-2 size-4" />Adicionar forma de pagamento</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderCurrencyInput("valorTotal", "Valor Total")}
            {renderCurrencyInput("valorEntrada", "Total Pago", { readOnly: true })}
            {renderCurrencyInput("valorRestante", "Valor Restante", { readOnly: true })}
          </div>
          {paymentValidationMessage ? <p className="flex items-center gap-2 text-sm text-destructive"><AlertCircle className="size-4" />{paymentValidationMessage}</p> : null}
          {shouldShowValorRestanteObservacao ? (
            <div className="space-y-2">
              <Label htmlFor="observacaoValorRestante">Observacao do Valor Restante</Label>
              <Textarea
                id="observacaoValorRestante"
                name="observacaoValorRestante"
                value={values.observacaoValorRestante}
                onChange={(event) => setField("observacaoValorRestante", event.target.value)}
                disabled={fieldDisabled}
                className="min-h-[88px]"
                placeholder="Explique como o valor restante sera tratado no contrato..."
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className={`order-[50] border-l-4 border-l-primary shadow-md ${shouldShowSection("processes") ? "" : "hidden"}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-primary">
            <FileText className="w-5 h-5" />
            Processos
          </CardTitle>
          {renderSectionSubmit()}
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <div className="space-y-3">
            {processoLines.map((line, lineIndex) => (
              <div
                key={`processo-line-${lineIndex}`}
                className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-slate-50/60 p-3 xl:grid-cols-[190px_150px_120px_120px_250px_auto]"
              >
                      <div className="space-y-2">
                        <Label htmlFor={`instanciaProcesso-${lineIndex}`} className="flex min-h-8 items-end">
                          Instancia do Processo
                        </Label>
                        <MultiSelectInstancia
                          id={`instanciaProcesso-${lineIndex}`}
                          value={line.instanciaProcesso}
                          options={INSTANCIA_PROCESSO_OPTIONS}
                          onChange={(value) => updateProcessoLineField(lineIndex, "instanciaProcesso", value)}
                          disabled={fieldDisabled}
                        />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`tipoProcesso-${lineIndex}`} className="flex min-h-8 items-end">
                    Tipo do Processo
                  </Label>
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
                  <Label htmlFor={`numeroProcesso-${lineIndex}`} className="flex min-h-8 items-end">
                    Nº do Processo
                  </Label>
                  <Input
                    id={`numeroProcesso-${lineIndex}`}
                    value={line.numeroProcesso}
                    onChange={(event) => updateProcessoLineField(lineIndex, "numeroProcesso", event.target.value)}
                    disabled={fieldDisabled}
                    className="uppercase"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`multasProcesso-${lineIndex}`} className="flex min-h-8 items-end">
                    Multas do Processo
                  </Label>
                  <MultiSelectInstancia
                    id={`multasProcesso-${lineIndex}`}
                    value={normalizeMultasProcessoLabels(line.multasProcesso)}
                    options={multaProcessoOptions.map((option) => option.label)}
                    onChange={(value) => updateProcessoLineField(lineIndex, "multasProcesso", value)}
                    disabled={fieldDisabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`prazoProcesso-${lineIndex}`} className="flex min-h-8 items-end">
                    Prazo
                  </Label>
                  <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
                    <Select
                      value={getPrazoMode(line.prazoProcesso)}
                      onValueChange={(value) =>
                        updateProcessoLineField(
                          lineIndex,
                          "prazoProcesso",
                          getPrazoValue(line.prazoProcesso, value)
                        )
                      }
                      disabled={fieldDisabled}
                    >
                      <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DATA">Data</SelectItem>
                      <SelectItem value="Vencida">Vencida</SelectItem>
                      <SelectItem value="Revisão de Ato">Revisão de Ato</SelectItem>
                    </SelectContent>
                  </Select>

                    <Input
                      id={`prazoProcesso-${lineIndex}`}
                      type="date"
                      value={getPrazoMode(line.prazoProcesso) === "DATA" ? line.prazoProcesso : ""}
                      onChange={(event) => updateProcessoLineField(lineIndex, "prazoProcesso", event.target.value)}
                      disabled={fieldDisabled || getPrazoMode(line.prazoProcesso) !== "DATA"}
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
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={addProcessoLine} disabled={fieldDisabled}>
              Adicionar Linha
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={`order-[40] border-l-4 border-l-secondary shadow-md ${shouldShowSection("fines") ? "" : "hidden"}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-primary">
            <AlertCircle className="w-5 h-5" />
            Multas
          </CardTitle>
          {renderSectionSubmit()}
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          {multaBlocks.map((block, index) => {
            const multaDetailLines = getMultaDetailLines(block)

            return (
              <div key={`multa-block-${index}`} className="space-y-3 rounded-xl border border-border bg-slate-50/60 p-4">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
                    <div className="flex items-center gap-2 xl:pb-2">
                      <span className="text-sm font-semibold uppercase text-primary">PLACA</span>
                    <span className="rounded-md bg-primary px-2.5 py-1 text-sm font-bold text-primary-foreground shadow-sm">
                      {block.placa?.trim() || `${index + 1}`}
                    </span>
                  </div>

                    <div className="space-y-2">
                      <Label htmlFor={`placa-${index}`}>PLACA</Label>
                    <Input
                      id={`placa-${index}`}
                      value={block.placa}
                      onChange={(event) => updateMultaBlockField(index, "placa", event.target.value)}
                      disabled={fieldDisabled}
                      className="uppercase"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex min-h-10 items-center gap-2 pt-6">
                      <Checkbox
                        id={`placaProprietario-${index}`}
                        checked={block.placaProprietario === "sim"}
                        onCheckedChange={(checked) => updateMultaBlockProprietario(index, checked === true)}
                        disabled={fieldDisabled}
                      />
                      <Label htmlFor={`placaProprietario-${index}`} className="cursor-pointer">
                        Não é de terceiros
                      </Label>
                    </div>
                    {block.placaProprietario !== "sim" ? (
                      <div className="space-y-2">
                        <Label htmlFor={`cpfProprietario-${index}`}>CPF</Label>
                        <Input
                          id={`cpfProprietario-${index}`}
                          value={block.cpfProprietario}
                          onChange={(event) => updateMultaBlockField(index, "cpfProprietario", event.target.value)}
                          disabled={fieldDisabled}
                          placeholder="000.000.000-00"
                        />
                      </div>
                    ) : null}
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

                  <div className="flex items-end justify-start gap-2 xl:justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={addMultaBlock} disabled={fieldDisabled}>
                      Adicionar Outra Placa
                    </Button>
                    {multaBlocks.length > 1 ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => removeMultaBlock(index)} disabled={fieldDisabled}>
                        Remover
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">

                  {multaDetailLines.map((line, lineIndex) => (
                    <div
                      key={`multa-detail-${index}-${lineIndex}`}
                      className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-background p-3 xl:grid-cols-[170px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_250px_auto]"
                    >
                      <div className="space-y-2">
                        <Label htmlFor={`instanciaMulta-${index}-${lineIndex}`} className="flex min-h-8 items-end">
                          Instancia da Multa
                        </Label>
                        <MultiSelectInstancia
                          id={`instanciaMulta-${index}-${lineIndex}`}
                          value={line.instanciaMulta}
                          options={INSTANCIA_MULTA_OPTIONS}
                          onChange={(value) => updateMultaDetailLineField(index, lineIndex, "instanciaMulta", value)}
                          disabled={fieldDisabled}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`autoDetran-${index}-${lineIndex}`} className="flex min-h-8 items-end">
                          Auto DETRAN
                        </Label>
                        <Input
                          id={`autoDetran-${index}-${lineIndex}`}
                          value={line.autoDetran}
                          onChange={(event) => updateMultaDetailLineField(index, lineIndex, "autoDetran", event.target.value)}
                          disabled={fieldDisabled}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`autoRenainf-${index}-${lineIndex}`} className="flex min-h-8 items-end">
                          Auto RENAINF
                        </Label>
                        <Input
                          id={`autoRenainf-${index}-${lineIndex}`}
                          value={line.autoRenainf}
                          onChange={(event) => updateMultaDetailLineField(index, lineIndex, "autoRenainf", event.target.value)}
                          disabled={fieldDisabled}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`tipoMulta-${index}-${lineIndex}`} className="flex min-h-8 items-end">
                          Tipo de Multa
                        </Label>
                        <Input
                          id={`tipoMulta-${index}-${lineIndex}`}
                          value={line.tipoMulta}
                          onChange={(event) => updateMultaDetailLineField(index, lineIndex, "tipoMulta", event.target.value)}
                          disabled={fieldDisabled}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`prazoMulta-${index}-${lineIndex}`} className="flex min-h-8 items-end">
                          Prazo
                        </Label>
                        <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
                          <Select
                            value={getPrazoMode(line.prazoMulta)}
                            onValueChange={(value) =>
                              updateMultaDetailLineField(
                                index,
                                lineIndex,
                                "prazoMulta",
                                getPrazoValue(line.prazoMulta, value)
                              )
                            }
                            disabled={fieldDisabled}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DATA">Data</SelectItem>
                              <SelectItem value="Vencida">Vencida</SelectItem>
                              <SelectItem value="Revisão de Ato">Revisão de Ato</SelectItem>
                            </SelectContent>
                          </Select>

                          <Input
                            id={`prazoMulta-${index}-${lineIndex}`}
                            type="date"
                            value={getPrazoMode(line.prazoMulta) === "DATA" ? line.prazoMulta : ""}
                            onChange={(event) => updateMultaDetailLineField(index, lineIndex, "prazoMulta", event.target.value)}
                            disabled={fieldDisabled || getPrazoMode(line.prazoMulta) !== "DATA"}
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

                  <div className="flex justify-end pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => addMultaDetailLine(index)} disabled={fieldDisabled}>
                      Adicionar Linha
                    </Button>
                  </div>
                </div>

              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card className={`order-[60] border-l-4 border-l-muted shadow-md ${shouldShowSection("notes") ? "" : "hidden"}`}>
        <CardHeader className="pb-4">
          <CardTitle className="text-primary">Observações Adicionais</CardTitle>
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

      <Card className={`order-[65] border-l-4 border-l-primary shadow-md ${shouldShowSection("clause") ? "" : "hidden"}`}>
        <CardHeader className="pb-4">
          <CardTitle className="text-primary">Clausula Adicional</CardTitle>
          {renderSectionSubmit()}
        </CardHeader>
        <CardContent>
          <Textarea
            id="clausulaAdicional"
            name="clausulaAdicional"
            value={values.clausulaAdicional}
            onChange={(event) => setField("clausulaAdicional", event.target.value)}
            disabled={fieldDisabled}
            className="min-h-[120px]"
            placeholder="Digite uma clausula adicional para aparecer no contrato..."
          />
        </CardContent>
      </Card>

      {showActions && (onCancelEdit || onBack || !showInlineSubmit) && (
        <div className="order-[70] flex flex-col sm:flex-row gap-4 justify-center pt-2">
          {onCancelEdit && (
            <Button type="button" variant="outline" className="px-8 py-6 text-lg" onClick={onCancelEdit} disabled={loading}>
              Cancelar
            </Button>
          )}
          {onBack && (
            <Button type="button" variant="outline" className="px-8 py-6 text-lg" onClick={onBack} disabled={loading}>
              {backLabel}
            </Button>
          )}
          {!showInlineSubmit ? (
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold shadow-lg"
              onClick={() => void onSubmit?.()}
              disabled={loading || readOnly}
            >
              {submitContent}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}
