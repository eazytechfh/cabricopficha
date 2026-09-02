const EMPTY_LIST_ITEM_SOURCE = String.raw`<li\b[^>]*>(?:\s|&nbsp;|&#160;|&#xA0;|<br\s*\/?>)*<\/li>`
const LIST_SPACER_HTML = '<li data-list-spacer="true"><br></li>'

export function normalizeDocumentListSpacing(content: string) {
  return String(content || "").replace(new RegExp(EMPTY_LIST_ITEM_SOURCE, "gi"), LIST_SPACER_HTML)
}

function isEmptyListItem(item: HTMLElement) {
  return new RegExp(EMPTY_LIST_ITEM_SOURCE, "i").test(`<li>${item.innerHTML}</li>`)
}

export function convertEmptyListItemToSpacer(editor: HTMLElement) {
  const selection = editor.ownerDocument.defaultView?.getSelection() ?? null
  const node = selection?.focusNode
  const element = node?.nodeType === 1 ? (node as HTMLElement) : node?.parentElement
  const item = element?.closest("li") as HTMLLIElement | null

  if (!selection || !item || !editor.contains(item) || !isEmptyListItem(item)) return false

  const spacer = editor.ownerDocument.createElement("li")
  spacer.dataset.listSpacer = "true"
  spacer.innerHTML = "<br>"
  item.replaceWith(spacer)

  const range = editor.ownerDocument.createRange()
  range.selectNodeContents(spacer)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)

  return true
}
