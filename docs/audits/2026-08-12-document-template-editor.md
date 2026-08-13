# Auditoria focada — editor de modelos de documentos

Data: 12/08/2026

Escopo: abertura e edição dos modelos de contrato/procuração, formatação, salvamento, preview, imagens, API e riscos diretamente relacionados.

## Causas confirmadas e corrigidas

| Severidade | Ocorrência | Causa | Correção |
| --- | --- | --- | --- |
| Alta | Conteúdo do modelo aparecia apenas algumas vezes | O `useEffect` podia executar quando o conteúdo já estava carregado, mas o elemento dentro do portal do `Dialog` ainda não tinha montado. Sem outra mudança de estado, o HTML nunca era injetado. | Callback ref estável hidrata o elemento no exato momento da montagem e o efeito continua sincronizando atualizações posteriores. |
| Alta | Fonte, tamanho e cores não eram aplicados à seleção | O `Select`/color picker movia o foco para fora do `contentEditable`; quando `execCommand` era chamado, a seleção original já havia sido perdida. | A seleção (`Range`) é capturada antes do toolbar receber foco e restaurada antes de cada comando. |
| Média | Algumas fontes podiam ser ignoradas pelo navegador | `fontName` recebia pilhas CSS como `"Arial, sans-serif"`, embora o comando espere um único nome de fonte. | As opções agora enviam nomes simples, como `Arial` e `Times New Roman`. |
| Média | Troca rápida de modelo podia exibir resposta antiga | Não havia identificação/cancelamento lógico das requisições concorrentes. | Cada abertura recebe um identificador; respostas atrasadas são ignoradas após troca ou fechamento. |
| Média | Salvamento ou leitura de imagem antigos podiam afetar outro diálogo reaberto | As continuações assíncronas não confirmavam que ainda pertenciam ao editor atual. | Salvamento, log e `FileReader` validam geração, tipo de modelo e instância do editor antes de alterar conteúdo, mensagens ou loading. |
| Média | API aceitava tipo desconhecido como contrato | Qualquer valor diferente de `procuration` era convertido silenciosamente para `contract`. | O tipo agora é validado estritamente e retorna HTTP 400 quando inválido. |
| Média | Imagens grandes podiam travar o editor e inflar o payload | A imagem inteira era convertida para base64 sem validar MIME ou tamanho. | Upload restrito a arquivos `image/*` de até 1,5 MB e conteúdo total limitado a 4 milhões de caracteres. |

## Funcionalidade adicionada

- Botão **Desfazer**, integrado ao histórico nativo do `contentEditable`.
- Mensagens claras para imagem inválida, imagem grande, conteúdo vazio/grande e tipo de modelo inválido.
- Rótulo acessível no editor e no botão Desfazer.

## Riscos futuros priorizados

### Alta prioridade

1. **Autorização baseada em identidade enviada pelo cliente.** `assertAdminAccess` consulta o perfil usando apenas o `id` recebido no JSON; não valida um token de sessão do usuário. Um atacante que descubra um UUID de administrador pode tentar se passar por ele. A correção exige autenticação server-side com token/cookie Supabase e deve abranger todas as APIs administrativas, não apenas modelos.
2. **HTML persistido e renderizado diretamente.** `DocumentTemplatePdf` usa `dangerouslySetInnerHTML`. O editor precisa de HTML, mas falta uma sanitização por allowlist no servidor e também proteção para valores substituídos nos placeholders. Priorizar sanitizador confiável e testes contra `<script>`, atributos `onerror`, URLs `javascript:` e CSS perigoso.
3. **Falhas do Supabase são mascaradas.** `getServerDocumentTemplate` devolve o modelo padrão para qualquer resposta não OK. Isso esconde indisponibilidade, permissão quebrada ou migration ausente e pode levar o administrador a sobrescrever o modelo real depois. Diferenciar “registro inexistente” de erro de infraestrutura e registrar/mostrar o erro.

### Média prioridade

1. **`document.execCommand` é uma API obsoleta.** Ela ainda preserva o histórico nativo melhor que manipulação manual, mas pode divergir entre navegadores. Planejar migração para um editor mantido (por exemplo, TipTap/Lexical) antes de ampliar recursos de formatação.
2. **Concorrência de salvamento usa “último a gravar vence”.** Dois administradores podem abrir a mesma versão e um sobrescrever o outro. Adicionar `updated_at`/versão ao PATCH e rejeitar conflito com HTTP 409.
3. **Imagens base64 ficam no PostgreSQL e trafegam em toda abertura.** O limite reduz o impacto imediato, mas a solução escalável é enviar imagens ao Storage e persistir apenas URLs autorizadas.
4. **Preview é recalculado a cada tecla.** Em modelos grandes, `fillDocumentTemplate` e a árvore de preview podem causar atraso. Usar `useDeferredValue` ou debounce se métricas reais mostrarem degradação.
5. **Componente excessivamente grande.** `fichas-workspace.tsx` concentra autenticação, fichas, usuários, timeline e editor em mais de duas mil linhas. Extrair o editor para um componente/módulo próprio reduzirá regressões e permitirá testes de interação reais.

### Qualidade e observabilidade

- O script `npm run lint` existe, mas o pacote `eslint` não está instalado.
- A checagem TypeScript completa já falha em arquivos antigos (`FichaPdf.tsx`, `sales-form.tsx`, `generatePdf.ts` e `server-fichas.ts`), apesar de o build Next ignorar a validação de tipos.
- Não há suíte de browser/E2E configurada; os testes adicionados cobrem utilitários e o contrato de integração no código, mas não substituem uma execução real em Chrome/Edge/Firefox.
- O carregamento do modelo não possui métrica ou log de erro estruturado. Registrar falhas por tipo/status ajudaria a distinguir rede, Supabase e conteúdo inválido.

## Verificações executadas

- 7 testes direcionados: aprovados.
- `next build`: aprovado.
- HTTP local da aplicação: status 200.
- `git diff --check`: aprovado.
- TypeScript completo: somente os quatro grupos de erros preexistentes listados acima; nenhum erro novo do editor.
- Validação visual automatizada: não executada porque nenhum navegador integrado estava disponível na sessão.
