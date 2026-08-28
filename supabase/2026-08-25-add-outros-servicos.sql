alter table public.fichas_venda
add column if not exists tipo_outro_servico text,
add column if not exists poderes_outro_servico text;

insert into public.document_templates (key, content)
values
  ('other-services-contract', ''),
  ('other-services-procuration', '')
on conflict (key) do nothing;
