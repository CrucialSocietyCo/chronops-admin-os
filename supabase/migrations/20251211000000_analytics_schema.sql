-- Create app_events table
create table if not exists public.app_events (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  event_type text not null, -- 'message_sent', 'user_registered', 'room_joined', 'room_left', 'user_muted', 'user_banned', etc.
  user_id uuid references auth.users(id),
  actor_id uuid references auth.users(id), -- Who performed the action (for bans/mutes)
  room_id text,
  payload jsonb default '{}'::jsonb
);

-- Enable RLS
alter table public.app_events enable row level security;

-- Policy: Public can INSERT (for logging events) but only Admin can READ?
-- Actually, for analytics, only Admin needs to READ.
-- All authenticated users (or even guests via anon) might need to INSERT events like 'room_joined'.

create policy "Admins can view all events"
  on public.app_events for select
  to authenticated
  using (
    exists (
      select 1 from public.users 
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );

create policy "Everyone can insert events"
  on public.app_events for insert
  to anon, authenticated
  with check (true);

-- Enable Realtime for app_events
alter publication supabase_realtime add table public.app_events;

-- View: chatroom_stats (Global Aggregates)
create or replace view public.chatroom_stats as
select
  count(*) filter (where event_type = 'message_sent') as total_messages,
  count(*) filter (
    where event_type in ('user_muted', 'user_banned', 'message_deleted')
  ) as moderation_actions,
  -- Calculate max concurrent users in last 24h (Approximation using rolling windows or just max room_joined events? 
  -- The user's requested logic was a bit complex for a simple view, let's simplify for now or use their exact query if possible).
  -- User's query:
  (
    select max(c) from (
        select count(*) over (order by created_at rows between unbounded preceding and current row) as c
        from app_events where event_type = 'room_joined' and created_at > now() - interval '24 hours'
    ) as sub
  ) as max_concurrent_24h,
  -- Current Active (Unique users in last 5 mins)
  count(distinct user_id) filter (
    where event_type in ('room_joined', 'message_sent')
      and created_at >= now() - interval '5 minutes'
  ) as current_active
from public.app_events;

-- View: daily_activity (For Charts)
create or replace view public.daily_activity as
select
  date_trunc('day', created_at)::date as day,
  count(*) filter (where event_type = 'message_sent') as messages,
  count(distinct user_id) filter (where event_type = 'message_sent') as active_senders,
  count(*) filter (where event_type = 'user_registered') as new_users,
  count(*) filter (
    where event_type in ('user_muted', 'user_banned')
  ) as moderation_events
from public.app_events
group by day
order by day desc
limit 14;

-- Grant permissions
grant select, insert on public.app_events to anon, authenticated, service_role;
grant select on public.chatroom_stats to anon, authenticated, service_role;
grant select on public.daily_activity to anon, authenticated, service_role;
