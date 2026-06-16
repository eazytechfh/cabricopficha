create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('ficha', 'document_template')),
  entity_id text not null,
  entity_label text not null,
  action text not null,
  summary text not null,
  actor_id text not null,
  actor_name text not null,
  details jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_entity_idx
on public.activity_logs (entity_type, entity_id, created_at desc);
