export const DOCUMENT_EDITOR_FORMAT_COMMANDS = [
  "justifyLeft",
  "justifyCenter",
  "justifyRight",
  "justifyFull",
  "insertUnorderedList",
  "insertOrderedList",
  "outdent",
  "indent",
  "undo",
  "redo",
  "removeFormat",
] as const

export type DocumentEditorFormatCommand = (typeof DOCUMENT_EDITOR_FORMAT_COMMANDS)[number]
