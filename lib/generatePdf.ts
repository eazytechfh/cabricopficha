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

  const wrapper = document.createElement("div")
  wrapper.style.setProperty("all", "initial")
  wrapper.style.position = "fixed"
  wrapper.style.left = "0"
  wrapper.style.top = "0"
  wrapper.style.width = "1200px"
  wrapper.style.padding = "24px"
  wrapper.style.background = "#ffffff"
  wrapper.style.color = "#000000"
  wrapper.style.fontFamily = "Arial, sans-serif"
  wrapper.style.zIndex = "-1"
  wrapper.style.opacity = "1"
  wrapper.style.pointerEvents = "none"
  wrapper.style.overflow = "hidden"

  const clone = element.cloneNode(true) as HTMLElement
  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)

  await waitForImages(clone)
  await new Promise((resolve) => setTimeout(resolve, 200))

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
    wrapper.remove()
  }
}
