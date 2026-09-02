---
name: CABRICOP Ficha
description: CRM interno para gestão de fichas, contratos e documentos de defesa de trânsito
colors:
  navy-authority:
    canonical: "oklch(0.35 0.12 240)"
  gold-seal:
    canonical: "oklch(0.72 0.16 75)"
  paper-neutral:
    canonical: "oklch(0.98 0.005 240)"
  ink-neutral:
    canonical: "oklch(0.15 0.02 240)"
  surface-card:
    canonical: "oklch(1 0 0)"
  muted-surface:
    canonical: "oklch(0.95 0.01 240)"
  muted-ink:
    canonical: "oklch(0.45 0.02 240)"
  border-hairline:
    canonical: "oklch(0.88 0.02 240)"
  destructive-red:
    canonical: "oklch(0.577 0.245 27.325)"
typography:
  body:
    fontFamily: "Geist, Geist Fallback"
  mono:
    fontFamily: "Geist Mono, Geist Mono Fallback"
rounded:
  sm: "calc(0.75rem - 4px)"
  md: "calc(0.75rem - 2px)"
  lg: "0.75rem"
  xl: "calc(0.75rem + 4px)"
components:
  button-primary:
    backgroundColor: "{colors.navy-authority}"
    textColor: "{colors.paper-neutral}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.gold-seal}"
    textColor: "{colors.ink-neutral}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "{colors.paper-neutral}"
    textColor: "{colors.ink-neutral}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-destructive:
    backgroundColor: "{colors.destructive-red}"
    textColor: "{colors.paper-neutral}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
---

# Design System: CABRICOP Ficha

## Overview

**Creative North Star: "O Escritório de Confiança"**

O sistema é uma ferramenta interna de trabalho para consultores e administradores da CABRICOP, especialista em defesas de trânsito. A identidade visual não vende para o cliente final — ela precisa transmitir seriedade institucional e confiança para quem preenche fichas, gera contratos e acompanha processos administrativos/jurídicos o dia inteiro. O azul-marinho profundo é a cor de autoridade e estabilidade (o "terno" da marca); o dourado/âmbar é usado com moderação como selo de destaque — aprovação, ação principal, ou ênfase pontual — nunca como cor de fundo dominante. A base é neutra, quase editorial: papel claro, tinta escura, bordas finas, sem ruído visual competindo com os dados da ficha.

A interface é construída sobre shadcn/ui sem customização estrutural de componente — a disciplina vem da paleta e da hierarquia tipográfica/tonal, não de formas exóticas. Isso é deliberado: consistência e previsibilidade importam mais que expressão de marca numa ferramenta operacional usada horas por dia.

**Key Characteristics:**
- Azul-marinho institucional como cor de autoridade; dourado usado com raridade como selo de destaque.
- Base neutra e tonal — papel claro / tinta escura, sem gradientes ou padrões decorativos.
- Flat por padrão; profundidade vem de camadas de cor e borda fina, não de sombra pesada.
- Cantos suavemente arredondados (0.75rem base), nunca angulares nem excessivamente arredondados.
- Densidade de dashboard: prioriza escaneabilidade e ação rápida sobre atmosfera.

## Colors

Paleta compacta shadcn/ui: um par autoridade/destaque sobre uma base neutra fria, com vermelho reservado só para ações destrutivas.

### Primary
- **Navy Authority** (oklch(0.35 0.12 240)): cor de ação primária — botões principais, foco, links, indicadores de seleção. Transmite autoridade institucional; é a cor "de terno" do sistema.

### Secondary
- **Gold Seal** (oklch(0.72 0.16 75)): accent/secundário — usado para destacar aprovação, ênfase pontual, badges de status positivo. Aparece em porções pequenas da tela; sua raridade é o que dá o efeito de "selo".

