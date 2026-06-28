alter table public.chat_settings
  add column if not exists is_scheduling_enabled boolean default false,
  add column if not exists auto_mode_transition_enabled boolean default false,
  add column if not exists pre_show_time timestamp with time zone null,
  add column if not exists live_event_time timestamp with time zone null,
  add column if not exists afterparty_time timestamp with time zone null;
