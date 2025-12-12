-- Create the analytics_events table
create table if not exists public.analytics_events (
  id uuid default gen_random_uuid() primary key,
  event_name text not null,
  room_id text,
  client_id text,
  ip_hash text,
  user_agent_fingerprint text,
  payload jsonb,
  created_at timestamptz default now()
);

-- Add indexes for performance
create index if not exists idx_analytics_events_created_at on public.analytics_events(created_at);
create index if not exists idx_analytics_events_event_name on public.analytics_events(event_name);

-- Allow anonymous inserts (if using client-side calls directly, though our architecture proxies via server)
-- For this "server-side logging" architecture, we rely on the service_role key which bypasses RLS.
-- However, if you plan to query this from the dashboard client (if that uses anon key), you might need RLS.
-- Since our dashboard endpoint is also server-side, standard RLS defaults (deny all) are fine for public access.