### Neutral
- **Paper Neutral** (oklch(0.98 0.005 240)): fundo de página.
- **Surface Card** (oklch(1 0 0)): fundo de cards, popovers, diálogos — branco puro para destacar do fundo levemente acinzentado.
- **Ink Neutral** (oklch(0.15 0.02 240)): texto principal.
- **Muted Surface** (oklch(0.95 0.01 240)): fundos secundários, áreas desabilitadas ou de baixa ênfase.
- **Muted Ink** (oklch(0.45 0.02 240)): texto secundário, legendas, metadados.
- **Border Hairline** (oklch(0.88 0.02 240)): bordas e divisores — sempre finos, nunca protagonistas.
- **Destructive Red** (oklch(0.577 0.245 27.325)): exclusão, erro, ações irreversíveis. Reservado exclusivamente para esse papel.

### Named Rules
**The One Seal Rule.** O dourado (Gold Seal) nunca é usado como cor de fundo dominante de tela ou seção grande; ele marca um único ponto de ênfase por vez (um botão, um badge, um destaque), nunca a página inteira.

## Typography

**Body/UI Font:** Geist (fallback: Geist Fallback)
**Mono Font:** Geist Mono (fallback: Geist Mono Fallback), reservado para dados tabulares/identificadores quando necessário (ex: CPF/CNPJ, números de ficha).

**Character:** Geist é uma sans-serif geométrica neutra e altamente legível — apropriada para um painel de dados denso, sem personalidade decorativa que compita com o conteúdo da ficha.

### Hierarchy
- **Body** (text-sm a text-base, peso 400–500): texto de formulário, labels de campo, conteúdo de tabela — a maior parte da interface.
- **Label** (text-sm, peso 500, `text-sm font-medium`): rótulos de campo e botões, conforme observado em `button.tsx`.
- **Title** (text-lg a text-xl, peso 600): títulos de seção e cabeçalhos de card.

Escala exata de display/headline não está estabelecida no código (não há hero/marketing); esta é uma ferramenta operacional sem página de landing.

## Layout

Layout de dashboard/formulário denso — não há grid editorial nem hero de marketing. Componentes são organizados em cards e formulários dentro de um workspace único (`FichasWorkspace`). Densidade e escaneabilidade guiam o espaçamento (paddings compactos: `px-3`–`px-6`, alturas de controle `h-8`–`h-10`), conforme os componentes shadcn padrão.

## Elevation & Depth

Sistema majoritariamente flat: elementos de controle (botões, inputs, popovers) usam no máximo `shadow-xs`, sutil e funcional. A exceção deliberada são os cards de seção do formulário de ficha e os cards de tela cheia (login, "Consulta de Ficha") — esses usam `shadow-md` para se destacarem como blocos de conteúdo primário dentro de um layout denso de formulário/dashboard. Não introduzir `shadow-md` fora desses dois contextos (card de seção de formulário, card de tela cheia).

### Named Rules
**The Flat-By-Default Rule.** Controles (botões, inputs, popovers, menus) ficam flat em repouso; sombra, quando existe, é discreta (`shadow-xs`) e serve para diferenciar camada de interação, não para simular profundidade dramática.
**The Section Card Rule.** Cards de seção do formulário e cards de tela cheia usam `shadow-md` para se destacarem como unidade de conteúdo primário — essa é a única classe de componente autorizada a usar sombra pronunciada.

## Shapes

Cantos suavemente arredondados: raio base 0.75rem (`--radius`), com escala derivada `sm` (raio−4px), `md` (raio−2px), `lg` (raio), `xl` (raio+4px). Bordas finas e uniformes (`border-hairline`). Nenhum recorte, ângulo agudo ou geometria decorativa — a forma é utilitária e consistente em todos os componentes.

## Components

