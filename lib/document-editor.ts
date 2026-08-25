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

const ALIGNMENT_VALUES: Record<string, string> = {
  justifyLeft: "left",
  justifyCenter: "center",
  justifyRight: "right",
  justifyFull: "justify",
}

const ALIGNMENT_BLOCK_SELECTOR = "p, div, li, h1, h2, h3, h4, h5, h6, blockquote"

function getCaretBlock(editor: HTMLElement, range: Range) {
  let node: Node | null = range.startContainer

  if (node === editor) {
    const childIndex = Math.min(range.startOffset, Math.max(0, editor.childNodes.length - 1))
    node = editor.childNodes[childIndex] ?? null
  }

  while (node && node !== editor) {
    const element: HTMLElement | null = node.nodeType === 1 ? node as HTMLElement : node.parentElement
    if (!element || element === editor) return null
    if (element.matches(ALIGNMENT_BLOCK_SELECTOR)) return element
    node = element.parentElement
  }

  return null
}

export function runEditorAlignmentCommand(
  editor: HTMLElement,
  command: "justifyLeft" | "justifyCenter" | "justifyRight" | "justifyFull",
  savedRange: Range | null = null
) {
  const selection = editor.ownerDocument.defaultView?.getSelection() ?? null
  restoreEditorSelection(editor, savedRange, selection)
  const range = selection?.rangeCount ? selection.getRangeAt(0) : savedRange
  const alignment = ALIGNMENT_VALUES[command]
  const intersectingBlocks = !range || range.collapsed
    ? []
    : Array.from(editor.querySelectorAll<HTMLElement>(ALIGNMENT_BLOCK_SELECTOR)).filter((block) => {
        try {
          return range.intersectsNode(block)
        } catch {
          return false
        }
      })
  const blocks = range?.collapsed
    ? [getCaretBlock(editor, range)].filter((block): block is HTMLElement => Boolean(block))
    : intersectingBlocks.filter((block) =>
        !intersectingBlocks.some((candidate) => candidate !== block && block.contains?.(candidate))
      )

  blocks.forEach((block) => {
    block.style.textAlign = alignment
  })

  if (blocks.length === 0 && range && !range.collapsed) {
    const wrapper = editor.ownerDocument.createElement("div")
    wrapper.style.textAlign = alignment
    const selectedContent = range.extractContents()
    wrapper.appendChild(selectedContent)
    range.insertNode(wrapper)
    range.selectNodeContents(wrapper)
  }

  return {
    content: editor.innerHTML,
    executed: blocks.length > 0 || Boolean(range && !range.collapsed),
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

  const safeFontSize = Math.min(48, Math.max(6, parsedFontSize))
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
