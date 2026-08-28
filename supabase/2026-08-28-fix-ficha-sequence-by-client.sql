-- Corrige sequencias importadas e garante numeracao atomica por cliente.
create or replace function public.ficha_client_key(cpf_normalizado_value text, cpf_cnpj_value text, nome_cliente_value text)
returns text language sql immutable set search_path = public as $$
  select nullif(regexp_replace(coalesce(cpf_normalizado_value, cpf_cnpj_value, ''), '\D', '', 'g'), '')
$$;

drop index if exists public.fichas_venda_cpf_numero_ficha_uidx;

with renumbered as (
  select id, row_number() over (
    partition by public.ficha_client_key(cpf_normalizado, cpf_cnpj, nome_cliente)
    order by data_contrato nulls last, created_at nulls last, id
  ) as new_number
  from public.fichas_venda
  where public.ficha_client_key(cpf_normalizado, cpf_cnpj, nome_cliente) is not null
)
update public.fichas_venda ficha set numero_ficha = renumbered.new_number
from renumbered where ficha.id = renumbered.id;

create unique index if not exists fichas_venda_client_numero_ficha_uidx
on public.fichas_venda (public.ficha_client_key(cpf_normalizado, cpf_cnpj, nome_cliente), numero_ficha)
where numero_ficha is not null
  and public.ficha_client_key(cpf_normalizado, cpf_cnpj, nome_cliente) is not null;

create or replace function public.assign_ficha_number()
returns trigger language plpgsql set search_path = public as $$
declare client_key text;
begin
  client_key := public.ficha_client_key(new.cpf_normalizado, new.cpf_cnpj, new.nome_cliente);
  if client_key is null then
    new.numero_ficha := coalesce(new.numero_ficha, 1);
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext(client_key));
  select coalesce(max(numero_ficha), 0) + 1 into new.numero_ficha
  from public.fichas_venda
  where public.ficha_client_key(cpf_normalizado, cpf_cnpj, nome_cliente) = client_key;
  return new;
end;
$$;

drop trigger if exists assign_ficha_number on public.fichas_venda;
create trigger assign_ficha_number before insert on public.fichas_venda
for each row execute function public.assign_ficha_number();