### Buttons
- **Shape:** cantos arredondados médios (`rounded-md`, ~0.65rem).
- **Primary (`default`):** fundo Navy Authority, texto claro, hover escurece 90% de opacidade.
- **Secondary:** fundo Gold Seal, texto escuro (`ink-neutral`), hover a 80% de opacidade.
- **Outline:** fundo claro com borda, hover preenche com `accent` (dourado suave).
- **Destructive:** fundo vermelho, texto claro — reservado a exclusões/ações irreversíveis.
- **Ghost / Link:** sem fundo em repouso; ghost ganha fundo `accent` no hover, link sublinha ao passar o mouse.
- **Tamanhos:** `sm` (h-8), `default` (h-9), `lg` (h-10), além de variantes `icon`/`icon-sm`/`icon-lg` quadradas.

### Cards / Containers
- **Corner Style:** `rounded-lg` (0.75rem).
- **Background:** Surface Card (branco) sobre fundo Paper Neutral.
- **Shadow Strategy:** cards de conteúdo secundário (dentro de dialogs, listas) ficam flat (ver Elevation & Depth); cards de seção de formulário e cards de tela cheia usam `shadow-md`.
- **Border:** hairline (`border-border`) fina ao redor do card.

### Section Accent (assinatura do formulário de ficha)
Cada card de seção do `FichaForm` leva uma borda de destaque de 4px na lateral esquerda (`border-l-4`), colorida por tipo de seção — não é decorativa aleatória, é um código de cor consistente:
- **`border-l-primary`** (Navy Authority): seções de identificação/dados centrais (contrato, cliente, processos, outros serviços).
- **`border-l-secondary`** (Gold Seal): seções financeiras/de risco (pagamento, multas).
- **`border-l-muted`**: seções de baixa prioridade (observações/notas).

### Inputs / Fields
- **Style:** borda fina, fundo levemente diferenciado do card, raio consistente com botões.
- **Focus:** anel de foco (`focus-visible:ring-ring/50`, 3px) na cor Navy Authority.
- **Error / Disabled:** estado inválido usa anel/borda em Destructive Red (`aria-invalid:ring-destructive/20`); desabilitado reduz opacidade e bloqueia interação (`disabled:opacity-50`).

### Navigation
Não há navegação global de marketing; a navegação é interna ao workspace (abas/telas dentro do mesmo painel). Segue a mesma linguagem tonal de botões e cards.

## Do's and Don'ts

### Do:
- **Do** usar Navy Authority como única cor de ação primária em qualquer tela nova — não introduzir uma segunda cor "de marca" concorrente.
- **Do** manter o dourado (Gold Seal) raro e pontual — um destaque por vez, nunca uma área grande.
- **Do** manter controles (botões, inputs, popovers) flat, com profundidade via cor/borda, não via sombra pesada.
- **Do** manter o código de cor do Section Accent (`border-l-primary`/`secondary`/`muted`) ao adicionar uma nova seção ao formulário de ficha — a cor comunica o tipo de seção, não é aleatória.
- **Do** manter texto e rótulos da UI em Geist, sem introduzir uma segunda família tipográfica de interface.

### Don't:
- **Don't** usar gradientes decorativos, ilustrações ou fotografia de marketing — este é um painel operacional interno, não uma superfície de persuasão.
- **Don't** aumentar o raio de canto além da escala existente (0.75rem base) ou torná-lo angular (raio 0) sem decisão explícita do usuário.
- **Don't** usar vermelho (`destructive`) fora do contexto de exclusão/erro/ação irreversível.
- **Don't** introduzir `shadow-md` fora de cards de seção de formulário ou cards de tela cheia (ver Elevation & Depth) — controles e cards secundários seguem flat.
- **Don't** usar texto cinza/slate sobre um fundo colorido (ex.: chip âmbar); usar um tom mais escuro da própria família de cor do fundo para manter contraste.

### Exceções conhecidas
- O editor de conteúdo de modelos de documento (`document-template-editor`) usa `fontFamily: Arial` como fonte padrão do texto editável. Isso é intencional: essa fonte pertence ao **conteúdo do documento gerado** (PDF entregue ao cliente), não à UI do aplicativo, então não segue a regra de fonte única Geist da interface.
