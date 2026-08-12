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
