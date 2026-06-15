create table if not exists public.document_templates (
  key text primary key,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.document_templates (key, content)
values
  ('contract', ''),
  ('procuration', '')
on conflict (key) do nothing;
