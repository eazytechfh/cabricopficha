alter table public.fichas_venda
  add column if not exists prazos_processo_texto text,
  add column if not exists prazos_multa_texto text;

update public.fichas_venda
set prazos_processo_texto = coalesce(nullif(prazos_processo_texto, ''), assinatura_visto_juridico)
where prazos_processo_texto is null or prazos_processo_texto = '';

update public.fichas_venda
set prazos_multa_texto = coalesce(
  nullif(prazos_multa_texto, ''),
  case when prazo_multa is not null then prazo_multa::text end
)
where prazos_multa_texto is null or prazos_multa_texto = '';
