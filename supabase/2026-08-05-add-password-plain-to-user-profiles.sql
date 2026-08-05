alter table public.user_profiles
  add column if not exists password_plain text;
