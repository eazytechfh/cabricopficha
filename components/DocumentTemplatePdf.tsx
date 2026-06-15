type DocumentTemplatePdfProps = {
  title: string
  content: string
}

export function DocumentTemplatePdf({ title, content }: DocumentTemplatePdfProps) {
  return (
    <div style={{ width: 980, background: "#ffffff", color: "#111827", fontFamily: "Arial, sans-serif" }}>
      <section data-pdf-section="true" style={{ padding: 32 }}>
        <h1 style={{ margin: "0 0 24px", textAlign: "center", fontSize: 22, fontWeight: 800, textTransform: "uppercase" }}>
          {title}
        </h1>
        <div style={{ whiteSpace: "pre-wrap", fontSize: 15, lineHeight: 1.55, textAlign: "justify" }}>
          {content}
        </div>
      </section>
    </div>
  )
}
