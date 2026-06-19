alter table public.fichas_venda
add column if not exists municipio text,
add column if not exists uf text;
