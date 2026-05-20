alter table public.fichas_venda
add column if not exists multas_processo text,
add column if not exists processo_vinculado_multa text;

