'use client'

import * as React from 'react'

import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group'

// Aceita "," ou "." como separador decimal digitado pelo usuário
function parseAmount(text: string): number {
  const raw = text.trim().replace(/[^\d,.-]/g, '')
  if (!raw) return 0

  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw
  const amount = Number.parseFloat(normalized)
  return Number.isFinite(amount) ? Math.max(amount, 0) : 0
}

// Sempre exibe com vírgula e duas casas decimais (ex.: "500,00")
function formatAmount(amount: number): string {
  return amount.toFixed(2).replace('.', ',')
}

function CurrencyField({
  id,
  name,
  value,
  onChange,
  disabled,
  readOnly,
  required,
  className,
}: {
  id?: string
  name?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  className?: string
}) {
  const [text, setText] = React.useState(() => (value.trim() ? formatAmount(parseAmount(value)) : ''))

  React.useEffect(() => {
    setText(value.trim() ? formatAmount(parseAmount(value)) : '')
  }, [value])

  const commitText = (raw: string) => {
    if (!raw.trim()) {
      onChange('')
      setText('')
      return
    }
    const formatted = formatAmount(parseAmount(raw))
    onChange(formatted)
    setText(formatted)
  }

  return (
    <InputGroup className={className}>
      <InputGroupAddon>
        <InputGroupText>R$</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        name={name}
        value={text}
        placeholder="0,00"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        onChange={(event) => setText(event.target.value)}
        onBlur={(event) => commitText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commitText(event.currentTarget.value)
          }
        }}
      />
    </InputGroup>
  )
}

export { CurrencyField }
