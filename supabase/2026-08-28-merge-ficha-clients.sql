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
  highest_number integer;
begin
  if primary_ficha_id is null or array_length(selected_ficha_ids, 1) < 2 or not (primary_ficha_id = any(selected_ficha_ids)) then
    raise exception 'Seleção de cadastros inválida.';
  end if;

  select * into principal from public.fichas_venda where id = primary_ficha_id for update;
  if not found then raise exception 'Cadastro principal não encontrado.'; end if;
  if public.ficha_client_key(principal.cpf_normalizado, principal.cpf_cnpj, principal.nome_cliente) is null then
    raise exception 'Cadastros sem CPF/CNPJ devem permanecer separados.';
  end if;

  perform pg_advisory_xact_lock(hashtext(coalesce(public.ficha_client_key(principal.cpf_normalizado, principal.cpf_cnpj, principal.nome_cliente), principal.id::text)));

  update public.fichas_venda set numero_ficha = null
  where id = any(selected_ficha_ids) and id <> primary_ficha_id
    and public.ficha_client_key(cpf_normalizado, cpf_cnpj, nome_cliente) is distinct from
      public.ficha_client_key(principal.cpf_normalizado, principal.cpf_cnpj, principal.nome_cliente);

  update public.fichas_venda set
    nome_cliente = principal.nome_cliente, terceiros = principal.terceiros,
    telefones = principal.telefones, endereco = principal.endereco,
    numero_endereco = principal.numero_endereco, complemento_endereco = principal.complemento_endereco,
    cep = principal.cep, municipio = principal.municipio, uf = principal.uf,
    cpf_cnpj = principal.cpf_cnpj, cpf_normalizado = principal.cpf_normalizado,
    cnh = principal.cnh, data_nascimento = principal.data_nascimento,
    data_primeira_cnh = principal.data_primeira_cnh, nacionalidade = principal.nacionalidade,
    estado_civil = principal.estado_civil, profissao = principal.profissao, email = principal.email,
    updated_at = now(), updated_by_consultor_id = actor_id_value
  where id = any(selected_ficha_ids) and id <> primary_ficha_id;
  get diagnostics affected_count = row_count;

  select coalesce(max(numero_ficha), 0) into highest_number
  from public.fichas_venda
  where public.ficha_client_key(cpf_normalizado, cpf_cnpj, nome_cliente) =
    public.ficha_client_key(principal.cpf_normalizado, principal.cpf_cnpj, principal.nome_cliente);

  with pending as (
    select id, row_number() over (order by data_contrato nulls last, created_at nulls last, id) as position
    from public.fichas_venda
    where id = any(selected_ficha_ids) and numero_ficha is null
  )
  update public.fichas_venda ficha set numero_ficha = highest_number + pending.position
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
