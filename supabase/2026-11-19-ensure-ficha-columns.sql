-- Colunas usadas pela ficha e pelos serviços adicionais.
-- Seguro para executar mesmo se alguma coluna já existir.
alter table public.fichas_venda
  add column if not exists tipo_outro_servico text,
  add column if not exists poderes_outro_servico text,
  add column if not exists multas_processo text,
  add column if not exists processo_vinculado_multa text;
