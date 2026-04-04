alter table public.provider_invoices
  add column if not exists received_at timestamp with time zone,
  add column if not exists approved_at timestamp with time zone,
  add column if not exists payment_reference text,
  add column if not exists ap_notes text,
  add column if not exists received_by_user_id uuid references public.profiles(user_id),
  add column if not exists approved_by_user_id uuid references public.profiles(user_id),
  add column if not exists paid_recorded_by_user_id uuid references public.profiles(user_id);
