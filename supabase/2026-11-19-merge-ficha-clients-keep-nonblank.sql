-- Juncao de cadastros: campo em branco no cadastro principal nao apaga o dado existente nas demais fichas.
alter table public.fichas_venda
add column if not exists client_group_id uuid;

create index if not exists fichas_venda_client_group_id_idx
on public.fichas_venda (client_group_id);

create or replace function public.merge_ficha_clients(
  primary_ficha_id bigint,
  selected_ficha_ids bigint[],
  actor_id_value text,
  actor_name_value text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  principal public.fichas_venda%rowtype;
  affected_count integer;
  group_id_value uuid;
begin
  if primary_ficha_id is null or array_length(selected_ficha_ids, 1) < 2 or not (primary_ficha_id = any(selected_ficha_ids)) then
    raise exception 'Seleção de cadastros inválida.';
  end if;

  select * into principal from public.fichas_venda where id = primary_ficha_id for update;
  if not found then raise exception 'Cadastro principal não encontrado.'; end if;

  group_id_value := coalesce(principal.client_group_id, gen_random_uuid());

  perform pg_advisory_xact_lock(hashtext(coalesce(public.ficha_client_key(principal.cpf_normalizado, principal.cpf_cnpj, principal.nome_cliente), principal.id::text)));

  update public.fichas_venda set numero_ficha = null
  where id = any(selected_ficha_ids) and id <> primary_ficha_id
    and public.ficha_client_key(cpf_normalizado, cpf_cnpj, nome_cliente) is distinct from
      public.ficha_client_key(principal.cpf_normalizado, principal.cpf_cnpj, principal.nome_cliente);

  update public.fichas_venda as ficha set
    client_group_id = group_id_value,
    nome_cliente = coalesce(nullif(btrim(principal.nome_cliente::text), ''), ficha.nome_cliente),
    terceiros = coalesce(nullif(btrim(principal.terceiros::text), ''), ficha.terceiros),
    telefone_terceiros = coalesce(nullif(btrim(principal.telefone_terceiros::text), ''), ficha.telefone_terceiros),
    email_terceiros = coalesce(nullif(btrim(principal.email_terceiros::text), ''), ficha.email_terceiros),
    telefones = coalesce(nullif(btrim(principal.telefones::text), ''), ficha.telefones),
    endereco = coalesce(nullif(btrim(principal.endereco::text), ''), ficha.endereco),
    numero_endereco = coalesce(nullif(btrim(principal.numero_endereco::text), ''), ficha.numero_endereco),
    complemento_endereco = coalesce(nullif(btrim(principal.complemento_endereco::text), ''), ficha.complemento_endereco),
    cep = coalesce(nullif(btrim(principal.cep::text), ''), ficha.cep),
    municipio = coalesce(nullif(btrim(principal.municipio::text), ''), ficha.municipio),
    uf = coalesce(nullif(btrim(principal.uf::text), ''), ficha.uf),
    cpf_cnpj = coalesce(nullif(btrim(principal.cpf_cnpj::text), ''), ficha.cpf_cnpj),
    cpf_normalizado = coalesce(nullif(btrim(principal.cpf_normalizado::text), ''), ficha.cpf_normalizado),
    cnh = coalesce(nullif(btrim(principal.cnh::text), ''), ficha.cnh),
    data_nascimento = coalesce(nullif(btrim(principal.data_nascimento::text), ''), ficha.data_nascimento),
    data_primeira_cnh = coalesce(nullif(btrim(principal.data_primeira_cnh::text), ''), ficha.data_primeira_cnh),
    nacionalidade = coalesce(nullif(btrim(principal.nacionalidade::text), ''), ficha.nacionalidade),
    estado_civil = coalesce(nullif(btrim(principal.estado_civil::text), ''), ficha.estado_civil),
    profissao = coalesce(nullif(btrim(principal.profissao::text), ''), ficha.profissao),
    email = coalesce(nullif(btrim(principal.email::text), ''), ficha.email),
    updated_at = now(), updated_by_consultor_id = actor_id_value
  where ficha.id = any(selected_ficha_ids) and ficha.id <> primary_ficha_id;
  get diagnostics affected_count = row_count;

  update public.fichas_venda set client_group_id = group_id_value
  where id = primary_ficha_id;

  update public.fichas_venda set numero_ficha = null
  where client_group_id = group_id_value;

  with pending as (
    select id, row_number() over (order by data_contrato nulls last, created_at nulls last, id) as position
    from public.fichas_venda
    where client_group_id = group_id_value
  )
  update public.fichas_venda ficha set numero_ficha = pending.position
  from pending where ficha.id = pending.id;

  insert into public.activity_logs(entity_type, entity_id, entity_label, action, summary, actor_id, actor_name)
  select 'ficha', id::text, nome_cliente, 'merge',
    'Cadastro unido ao cliente principal sem excluir a ficha ou o contrato.', actor_id_value, actor_name_value
  from public.fichas_venda where id = any(selected_ficha_ids);

  return affected_count;
end;
$$;

revoke all on function public.merge_ficha_clients(bigint, bigint[], text, text) from public, anon, authenticated;
grant execute on function public.merge_ficha_clients(bigint, bigint[], text, text) to service_role;
