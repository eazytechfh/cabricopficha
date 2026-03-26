"use client"

import { useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import type { FichaFormValues } from "@/lib/ficha-types"
import { parseCurrency } from "@/lib/ficha-utils"
import { Calendar, User, CreditCard, FileText, AlertCircle, Building2 } from "lucide-react"

type FichaFormProps = {
  values: FichaFormValues
  onChange: (values: FichaFormValues) => void
  onSubmit?: () => void | Promise<void>
  submitLabel?: string
  loading?: boolean
  readOnly?: boolean
  showActions?: boolean
  onCancelEdit?: () => void
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
  readOnly = false,
  showActions = true,
  onCancelEdit,
}: FichaFormProps) {
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)

  useEffect(() => {
    const canvas = signatureCanvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.lineWidth = 2
    context.lineCap = "round"
    context.strokeStyle = "#0f172a"

    if (values.assinaturaVistoJuridico) {
      const image = new Image()
      image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height)
      image.src = values.assinaturaVistoJuridico
    }
  }, [values.assinaturaVistoJuridico])

  const setField = (field: keyof FichaFormValues, value: string) => {
    if (readOnly) return
    onChange(updateValue(values, field, value))
  }

  const startSignature = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return

    const canvas = signatureCanvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return

    const rect = canvas.getBoundingClientRect()
    const x = "touches" in event ? event.touches[0]?.clientX ?? 0 : event.clientX
    const y = "touches" in event ? event.touches[0]?.clientY ?? 0 : event.clientY

    isDrawingRef.current = true
    context.beginPath()
    context.moveTo(x - rect.left, y - rect.top)
  }

  const drawSignature = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly || !isDrawingRef.current) return

    const canvas = signatureCanvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return

    const rect = canvas.getBoundingClientRect()
    const x = "touches" in event ? event.touches[0]?.clientX ?? 0 : event.clientX
    const y = "touches" in event ? event.touches[0]?.clientY ?? 0 : event.clientY

    if ("touches" in event) event.preventDefault()

    context.lineTo(x - rect.left, y - rect.top)
    context.stroke()
  }

  const finishSignature = () => {
    if (readOnly) return

    const canvas = signatureCanvasRef.current
    if (!canvas) return
    isDrawingRef.current = false
    setField("assinaturaVistoJuridico", canvas.toDataURL("image/png"))
  }

  const clearSignature = () => {
    if (readOnly) return
    const canvas = signatureCanvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    setField("assinaturaVistoJuridico", "")
  }

  const fieldDisabled = readOnly || loading

  const renderInput = (field: keyof FichaFormValues, label: string, props?: React.ComponentProps<typeof Input>) => (
    <div className="space-y-2">
      <Label htmlFor={field}>{label}</Label>
      <Input
        id={field}
        name={field}
        value={values[field]}
        onChange={(event) => setField(field, event.target.value)}
        disabled={fieldDisabled}
        {...props}
      />
    </div>
  )

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">{renderInput("endereco", "Endereço")}</div>
            {renderInput("cep", "CEP")}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput("cpfCnpj", "CPF/CNPJ")}
            {renderInput("cnh", "CNH")}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput("dataNascimento", "Data de Nascimento", { type: "date" })}
            {renderInput("dataPrimeiraCnh", "Data da 1ª CNH", { type: "date" })}
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
            {renderInput("nomeConsultor", "Nome do Consultor")}
            {renderInput("origem", "Origem")}
            {renderInput("sne", "SNE")}
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
                  <SelectItem value="credito">Crédito</SelectItem>
                  <SelectItem value="debito">Débito</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="ted">TED</SelectItem>
                  <SelectItem value="especie">Espécie</SelectItem>
                  <SelectItem value="deposito">Depósito</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="banco">Banco</Label>
              <Select value={values.banco} onValueChange={(value) => setField("banco", value)} disabled={fieldDisabled}>
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
            {renderInput("instanciaProcesso", "Instância do Processo")}
            {renderInput("tipoProcesso", "Tipo do Processo")}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderInput("numeroProcesso", "Nº do Processo")}
            {renderInput("prazoProcesso", "Prazo", { type: "date" })}
            {renderInput("vistoJuridico", "Visto Jurídico")}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="assinaturaVistoJuridico">Assinatura Digital do Visto Jurídico</Label>
              {!readOnly && (
                <Button type="button" variant="outline" size="sm" onClick={clearSignature} disabled={loading}>
                  Limpar Assinatura
                </Button>
              )}
            </div>
            <div className="rounded-lg border border-border bg-white p-2 shadow-sm">
              <canvas
                id="assinaturaVistoJuridico"
                ref={signatureCanvasRef}
                width={900}
                height={220}
                className="h-44 w-full cursor-crosshair rounded-md bg-slate-50 touch-none"
                onMouseDown={startSignature}
                onMouseMove={drawSignature}
                onMouseUp={finishSignature}
                onMouseLeave={finishSignature}
                onTouchStart={startSignature}
                onTouchMove={drawSignature}
                onTouchEnd={finishSignature}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-secondary shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-primary">
            <AlertCircle className="w-5 h-5" />
            Mais Informações (Multas)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderInput("instanciaMulta", "Instância da Multa")}
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
            {renderInput("prazoMulta", "Prazo", { type: "date" })}
            {renderInput("vistoJuridicoMulta", "Visto Jurídico")}
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-muted shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-primary">Observações Adicionais</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={values.observacoes}
            onChange={(event) => setField("observacoes", event.target.value)}
            disabled={fieldDisabled}
            className="min-h-[120px]"
            placeholder="Digite observações adicionais sobre a venda..."
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
                Salvando...
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
