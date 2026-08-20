type EditableContent = Pick<HTMLElement, "innerHTML">

export function syncEditableContent(editor: EditableContent, content: string) {
  if (editor.innerHTML === content) return false
  editor.innerHTML = content
  return true
}

export function captureEditorSelection(editor: HTMLElement, selection: Selection | null) {
  if (!selection || selection.rangeCount === 0) return null

  const range = selection.getRangeAt(0)
  const container = range.commonAncestorContainer
  if (container !== editor && !editor.contains(container)) return null

  return range.cloneRange()
}

export function getEditorSelectionFormatting(editor: HTMLElement, selection: Selection | null) {
  const range = captureEditorSelection(editor, selection)
  if (!range) return null

  const node = selection?.focusNode ?? range.commonAncestorContainer
  const element = node === editor ? editor : node.nodeType === 1 ? (node as HTMLElement) : node.parentElement
  if (!element) return null

  const computedStyle = editor.ownerDocument.defaultView?.getComputedStyle(element)
  if (!computedStyle) return null

  const fontFamily = computedStyle.fontFamily
    .split(",")[0]
    .trim()
    .replace(/^["']|["']$/g, "")
  const parsedFontSize = Number.parseFloat(computedStyle.fontSize)

  return {
    fontFamily,
    fontSize: Number.isFinite(parsedFontSize) ? String(parsedFontSize) : "",
  }
}

export function restoreEditorSelection(
  editor: HTMLElement,
  range: Range | null,
  selection: Selection | null
) {
  editor.focus()
  if (!range || !selection) return false

  const container = range.commonAncestorContainer
  if (container !== editor && !editor.contains(container)) return false

  selection.removeAllRanges()
  selection.addRange(range)
  return true
}

export function runEditorCommand(
  editor: HTMLElement,
  command: string,
  value?: string,
  savedRange: Range | null = null
) {
  const selection = editor.ownerDocument.defaultView?.getSelection() ?? null
  restoreEditorSelection(editor, savedRange, selection)
  const executed = editor.ownerDocument.execCommand(command, false, value)

  return {
    content: editor.innerHTML,
    executed,
    selection: captureEditorSelection(editor, selection),
  }
}

export function runEditorFontSizeCommand(
  editor: HTMLElement,
  fontSize: string,
  savedRange: Range | null = null
) {
  const parsedFontSize = Number.parseFloat(fontSize.replace(",", "."))
  const selection = editor.ownerDocument.defaultView?.getSelection() ?? null

  if (!Number.isFinite(parsedFontSize)) {
    return {
      content: editor.innerHTML,
      executed: false,
      selection: captureEditorSelection(editor, selection),
      fontSize: "",
    }
  }

  const safeFontSize = Math.min(96, Math.max(6, parsedFontSize))
  const normalizedFontSize = Number.isInteger(safeFontSize) ? String(safeFontSize) : String(Number(safeFontSize.toFixed(2)))

  restoreEditorSelection(editor, savedRange, selection)
  editor.ownerDocument.execCommand("styleWithCSS", false, "false")
  const executed = editor.ownerDocument.execCommand("fontSize", false, "7")

  editor.querySelectorAll<HTMLFontElement>('font[size="7"]').forEach((font) => {
    font.style.fontSize = `${normalizedFontSize}px`
    font.removeAttribute("size")
  })

  return {
    content: editor.innerHTML,
    executed,
    selection: captureEditorSelection(editor, selection),
    fontSize: normalizedFontSize,
  }
}
