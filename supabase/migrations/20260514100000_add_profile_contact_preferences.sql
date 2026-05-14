alter table public.profiles
  add column if not exists position text,
  add column if not exists phone text,
  add column if not exists address_line text,
  add column if not exists avatar_url text,
  add column if not exists preferred_theme text default 'light';

alter table public.profiles
  drop constraint if exists profiles_preferred_theme_check;

alter table public.profiles
  add constraint profiles_preferred_theme_check
  check (preferred_theme in ('light', 'dark'));
