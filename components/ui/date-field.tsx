'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { format, isValid, parse } from 'date-fns'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const DISPLAY_FORMAT = 'dd/MM/yyyy'

function isoToDate(iso: string): Date | undefined {
  if (!iso) return undefined
  const parsed = parse(iso, 'yyyy-MM-dd', new Date())
  return isValid(parsed) ? parsed : undefined
}

function isoToDisplay(iso: string): string {
  const date = isoToDate(iso)
  return date ? format(date, DISPLAY_FORMAT) : ''
}

// Aceita colar/digitar em dd/MM/yyyy, dd-MM-yyyy ou yyyy-MM-dd
function parseTypedDate(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed) return ''

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    const date = parse(trimmed, 'yyyy-MM-dd', new Date())
    return isValid(date) ? trimmed : null
  }

  const brMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (brMatch) {
    const [, day, month, yearRaw] = brMatch
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw
    const normalized = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
    const date = parse(normalized, 'dd/MM/yyyy', new Date())
    return isValid(date) ? format(date, 'yyyy-MM-dd') : null
  }

  return null
}

// Insere "/" automaticamente enquanto o usuário digita apenas números
function maskDateDigits(digits: string): string {
  const day = digits.slice(0, 2)
  const month = digits.slice(2, 4)
  const year = digits.slice(4, 8)
  let masked = day
  if (month) masked += `/${month}`
  if (year) masked += `/${year}`
  return masked
}

function DateField({
  id,
  name,
  value,
  onChange,
  disabled,
  required,
  className,
  'aria-required': ariaRequired,
}: {
  id?: string
  name?: string
  value: string
  onChange: (isoValue: string) => void
  disabled?: boolean
  required?: boolean
  className?: string
  'aria-required'?: boolean
}) {
  const [text, setText] = React.useState(() => isoToDisplay(value))
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    setText(isoToDisplay(value))
  }, [value])

  const commitText = (raw: string) => {
    const parsed = parseTypedDate(raw)
    if (parsed === null) {
      // não reconhecido: mantém o texto para o usuário corrigir, sem alterar o valor salvo
      return
    }
    onChange(parsed)
    setText(isoToDisplay(parsed))
  }

  return (
    <div className={cn('relative flex items-center', className)}>
      <Input
        id={id}
        name={name}
        value={text}
        placeholder="dd/mm/aaaa"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        disabled={disabled}
        required={required}
        aria-required={ariaRequired}
        className="pr-9"
        onChange={(event) => {
          const raw = event.target.value
          const isDigitsOnly = /^[\d/-]*$/.test(raw)

          if (!isDigitsOnly) {
            setText(raw)
            return
          }

          const digits = raw.replace(/\D/g, '').slice(0, 8)
          const masked = maskDateDigits(digits)
          setText(masked)

          if (digits.length === 8) {
            commitText(masked)
          } else if (digits.length === 0) {
            onChange('')
          }
        }}
        onBlur={(event) => commitText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commitText(event.currentTarget.value)
          }
        }}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData('text')
          if (parseTypedDate(pasted) !== null) {
            event.preventDefault()
            setText(pasted.trim())
            commitText(pasted)
          }
        }}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="absolute right-0 h-9 w-9 text-muted-foreground hover:text-foreground"
            aria-label="Abrir calendário"
          >
            <CalendarIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={isoToDate(value)}
            captionLayout="dropdown"
            onSelect={(date) => {
              if (!date) return
              const iso = format(date, 'yyyy-MM-dd')
              onChange(iso)
              setText(isoToDisplay(iso))
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export { DateField }
