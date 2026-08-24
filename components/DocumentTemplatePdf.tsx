type DocumentTemplatePdfProps = {
  title: string
  content: string
  renderTitle?: boolean
}

export function DocumentTemplatePdf({ title, content, renderTitle = true }: DocumentTemplatePdfProps) {
  return (
    <div style={{ width: 980, background: "#ffffff", color: "#111827", fontFamily: "Arial, sans-serif" }}>
      <section data-pdf-section="true" style={{ padding: "0 32px 32px" }}>
        {renderTitle ? (
          <h1 style={{ margin: "0 0 24px", textAlign: "center", fontSize: 22, fontWeight: 800, textTransform: "uppercase" }}>
            {title}
          </h1>
        ) : null}
        <div
          className="document-rich-text"
          style={{ fontSize: 15, lineHeight: 1.55, textAlign: "justify" }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </section>
    </div>
  )
}
