alter table public.fichas_venda
add column if not exists placa_proprietario text,
add column if not exists cpf_proprietario text;

update public.fichas_venda
set placa_proprietario = 'nao'
where nullif(trim(coalesce(cpf_proprietario, '')), '') is not null
  and lower(trim(coalesce(placa_proprietario, 'sim'))) <> 'nao';
