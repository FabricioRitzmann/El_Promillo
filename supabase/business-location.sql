-- Add reusable business location coordinates for account-level defaults.
-- Safe to run multiple times in the Supabase SQL editor or via Supabase CLI.

alter table public.businesses
add column if not exists location_lat numeric,
add column if not exists location_lng numeric;

alter table public.businesses
drop constraint if exists businesses_location_lat_check;

alter table public.businesses
add constraint businesses_location_lat_check
check (location_lat is null or location_lat between -90 and 90) not valid;

alter table public.businesses
drop constraint if exists businesses_location_lng_check;

alter table public.businesses
add constraint businesses_location_lng_check
check (location_lng is null or location_lng between -180 and 180) not valid;

revoke select, insert, update, delete on public.businesses from authenticated;

grant select (
  id,
  owner_id,
  name,
  description,
  address,
  location_lat,
  location_lng,
  phone,
  website,
  logo_url,
  created_at,
  updated_at
) on public.businesses to authenticated;

grant insert (
  owner_id,
  name,
  description,
  address,
  location_lat,
  location_lng,
  phone,
  website,
  logo_url
) on public.businesses to authenticated;

grant update (
  name,
  description,
  address,
  location_lat,
  location_lng,
  phone,
  website,
  logo_url
) on public.businesses to authenticated;

notify pgrst, 'reload schema';
