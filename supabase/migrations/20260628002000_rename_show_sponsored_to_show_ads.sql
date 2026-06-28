do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events'
      and column_name = 'show_sponsored'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events'
      and column_name = 'show_ads'
  ) then
    alter table public.events rename column show_sponsored to show_ads;
  end if;
end $$;

alter table public.events
  add column if not exists show_ads boolean default true;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events'
      and column_name = 'show_sponsored'
  ) then
    update public.events
    set show_ads = coalesce(show_ads, show_sponsored, true);
  end if;
end $$;

alter table public.events
  alter column show_ads set default true;

alter table public.events
  drop column if exists show_sponsored;
