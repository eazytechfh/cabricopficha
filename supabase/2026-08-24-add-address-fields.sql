alter table public.fichas_venda
add column if not exists numero_endereco text,
add column if not exists complemento_endereco text;

update public.fichas_venda
set
  numero_endereco = coalesce(nullif(numero_endereco, ''), (regexp_match(endereco, ',[[:space:]]*Numero[[:space:]]+([^,]+)', 'i'))[1]),
  complemento_endereco = coalesce(nullif(complemento_endereco, ''), (regexp_match(endereco, ',[[:space:]]*Complemento[[:space:]]+(.+)$', 'i'))[1]),
  endereco = regexp_replace(
    regexp_replace(endereco, ',[[:space:]]*Numero[[:space:]]+([^,]+)', '', 'i'),
    ',[[:space:]]*Complemento[[:space:]]+(.+)$', '', 'i'
  )
where endereco ~* ',[[:space:]]*(Numero|Complemento)[[:space:]]+';
