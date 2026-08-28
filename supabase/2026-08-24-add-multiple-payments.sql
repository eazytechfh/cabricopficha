alter table public.fichas_venda
add column if not exists pagamentos jsonb not null default '[]'::jsonb;

update public.fichas_venda
set pagamentos = jsonb_build_array(
  jsonb_build_object(
    'id', 'legacy-1',
    'formaPagamento', coalesce(forma_pagamento, ''),
    'banco', coalesce(banco, ''),
    'valor', coalesce(valor_entrada::text, '')
  )
)
where pagamentos = '[]'::jsonb
  and (coalesce(forma_pagamento, '') <> '' or coalesce(banco, '') <> '' or coalesce(valor_entrada, 0) > 0);
