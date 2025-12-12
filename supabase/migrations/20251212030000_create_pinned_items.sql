-- Create pinned_items table
create table if not exists public.pinned_items (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('rules', 'daily_topic', 'announcement', 'featured_link')),
  content jsonb not null default '{}'::jsonb,
  is_active boolean default true,
  order_index integer default 0,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.pinned_items enable row level security;

-- Policies
create policy "Public can read active pinned items"
  on public.pinned_items for select
  using (true);

create policy "Admins can do everything with pinned items"
  on public.pinned_items for all
  using (
    exists (
      select 1 from public.users
      where users.supabase_user_id = auth.uid()
      and users.is_admin = true
    )
  );

-- Enable Realtime
alter publication supabase_realtime add table public.pinned_items;
