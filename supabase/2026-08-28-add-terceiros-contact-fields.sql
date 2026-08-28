alter table public.fichas_venda
add column if not exists telefone_terceiros text,
add column if not exists email_terceiros text;
