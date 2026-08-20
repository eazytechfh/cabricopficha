type DocumentTemplatePdfProps = {
  title: string
  content: string
  renderTitle?: boolean
}

export function DocumentTemplatePdf({ title, content, renderTitle = true }: DocumentTemplatePdfProps) {
  return (
    <div style={{ width: 980, background: "#ffffff", color: "#111827", fontFamily: "Arial, sans-serif" }}>
      <section data-pdf-section="true" style={{ padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <img
            src="/logo.png"
            alt="CABRICOP"
            crossOrigin="anonymous"
            style={{ maxWidth: 220, width: "100%", height: "auto", objectFit: "contain" }}
          />
        </div>
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
