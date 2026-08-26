alter table public.fichas_venda
add column if not exists numero_ficha integer;

update public.fichas_venda
set
  numero_ficha = substring(nome_cliente from '([0-9]{1,2})\s*$')::integer,
  nome_cliente = trim(regexp_replace(nome_cliente, '\s+[0-9]{1,2}\s*$', ''))
where numero_ficha is null
  and nome_cliente ~ '\s+[0-9]{1,2}\s*$';

with ranked as (
  select
    id,
    row_number() over (
      partition by
        coalesce(
          nullif(cpf_normalizado, ''),
          nullif(regexp_replace(coalesce(cpf_cnpj, ''), '\D', '', 'g'), '')
        ),
        numero_ficha
      order by created_at nulls last, id
    ) as occurrence
  from public.fichas_venda
  where numero_ficha is not null
)
update public.fichas_venda as ficha
set numero_ficha = null
from ranked
where ficha.id = ranked.id
  and ranked.occurrence > 1;

with numbered as (
  select
    id,
    coalesce(
      nullif(cpf_normalizado, ''),
      nullif(regexp_replace(coalesce(cpf_cnpj, ''), '\D', '', 'g'), ''),
      '__sem_cpf__' || id::text
    ) as cpf_key,
    row_number() over (
      partition by coalesce(
        nullif(cpf_normalizado, ''),
        nullif(regexp_replace(coalesce(cpf_cnpj, ''), '\D', '', 'g'), ''),
        '__sem_cpf__' || id::text
      )
      order by created_at nulls last, id
    ) as pending_order
  from public.fichas_venda
  where numero_ficha is null
), maxima as (
  select
    coalesce(
      nullif(cpf_normalizado, ''),
      nullif(regexp_replace(coalesce(cpf_cnpj, ''), '\D', '', 'g'), ''),
      '__sem_cpf__' || id::text
    ) as cpf_key,
    coalesce(max(numero_ficha), 0) as highest_number
  from public.fichas_venda
  group by 1
)
update public.fichas_venda as ficha
set numero_ficha = maxima.highest_number + numbered.pending_order
from numbered
join maxima on maxima.cpf_key = numbered.cpf_key
where ficha.id = numbered.id;

alter table public.fichas_venda
drop constraint if exists fichas_venda_numero_ficha_positive_check;

alter table public.fichas_venda
add constraint fichas_venda_numero_ficha_positive_check
check (numero_ficha > 0);

create unique index if not exists fichas_venda_cpf_numero_ficha_uidx
on public.fichas_venda (
  (
    coalesce(
      nullif(cpf_normalizado, ''),
      nullif(regexp_replace(coalesce(cpf_cnpj, ''), '\D', '', 'g'), '')
    )
  ),
  numero_ficha
)
where numero_ficha is not null
  and coalesce(
    nullif(cpf_normalizado, ''),
    nullif(regexp_replace(coalesce(cpf_cnpj, ''), '\D', '', 'g'), '')
  ) is not null;

create or replace function public.assign_ficha_number()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  cpf_key text;
begin
  cpf_key := coalesce(
    nullif(new.cpf_normalizado, ''),
    nullif(regexp_replace(coalesce(new.cpf_cnpj, ''), '\D', '', 'g'), '')
  );

  if cpf_key is null then
    new.numero_ficha := coalesce(new.numero_ficha, 1);
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(cpf_key));

  select coalesce(max(numero_ficha), 0) + 1
  into new.numero_ficha
  from public.fichas_venda
  where coalesce(
    nullif(cpf_normalizado, ''),
    nullif(regexp_replace(coalesce(cpf_cnpj, ''), '\D', '', 'g'), '')
  ) = cpf_key;

  return new;
end;
$$;

drop trigger if exists assign_ficha_number on public.fichas_venda;

create trigger assign_ficha_number
before insert on public.fichas_venda
for each row
execute function public.assign_ficha_number();
