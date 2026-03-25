"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Calendar, User, CreditCard, FileText, AlertCircle, Plus, X, Phone, Building2, CheckCircle2, XCircle } from "lucide-react"

type PhoneEntry = {
  id: number
  value: string
}

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error'

function parseCurrencyInput(value: string) {
  const normalized = Number.parseFloat(value)
  return Number.isFinite(normalized) ? normalized : 0
}

export default function SalesForm() {
  const [phones, setPhones] = useState<PhoneEntry[]>([{ id: 1, value: "" }])
  const [formaPagamento, setFormaPagamento] = useState("")
  const [banco, setBanco] = useState("")
  const [valorTotal, setValorTotal] = useState("")
  const [valorEntrada, setValorEntrada] = useState("")
  const [showOutroBanco, setShowOutroBanco] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle')
  const [statusMessage, setStatusMessage] = useState("")
  const [observacoes, setObservacoes] = useState("")
  const valorRestante = Math.max(parseCurrencyInput(valorTotal) - parseCurrencyInput(valorEntrada), 0)

  const addPhone = () => {
    const newId = phones.length > 0 ? Math.max(...phones.map(p => p.id)) + 1 : 1
    setPhones([...phones, { id: newId, value: "" }])
  }

  const removePhone = (id: number) => {
    if (phones.length > 1) {
      setPhones(phones.filter(p => p.id !== id))
    }
  }

  const updatePhone = (id: number, value: string) => {
    setPhones(phones.map(p => p.id === id ? { ...p, value } : p))
  }

  const handleBancoChange = (value: string) => {
    setBanco(value)
    setShowOutroBanco(value === "outros")
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitStatus('loading')
    setStatusMessage('')

    const formData = new FormData(e.currentTarget)

    const data = {
      // Data do Contrato
      dataContrato: formData.get('dataContrato'),
      prazoServico: formData.get('prazoServico'),

      // Dados do Cliente
      nomeCliente: formData.get('nomeCliente'),
      terceiros: formData.get('terceiros'),
      telefones: phones.map(p => p.value).filter(v => v).join(', '),
      endereco: formData.get('endereco'),
      cep: formData.get('cep'),
      cpfCnpj: formData.get('cpfCnpj'),
      cnh: formData.get('cnh'),
      dataNascimento: formData.get('dataNascimento'),
      dataPrimeiraCnh: formData.get('dataPrimeiraCnh'),
      email: formData.get('email'),

      // Dados do Consultor
      nomeConsultor: formData.get('nomeConsultor'),
      origem: formData.get('origem'),
      sne: formData.get('sne'),

      // Dados de Pagamento
      formaPagamento,
      banco: showOutroBanco ? formData.get('outroBanco') : banco,
      valorTotal: formData.get('valorTotal'),
      valorEntrada: formData.get('valorEntrada'),
      valorRestante,

      // Sobre o Processo
      instanciaProcesso: formData.get('instanciaProcesso'),
      tipoProcesso: formData.get('tipoProcesso'),
      numeroProcesso: formData.get('numeroProcesso'),
      prazoProcesso: formData.get('prazoProcesso'),
      vistoJuridico: formData.get('vistoJuridico'),

      // Mais Informações (Multas)
      instanciaMulta: formData.get('instanciaMulta'),
      autoDetran: formData.get('autoDetran'),
      autoRenainf: formData.get('autoRenainf'),
      tipoMulta: formData.get('tipoMulta'),
      placa: formData.get('placa'),
      renavam: formData.get('renavam'),
      prazoMulta: formData.get('prazoMulta'),
      vistoJuridicoMulta: formData.get('vistoJuridicoMulta'),

      // Observações
      observacoes,

      // Timestamp
      dataEnvio: new Date().toISOString(),
    }

    const formElement = e.currentTarget

    try {
      const response = await fetch('/api/submit-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setSubmitStatus('success')
        setStatusMessage('Ficha de venda salva com sucesso!')
        // Reset form
        formElement.reset()
        setPhones([{ id: 1, value: "" }])
        setFormaPagamento("")
        setBanco("")
        setValorTotal("")
        setValorEntrada("")
        setShowOutroBanco(false)
        setObservacoes("")
      } else {
        const result = await response.json()
        setSubmitStatus('error')
        setStatusMessage(result.error || 'Erro ao salvar. Tente novamente.')
      }
    } catch (err) {
      console.error('[v0] Erro no fetch:', err)
      setSubmitStatus('error')
      setStatusMessage('Erro de conexão. Verifique sua internet e tente novamente.')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-6 px-4 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-4">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/cabricop%20logo-1cD17xGKKJoV5D9u0LLa04LKf9zkqK.png"
            alt="CABRICOP - Especialistas em Defesas de Trânsito"
            className="h-12 md:h-16 w-auto"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-2">Ficha de Venda</h2>
          <p className="text-muted-foreground">Preencha todos os campos obrigatórios para registrar a venda</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Data do Contrato */}
          <Card className="border-l-4 border-l-primary shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Calendar className="w-5 h-5" />
                Data do Contrato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataContrato">Data do Contrato</Label>
                  <Input type="date" id="dataContrato" name="dataContrato" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prazoServico">Prazo</Label>
                  <Input type="date" id="prazoServico" name="prazoServico" required />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dados do Cliente */}
          <Card className="border-l-4 border-l-primary shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-primary">
                <User className="w-5 h-5" />
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nomeCliente">Nome Completo</Label>
                  <Input id="nomeCliente" name="nomeCliente" placeholder="Digite o nome completo" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="terceiros">Terceiros</Label>
                  <Input id="terceiros" name="terceiros" placeholder="Informar terceiros (se houver)" />
                </div>
              </div>

              {/* Telefones Dinâmicos */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefone(s)
                </Label>
                <div className="space-y-2">
                  {phones.map((phone, index) => (
                    <div key={phone.id} className="flex gap-2">
                      <Input
                        type="tel"
                        placeholder={`Telefone ${index + 1}`}
                        value={phone.value}
                        onChange={(e) => updatePhone(phone.id, e.target.value)}
                        required={index === 0}
                      />
                      {phones.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removePhone(phone.id)}
                          className="shrink-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPhone}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Telefone
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input id="endereco" name="endereco" placeholder="Rua, número, bairro, cidade, estado" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" name="cep" placeholder="00000-000" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
                  <Input id="cpfCnpj" name="cpfCnpj" placeholder="Digite CPF ou CNPJ" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnh">CNH</Label>
                  <Input id="cnh" name="cnh" placeholder="Número da CNH" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                  <Input type="date" id="dataNascimento" name="dataNascimento" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataPrimeiraCnh">Data da 1ª CNH</Label>
                  <Input type="date" id="dataPrimeiraCnh" name="dataPrimeiraCnh" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input type="email" id="email" name="email" placeholder="email@exemplo.com" required />
              </div>
            </CardContent>
          </Card>

          {/* Dados do Consultor */}
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
                  <Input id="nomeConsultor" name="nomeConsultor" placeholder="Nome do consultor" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="origem">Origem</Label>
                  <Input id="origem" name="origem" placeholder="Origem do lead" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sne">SNE</Label>
                  <Input id="sne" name="sne" placeholder="SNE" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dados de Pagamento */}
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
                  <Select value={formaPagamento} onValueChange={setFormaPagamento} required>
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
                  <Select value={banco} onValueChange={handleBancoChange} required>
                    <SelectTrigger id="banco">
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asaas">ASAAS</SelectItem>
                      <SelectItem value="rede">Rede</SelectItem>
                      <SelectItem value="itau">Itaú</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {showOutroBanco && (
                <div className="space-y-2">
                  <Label htmlFor="outroBanco">Nome do Banco</Label>
                  <Input id="outroBanco" name="outroBanco" placeholder="Digite o nome do banco" required />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valorTotal">Valor Total</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      id="valorTotal"
                      name="valorTotal"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      className="pl-10"
                      value={valorTotal}
                      onChange={(e) => setValorTotal(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valorEntrada">Valor de Entrada</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                    <Input
                      id="valorEntrada"
                      name="valorEntrada"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      className="pl-10"
                      value={valorEntrada}
                      onChange={(e) => setValorEntrada(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valorRestante">Valor Restante</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                  <Input
                    id="valorRestante"
                    name="valorRestante"
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-10"
                    value={valorRestante.toFixed(2)}
                    readOnly
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sobre o Processo */}
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
                  <Label htmlFor="instanciaProcesso">Instância do Processo</Label>
                  <Input id="instanciaProcesso" name="instanciaProcesso" placeholder="Ex: 1ª Instância, 2ª Instância" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipoProcesso">Tipo de Processo</Label>
                  <Input id="tipoProcesso" name="tipoProcesso" placeholder="Tipo do processo" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numeroProcesso">Nº do Processo</Label>
                  <Input id="numeroProcesso" name="numeroProcesso" placeholder="Número do processo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prazoProcesso">Prazo</Label>
                  <Input type="date" id="prazoProcesso" name="prazoProcesso" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vistoJuridico">Visto Jurídico</Label>
                  <Input id="vistoJuridico" name="vistoJuridico" placeholder="Visto jurídico" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mais Informações (Multas) */}
          <Card className="border-l-4 border-l-secondary shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-primary">
                <AlertCircle className="w-5 h-5" />
                Mais Informações (Multas)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instanciaMulta">Instância da Multa</Label>
                  <Input id="instanciaMulta" name="instanciaMulta" placeholder="Ex: JARI, CETRAN" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="autoDetran">Auto DETRAN</Label>
                  <Input id="autoDetran" name="autoDetran" placeholder="Número do auto DETRAN" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="autoRenainf">Auto RENAINF</Label>
                  <Input id="autoRenainf" name="autoRenainf" placeholder="Número do auto RENAINF" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipoMulta">Tipo de Multa</Label>
                  <Input id="tipoMulta" name="tipoMulta" placeholder="Tipo da multa" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="placa">Placa</Label>
                  <Input id="placa" name="placa" placeholder="AAA-0000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="renavam">RENAVAM</Label>
                  <Input id="renavam" name="renavam" placeholder="Número do RENAVAM" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prazoMulta">Prazo</Label>
                  <Input type="date" id="prazoMulta" name="prazoMulta" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vistoJuridicoMulta">Visto Jurídico</Label>
                  <Input id="vistoJuridicoMulta" name="vistoJuridicoMulta" placeholder="Visto jurídico" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card className="border-l-4 border-l-muted shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-primary">
                Observações Adicionais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Digite observações adicionais sobre a venda..."
                className="min-h-[100px]"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Status Message */}
          {submitStatus !== 'idle' && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${submitStatus === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                submitStatus === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                  'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
              {submitStatus === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
              {submitStatus === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
              {submitStatus === 'loading' && <Spinner className="w-5 h-5" />}
              <span>{submitStatus === 'loading' ? 'Salvando dados...' : statusMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              type="button"
              variant="outline"
              className="px-8 py-6 text-lg"
              onClick={() => {
                const form = document.querySelector('form') as HTMLFormElement
                form?.reset()
                setPhones([{ id: 1, value: "" }])
                setFormaPagamento("")
                setBanco("")
                setValorTotal("")
                setValorEntrada("")
                setShowOutroBanco(false)
                setObservacoes("")
                setSubmitStatus('idle')
                setStatusMessage('')
              }}
              disabled={submitStatus === 'loading'}
            >
              Limpar Formulário
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold shadow-lg"
              disabled={submitStatus === 'loading'}
            >
              {submitStatus === 'loading' ? (
                <>
                  <Spinner className="w-5 h-5 mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar Ficha de Venda'
              )}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-border text-center text-muted-foreground text-sm">
          <p>CABRICOP - Especialistas em Defesas de Trânsito</p>
          <p className="mt-1">Praça Olavo Bilac Nº28, Sala 1816 - Centro, Rio de Janeiro/RJ</p>
          <p className="mt-1">© {new Date().getFullYear()} CABRICOP. Todos os direitos reservados.</p>
        </footer>
      </main>
    </div>
  )
}
