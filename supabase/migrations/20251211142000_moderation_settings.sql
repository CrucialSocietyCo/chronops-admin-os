-- Moderation Settings Table (Singleton)
create table if not exists public.moderation_settings (
  id int primary key default 1 check (id = 1), -- Enforce singleton
  rate_limit_window_ms int not null default 10000,
  max_messages_per_window int not null default 5,
  auto_mute_duration_ms int not null default 300000,
  max_message_length int not null default 500,
  bad_words text[] default array['badword1', 'spam', 'crypto', 'nft']::text[],
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

-- Enable RLS
alter table public.moderation_settings enable row level security;

-- Policies
-- Admin can Read/Update
create policy "Admins can view settings"
  on public.moderation_settings for select
  to authenticated
  using (
    exists (
      select 1 from public.users 
      where supabase_user_id = auth.uid() 
      and is_admin = true
    )
  );

create policy "Admins can update settings"
  on public.moderation_settings for update
  to authenticated
  using (
    exists (
      select 1 from public.users 
      where supabase_user_id = auth.uid() 
      and is_admin = true
    )
  );

-- Service Role (Backend) can do everything
create policy "Service Role Full Access"
  on public.moderation_settings
  to service_role
  using (true)
  with check (true);

-- Seed Default Row (if not exists)
insert into public.moderation_settings (id)
values (1)
on conflict (id) do nothing;
