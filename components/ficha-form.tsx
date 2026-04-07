"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { CONSULTOR_OPTIONS, INSTANCIA_MULTA_OPTIONS, INSTANCIA_PROCESSO_OPTIONS, ORIGEM_OPTIONS, SNE_OPTIONS, TIPO_PROCESSO_OPTIONS } from "@/lib/ficha-options"
import type { FichaFormValues } from "@/lib/ficha-types"
import { parseCurrency } from "@/lib/ficha-utils"
import { Calendar, User, CreditCard, FileText, AlertCircle, Building2 } from "lucide-react"

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
}

function updateValue(
  values: FichaFormValues,
  field: keyof FichaFormValues,
  value: string
): FichaFormValues {
  const next = {
    ...values,
    [field]: value,
  }

  if (field === "valorTotal" || field === "valorEntrada") {
    const restante = Math.max(parseCurrency(next.valorTotal) - parseCurrency(next.valorEntrada), 0)
    next.valorRestante = restante.toFixed(2)
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
}: FichaFormProps) {
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastFetchedCepRef = useRef("")
  const [cepLookupMessage, setCepLookupMessage] = useState("")
  const [cepLookupLoading, setCepLookupLoading] = useState(false)
  const [enderecoRua, setEnderecoRua] = useState(values.endereco)
  const [enderecoNumero, setEnderecoNumero] = useState("")
  const [enderecoComplemento, setEnderecoComplemento] = useState("")

  useEffect(() => {
    const canvas = signatureCanvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.lineWidth = 2
    context.lineCap = "round"
    context.strokeStyle = "#0f172a"
  }, [])

  useEffect(() => {
    const enderecoAtual = values.endereco || ""
    const numeroMatch = enderecoAtual.match(/,\s*(?:N[uú]mero\s*)?(\d+[^,]*)/i)
    const complementoMatch = enderecoAtual.match(/,\s*Complemento\s+(.+)$/i)

    setEnderecoRua(enderecoAtual.split(",")[0]?.trim() || "")
    setEnderecoNumero(numeroMatch?.[1]?.trim() || "")
    setEnderecoComplemento(complementoMatch?.[1]?.trim() || "")
  }, [values.endereco])

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

        const enderecoParts = [payload.logradouro, payload.bairro, payload.localidade, payload.uf]
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

  const fieldDisabled = readOnly || loading
  const selectedInstanciasProcesso = values.instanciaProcesso
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)

  const toggleInstanciaProcesso = (option: string, checked: boolean) => {
    const nextValues = checked
      ? [...selectedInstanciasProcesso, option]
      : selectedInstanciasProcesso.filter((item) => item !== option)

    setField("instanciaProcesso", nextValues.join("; "))
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
        <CardContent>
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
            {renderInput("telefones", "Telefone(s)")}
            {renderInput("email", "E-mail", { type: "email" })}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput("cpfCnpj", "CPF/CNPJ")}
            {renderInput("cnh", "CNH")}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput("dataNascimento", "Data de Nascimento", { type: "date" })}
            {renderInput("dataPrimeiraCnh", "Data da 1a CNH", { type: "date" })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-secondary shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Building2 className="w-5 h-5" />
            Dados do Consultor
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-primary">
            <FileText className="w-5 h-5" />
            Sobre o Processo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Instancia do Processo</Label>
              <div className="rounded-md border border-input bg-background px-3 py-3">
                <div className="flex flex-col gap-3">
                  {INSTANCIA_PROCESSO_OPTIONS.map((option) => (
                    <label key={option} className="flex items-center gap-3 text-sm text-foreground">
                      <Checkbox
                        checked={selectedInstanciasProcesso.includes(option)}
                        disabled={fieldDisabled}
                        onCheckedChange={(checked) => toggleInstanciaProcesso(option, checked === true)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipoProcesso">Tipo do Processo</Label>
              <Select value={values.tipoProcesso || undefined} onValueChange={(value) => setField("tipoProcesso", value)} disabled={fieldDisabled}>
                <SelectTrigger id="tipoProcesso">
                  <SelectValue placeholder="Selecione o tipo do processo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_PROCESSO_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderInput("numeroProcesso", "No do Processo")}
            <div className="md:col-span-2">{renderPrazoField("prazoProcesso", "Prazo")}</div>
          </div>
          <div className="space-y-3">
            <Label htmlFor="assinaturaVistoJuridico">Assinatura Digital do Visto Juridico</Label>
            <div className="rounded-lg border border-border bg-white p-2 shadow-sm">
              <canvas
                id="assinaturaVistoJuridico"
                ref={signatureCanvasRef}
                width={900}
                height={220}
                className="h-44 w-full cursor-not-allowed rounded-md bg-slate-50 touch-none opacity-80"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-secondary shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-primary">
            <AlertCircle className="w-5 h-5" />
            Mais Informacoes (Multas)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instanciaMulta">Instancia da Multa</Label>
              <Select value={values.instanciaMulta || undefined} onValueChange={(value) => setField("instanciaMulta", value)} disabled={fieldDisabled}>
                <SelectTrigger id="instanciaMulta">
                  <SelectValue placeholder="Selecione a instancia da multa" />
                </SelectTrigger>
                <SelectContent>
                  {INSTANCIA_MULTA_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {renderInput("autoDetran", "Auto DETRAN")}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput("autoRenainf", "Auto RENAINF")}
            {renderInput("tipoMulta", "Tipo de Multa")}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput("placa", "Placa")}
            {renderInput("renavam", "RENAVAM")}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">{renderPrazoField("prazoMulta", "Prazo")}</div>
          </div>
          <div className="space-y-3">
            <Label htmlFor="assinaturaVistoJuridicoMulta">Assinatura Digital</Label>
            <div className="rounded-lg border border-border bg-white p-2 shadow-sm">
              <canvas
                id="assinaturaVistoJuridicoMulta"
                width={900}
                height={220}
                className="h-44 w-full cursor-not-allowed rounded-md bg-slate-50 touch-none opacity-80"
              />
            </div>
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
