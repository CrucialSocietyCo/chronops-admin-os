-- Grant admin access to all current users for development
update public.users 
set is_admin = true 
where is_admin is false or is_admin is null;

-- Ensure default is true for now if desired, or just rely on the update
alter table public.users alter column is_admin set default true;
