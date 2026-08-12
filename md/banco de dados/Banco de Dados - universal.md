Você é um DBA sênior e arquiteto de bancos de dados.

Faça uma auditoria completa do banco de dados deste sistema.

Objetivo:

Identificar gargalos, riscos de crescimento, problemas de modelagem, consultas ineficientes e oportunidades de otimização.

Analise:

# Estrutura

- Todas as tabelas
- Relacionamentos
- Chaves primárias
- Chaves estrangeiras
- Constraints
- Índices existentes

# Modelagem

Procure:

- Tabelas excessivamente grandes
- Colunas redundantes
- Relacionamentos inadequados
- Dados duplicados
- Normalização excessiva
- Desnormalização excessiva

# Performance

Procure:

- Queries lentas
- N+1 Queries
- Full Table Scans
- Índices ausentes
- Índices pouco eficientes
- JOINs custosos
- ORDER BY custosos
- Filtros ineficientes

# Escalabilidade

Simule:

- 10x registros
- 50x registros
- 100x registros

Identifique:

- Tabelas que crescerão rapidamente
- Gargalos futuros
- Possíveis travamentos
- Riscos de concorrência

# Integridade

Verifique:

- Dados órfãos
- Chaves inconsistentes
- Duplicidades
- Campos obrigatórios sem validação
- Integridade referencial

# Segurança

Analise:

- Permissões
- Exposição de dados
- RLS (quando existir)
- Políticas de acesso
- Dados sensíveis armazenados

# Custos

Identifique:

- Consultas desnecessárias
- Armazenamento desperdiçado
- Tabelas obsoletas
- Dados arquiváveis

Para cada problema encontrado:

- Tabela
- Local
- Impacto
- Severidade
- Correção recomendada

Classifique:

CRÍTICO
ALTO
MÉDIO
BAIXO

Ao final gere:

1. Top 20 problemas do banco
2. Índices recomendados
3. Melhorias de modelagem
4. Melhorias de consultas
5. Plano de escalabilidade
6. Estimativa de ganho de performance
7. Estimativa de redução de custos