const PDF_PAGE_GAP_MM = 6
const PDF_RENDER_SCALE = 2

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

function createSliceCanvas(source: HTMLCanvasElement, offsetY: number, height: number) {
  const sliceCanvas = document.createElement("canvas")
  sliceCanvas.width = source.width
  sliceCanvas.height = height

  const context = sliceCanvas.getContext("2d")
  if (!context) {
    throw new Error("Nao foi possivel preparar uma pagina do PDF.")
  }

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height)
  context.drawImage(
    source,
    0,
    offsetY,
    source.width,
    height,
    0,
    0,
    sliceCanvas.width,
    height
  )

  return sliceCanvas
}

function getImageHeightMm(canvas: HTMLCanvasElement, pageWidthMm: number) {
  return (canvas.height * pageWidthMm) / canvas.width
}

function getSectionSpacingMm(section: HTMLElement, fallbackSpacingMm: number) {
  const computedStyle = window.getComputedStyle(section)
  const marginTop = Number.parseFloat(computedStyle.marginTop || "0")
  const marginBottom = Number.parseFloat(computedStyle.marginBottom || "0")
  const sectionWidth = section.getBoundingClientRect().width || section.scrollWidth || 1
  const totalMarginPx = marginTop + marginBottom

  if (!totalMarginPx || !sectionWidth) {
    return fallbackSpacingMm
  }

  return (totalMarginPx / sectionWidth) * 210
}

async function renderSectionCanvas(
  html2canvas: typeof import("html2canvas").default,
  section: HTMLElement
) {
  return html2canvas(section, {
    scale: PDF_RENDER_SCALE,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: section.scrollWidth,
    windowHeight: section.scrollHeight,
    imageTimeout: 0,
  })
}

function appendCanvasToPdf(
  pdf: import("jspdf").jsPDF,
  canvas: HTMLCanvasElement,
  yMm: number,
  widthMm: number
) {
  const imageData = canvas.toDataURL("image/png")
  const heightMm = getImageHeightMm(canvas, widthMm)
  pdf.addImage(imageData, "PNG", 0, yMm, widthMm, heightMm)
  return heightMm
}

function appendLargeSectionToPdf(
  pdf: import("jspdf").jsPDF,
  canvas: HTMLCanvasElement,
  startYMm: number,
  pageWidthMm: number,
  pageHeightMm: number
) {
  const pixelsPerMm = canvas.width / pageWidthMm
  let offsetY = 0
  let currentY = startYMm
  let remainingHeightPx = canvas.height

  while (remainingHeightPx > 0) {
    const availableHeightMm = pageHeightMm - currentY

    if (availableHeightMm <= 0.1) {
      pdf.addPage()
      currentY = 0
      continue
    }

    const sliceHeightPx = Math.min(
      remainingHeightPx,
      Math.max(1, Math.floor(availableHeightMm * pixelsPerMm))
    )

    const sliceCanvas = createSliceCanvas(canvas, offsetY, sliceHeightPx)
    const sliceHeightMm = appendCanvasToPdf(pdf, sliceCanvas, currentY, pageWidthMm)

    offsetY += sliceHeightPx
    remainingHeightPx -= sliceHeightPx
    currentY += sliceHeightMm

    if (remainingHeightPx > 0) {
      pdf.addPage()
      currentY = 0
    }
  }

  return currentY
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
    const pdf = new jsPDF("p", "mm", "a4")
    const pageWidthMm = pdf.internal.pageSize.getWidth()
    const pageHeightMm = pdf.internal.pageSize.getHeight()
    const sections = Array.from(clone.querySelectorAll<HTMLElement>("[data-pdf-section='true']"))

    if (!sections.length) {
      throw new Error("Nao foi possivel identificar as secoes do PDF.")
    }

    let currentY = 0

    for (let index = 0; index < sections.length; index += 1) {
      const section = sections[index]
      const sectionCanvas = await renderSectionCanvas(html2canvas, section)
      const sectionHeightMm = getImageHeightMm(sectionCanvas, pageWidthMm)
      const spacingMm =
        index === sections.length - 1
          ? 0
          : getSectionSpacingMm(section, PDF_PAGE_GAP_MM)

      if (sectionHeightMm <= pageHeightMm) {
        const remainingHeightMm = pageHeightMm - currentY

        if (currentY > 0 && sectionHeightMm > remainingHeightMm) {
          pdf.addPage()
          currentY = 0
        }

        const renderedHeightMm = appendCanvasToPdf(pdf, sectionCanvas, currentY, pageWidthMm)
        currentY += renderedHeightMm

        if (spacingMm > 0) {
          if (currentY + spacingMm > pageHeightMm) {
            pdf.addPage()
            currentY = 0
          } else {
            currentY += spacingMm
          }
        }

        continue
      }

      if (currentY > 0) {
        pdf.addPage()
        currentY = 0
      }

      currentY = appendLargeSectionToPdf(
        pdf,
        sectionCanvas,
        currentY,
        pageWidthMm,
        pageHeightMm
      )

      if (spacingMm > 0) {
        if (currentY + spacingMm > pageHeightMm) {
          pdf.addPage()
          currentY = 0
        } else {
          currentY += spacingMm
        }
      }
    }

    pdf.save(filename)
  } finally {
    iframe.remove()
  }
}
