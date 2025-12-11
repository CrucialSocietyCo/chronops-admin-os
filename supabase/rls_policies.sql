-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.messages enable row level security;
alter table public.events enable row level security;
alter table public.chat_settings enable row level security;
alter table public.system_settings enable row level security;
alter table public.rooms enable row level security;

-- USERS Table
-- Everyone can read profiles (needed to see sender names)
create policy "Public profiles are viewable by everyone"
  on public.users for select
  using ( true );

-- Users can update their own profile
create policy "Users can update own profile"
  on public.users for update
  using ( auth.uid() = supabase_user_id );

-- MESSAGES Table
-- Everyone can read messages
create policy "Messages are viewable by everyone"
  on public.messages for select
  using ( true );

-- Authenticated users can insert messages
-- Allow everyone (Guests + Auth) to insert messages
create policy "Everyone can insert messages"
  on public.messages for insert
  with check ( true );

-- EVENTS Table
-- Everyone can read events
create policy "Events are viewable by everyone"
  on public.events for select
  using ( true );

-- Only Admins can insert/update/delete events
-- (This assumes you have a way to identify admins. 
-- Since is_admin is on public.users, we cross-check)
create policy "Admins can manage events"
  on public.events
  for all
  using ( 
    exists (
      select 1 from public.users 
      where supabase_user_id = auth.uid() 
      and is_admin = true
    ) 
  );

-- SETTINGS Tables (Chat & System)
-- Everyone can read settings
create policy "Chat settings are viewable by everyone"
  on public.chat_settings for select using ( true );

create policy "System settings are viewable by everyone"
  on public.system_settings for select using ( true );

-- Only Admins can update settings
create policy "Admins can update chat settings"
  on public.chat_settings for all
  using ( 
    exists (
      select 1 from public.users 
      where supabase_user_id = auth.uid() 
      and is_admin = true
    ) 
  );

create policy "Admins can update system settings"
  on public.system_settings for all
  using ( 
    exists (
      select 1 from public.users 
      where supabase_user_id = auth.uid() 
      and is_admin = true
    ) 
  );
