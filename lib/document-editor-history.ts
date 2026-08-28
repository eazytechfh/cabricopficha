export type DocumentEditorHistoryEntry = { before: string; after: string }

export function resolveCustomEditorHistory(current: string, entry: DocumentEditorHistoryEntry, direction: "undo" | "redo") {
  const expected = direction === "undo" ? entry.after : entry.before
  return current === expected
    ? { content: direction === "undo" ? entry.before : entry.after, applied: true }
    : { content: current, applied: false }
}
