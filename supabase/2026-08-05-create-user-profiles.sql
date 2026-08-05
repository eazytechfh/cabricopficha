create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome_responsavel text not null,
  email text not null unique,
  telefone text not null,
  nivel_acesso text not null
    check (nivel_acesso in ('admin', 'consultor', 'andamento')),
  ativo boolean not null default true,
  must_change_password boolean not null default false,
  password_plain text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create or replace function public.set_user_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;

create trigger set_user_profiles_updated_at
before update on public.user_profiles
for each row
execute function public.set_user_profiles_updated_at();

alter table public.user_profiles enable row level security;

drop policy if exists "service role can manage user_profiles" on public.user_profiles;

create policy "service role can manage user_profiles"
on public.user_profiles
as permissive
for all
to service_role
using (true)
with check (true);
