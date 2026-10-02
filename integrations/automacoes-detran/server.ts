// @ts-nocheck -- este arquivo e implantado separadamente na VPS, que possui suas proprias dependencias.
import express from "express"
import puppeteer, { type Page } from "puppeteer"
import * as TwoCaptcha from "2captcha"
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config()

const app = express()
app.use(express.json())

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const solver = new TwoCaptcha.Solver(process.env.TWOCAPTCHA_API_KEY!)

const BASE_URL = "http://multas.detran.rj.gov.br/gaideweb2/consultaPontuacao"
const SITE_KEY = "6LdbMaYUAAAAAKDuamVtV8-MfAqzU9bbvoZMiJOv"

type Infraction = {
  numero_auto: string
  data: string
  hora: string
  orgao: string
  placa: string
  proprietario: string
  responsavel_pontos: string
  situacao: string
  infracao: string
  local: string
  enquadramento: string
  pontos: string
  vencimento: string
  valor: string
  valor_com_desconto: string
  processo: string
}

async function extractInfractions(page: Page, path: string): Promise<Infraction[]> {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle2", timeout: 30000 })
  await page.waitForSelector("#accordion, .panel-group", { timeout: 15000 }).catch(() => undefined)

  return page.evaluate(() => {
    const clean = (value: string | null | undefined) => (value || "").replace(/\s+/g, " ").trim()
    const field = (root: Element, label: string) => {
      const wanted = label.toLocaleLowerCase("pt-BR")
      const labelElement = Array.from(root.querySelectorAll("label")).find((item) =>
        clean(item.textContent).replace(/:$/, "").toLocaleLowerCase("pt-BR") === wanted
      )
      if (!labelElement) return ""
      const container = labelElement.parentElement
      if (!container) return ""
      return clean(Array.from(container.querySelectorAll("span")).map((span) => span.textContent).join(" "))
    }

    return Array.from(document.querySelectorAll("#accordion .panel.panel-default")).map((panel) => {
      const dateTime = field(panel, "Data").split(/\s+/)
      const framing = field(panel, "Enquadramento")
      const pointsMatch = framing.match(/Pontos:\s*(\d+)/i)

      return {
        numero_auto: field(panel, "Nº Auto"),
        data: dateTime[0] || "",
        hora: dateTime[1] || "",
        orgao: field(panel, "Órgão"),
        placa: field(panel, "Placa"),
        proprietario: field(panel, "Proprietário"),
        responsavel_pontos: field(panel, "Resp. Pontos"),
        situacao: field(panel, "Situação"),
        infracao: field(panel, "Infração"),
        local: field(panel, "Local"),
        enquadramento: framing.replace(/\s*Pontos:\s*\d+/i, "").trim(),
        pontos: pointsMatch?.[1] || "",
        vencimento: field(panel, "Vencimento"),
        valor: field(panel, "Valor"),
        valor_com_desconto: field(panel, "Valor com desconto"),
        processo: field(panel, "Processo"),
      }
    })
  })
}

app.post("/v1/consultar-detran", async (req, res) => {
  const { cpf, cnh, uf, eh_pgu, consultor_id } = req.body
  if (!cpf || !cnh) return res.status(400).json({ status: "erro", details: "CPF e CNH são obrigatórios." })

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  })

  try {
    const captchaResult = await solver.recaptcha(SITE_KEY, BASE_URL)
    const page = await browser.newPage()
    await page.goto(BASE_URL, { waitUntil: "networkidle2" })
    await page.type("#cpf", String(cpf))
    await page.type("#cnh", String(cnh))
    if (eh_pgu === "S" || eh_pgu === true) await page.click("#pgu")
    await page.select("#uf", uf || "RJ")
    await page.evaluate((token) => {
      const element = document.getElementById("g-recaptcha-response") as HTMLTextAreaElement | null
      if (element) {
        element.innerHTML = token
        element.value = token
      }
    }, captchaResult.data)

    await page.click("input.btn-primary[value='Consultar']")
    await page.waitForSelector("table", { timeout: 25000 })

    const dadosTabelas = await page.evaluate(() => Array.from(document.querySelectorAll("table")).map((table) =>
      Array.from(table.querySelectorAll("tr")).map((row) =>
        Array.from(row.querySelectorAll("td, th")).map((cell) => cell.textContent?.trim() || "")
      )
    ))
    const textoPagina = await page.evaluate(() => document.body.innerText)
    const temSuspensao = !textoPagina.includes("NÃO possui") && textoPagina.includes("Suspensão")
    const temCassacao = !textoPagina.includes("NÃO possui") && textoPagina.includes("Cassação")

    const infracoesPontuaveisJulgadas = await extractInfractions(page, "/busca/pontuaveis/julgadas/5anos")
    const infracoes5Anos = await extractInfractions(page, "/busca/5anos")

    const { error } = await supabase.from("historico_consultas_cnh").insert({
      cpf_condutor: cpf,
      cnh_condutor: cnh,
      uf_consulta: uf || "RJ",
      resultado_tabelas: dadosTabelas,
      possui_suspensao_ativa: temSuspensao,
      possui_cassacao_ativa: temCassacao,
      consultor_id: consultor_id || null,
      infracoes_5_anos: infracoes5Anos,
      infracoes_pontuaveis_julgadas_5_anos: infracoesPontuaveisJulgadas,
    })
    if (error) throw new Error(`Erro Supabase: ${error.message}`)

    return res.json({
      status: "sucesso",
      message: `Consulta concluída: ${infracoes5Anos.length} infração(ões) encontrada(s).`,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro desconhecido"
    console.error("[Robô Detran Erro]:", message)
    return res.status(500).json({ status: "erro", details: message })
  } finally {
    await browser.close()
  }
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => console.log(`Serviço de consulta Detran ativo na porta ${PORT}`))
