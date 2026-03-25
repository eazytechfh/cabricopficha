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

  await waitForImages(element)
  await new Promise((resolve) => setTimeout(resolve, 120))

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
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
}
