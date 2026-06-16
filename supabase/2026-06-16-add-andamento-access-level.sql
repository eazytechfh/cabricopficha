alter table public.access_codes
drop constraint if exists access_codes_nivel_acesso_check;

alter table public.access_codes
add constraint access_codes_nivel_acesso_check
check (nivel_acesso in ('admin', 'consultor', 'andamento'));
