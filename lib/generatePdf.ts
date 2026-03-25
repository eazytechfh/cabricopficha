async function waitForImages(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll("img"))

  await Promise.all(
    images.map((image) => {
      if (image.complete) {
        return Promise.resolve()
      }

      return new Promise<void>((resolve) => {
        const done = () => resolve()
        image.addEventListener("load", done, { once: true })
        image.addEventListener("error", done, { once: true })
      })
    })
  )
}

export async function generatePdf(element: HTMLElement, filename: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf/dist/jspdf.es.min.js"),
  ])

  if ("fonts" in document) {
    await document.fonts.ready
  }

  const iframe = document.createElement("iframe")
  iframe.style.position = "fixed"
  iframe.style.right = "0"
  iframe.style.bottom = "0"
  iframe.style.width = "1200px"
  iframe.style.height = "1600px"
  iframe.style.opacity = "0"
  iframe.style.pointerEvents = "none"
  iframe.style.border = "0"
  iframe.style.zIndex = "-1"
  document.body.appendChild(iframe)

  const iframeDocument = iframe.contentDocument
  if (!iframeDocument) {
    iframe.remove()
    throw new Error("Nao foi possivel inicializar o documento do PDF.")
  }

  iframeDocument.open()
  iframeDocument.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Ficha PDF</title>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #000000;
            font-family: Arial, sans-serif;
          }
          * {
            box-sizing: border-box;
          }
        </style>
      </head>
      <body></body>
    </html>
  `)
  iframeDocument.close()

  const mount = iframeDocument.createElement("div")
  mount.style.width = "1200px"
  mount.style.padding = "24px"
  mount.style.background = "#ffffff"
  iframeDocument.body.appendChild(mount)

  const clone = element.cloneNode(true) as HTMLElement
  mount.appendChild(clone)

  await waitForImages(clone)
  await new Promise((resolve) => setTimeout(resolve, 250))

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: clone.scrollWidth,
      windowHeight: clone.scrollHeight,
      imageTimeout: 0,
    })

    const imageData = canvas.toDataURL("image/png")
    const pdf = new jsPDF("p", "mm", "a4")
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imageWidth = pageWidth
    const imageHeight = (canvas.height * imageWidth) / canvas.width

    let heightLeft = imageHeight
    let position = 0

    pdf.addImage(imageData, "PNG", 0, position, imageWidth, imageHeight)
    heightLeft -= pageHeight

    while (heightLeft > 0) {
      position = heightLeft - imageHeight
      pdf.addPage()
      pdf.addImage(imageData, "PNG", 0, position, imageWidth, imageHeight)
      heightLeft -= pageHeight
    }

    pdf.save(filename)
  } finally {
    iframe.remove()
  }
}
