-- Create Storage Bucket (Idempotent)
insert into storage.buckets (id, name, public)
values ('audio-drops', 'audio-drops', true)
on conflict (id) do nothing;

-- Policy: Public Read Access
drop policy if exists "Public Access" on storage.objects;
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'audio-drops' );

-- Policy: Admin Upload Access
drop policy if exists "Authenticated Uploads" on storage.objects;
create policy "Authenticated Uploads"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'audio-drops' );
