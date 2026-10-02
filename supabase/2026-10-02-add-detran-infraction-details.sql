alter table public.historico_consultas_cnh
  add column if not exists infracoes_5_anos jsonb not null default '[]'::jsonb,
  add column if not exists infracoes_pontuaveis_julgadas_5_anos jsonb not null default '[]'::jsonb;

comment on column public.historico_consultas_cnh.infracoes_5_anos is
  'Detalhes de todas as infracoes dos ultimos cinco anos coletados no Detran-RJ.';

comment on column public.historico_consultas_cnh.infracoes_pontuaveis_julgadas_5_anos is
  'Detalhes das infracoes pontuaveis transitadas em julgado dos ultimos cinco anos.';
