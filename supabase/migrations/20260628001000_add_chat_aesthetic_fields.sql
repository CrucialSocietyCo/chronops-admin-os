alter table public.chat_settings
add column if not exists window_border_style text default 'System95',
add column if not exists color_theme text default 'Teal Base',
add column if not exists scanline_intensity integer default 0,
add column if not exists admin_badge_style text default 'Star Icon';
