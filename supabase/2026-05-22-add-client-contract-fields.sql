alter table public.fichas_venda
add column if not exists nacionalidade text,
add column if not exists estado_civil text,
add column if not exists profissao text;
