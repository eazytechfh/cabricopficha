alter table public.activity_logs
add column if not exists details jsonb not null default '[]'::jsonb;
