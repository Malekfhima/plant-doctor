-- PlantDoctor initial Supabase schema.
-- Run this migration with the Supabase CLI or in the SQL editor.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    language text not null default 'fr'
        check (language in ('fr', 'en', 'ar')),
    theme text not null default 'system'
        check (theme in ('light', 'dark', 'system')),
    notifications boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.plants (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    name text not null check (length(btrim(name)) > 0),
    species text,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint plants_id_user_id_key unique (id, user_id)
);

create table if not exists public.scans (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    plant_id uuid,
    image_path text not null,
    image_hash text not null check (image_hash ~ '^[0-9a-f]{64}$'),
    plant_name text,
    is_healthy boolean not null,
    disease_name text,
    confidence numeric(4, 3) not null
        check (confidence >= 0 and confidence <= 1),
    severity text check (severity in ('low', 'medium', 'high')),
    result jsonb not null,
    language text not null default 'fr'
        check (language in ('fr', 'en', 'ar')),
    search_vector tsvector generated always as (
        to_tsvector(
            'simple',
            coalesce(plant_name, '') || ' ' || coalesce(disease_name, '')
        )
    ) stored,
    created_at timestamptz not null default now(),
    constraint scans_plant_owner_fk
        foreign key (plant_id, user_id)
        references public.plants (id, user_id)
        on delete set null (plant_id)
);

create index if not exists plants_user_created_at_idx
    on public.plants (user_id, created_at desc);

create index if not exists scans_user_created_at_idx
    on public.scans (user_id, created_at desc);

create index if not exists scans_user_image_hash_idx
    on public.scans (user_id, image_hash);

create index if not exists scans_user_plant_id_idx
    on public.scans (user_id, plant_id);

create index if not exists scans_search_idx
    on public.scans using gin (search_vector);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();

drop trigger if exists plants_set_updated_at on public.plants;
create trigger plants_set_updated_at
    before update on public.plants
    for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id)
    values (new.id)
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.plants enable row level security;
alter table public.scans enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
    on public.profiles for select to authenticated
    using ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
    on public.profiles for update to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

drop policy if exists "Users can view their own plants" on public.plants;
create policy "Users can view their own plants"
    on public.plants for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own plants" on public.plants;
create policy "Users can create their own plants"
    on public.plants for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own plants" on public.plants;
create policy "Users can update their own plants"
    on public.plants for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own plants" on public.plants;
create policy "Users can delete their own plants"
    on public.plants for delete to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their own scans" on public.scans;
create policy "Users can view their own scans"
    on public.scans for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own scans" on public.scans;
create policy "Users can create their own scans"
    on public.scans for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own scans" on public.scans;
create policy "Users can update their own scans"
    on public.scans for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own scans" on public.scans;
create policy "Users can delete their own scans"
    on public.scans for delete to authenticated
    using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'scan-images',
    'scan-images',
    false,
    8388608,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view their own scan images" on storage.objects;
create policy "Users can view their own scan images"
    on storage.objects for select to authenticated
    using (
        bucket_id = 'scan-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

drop policy if exists "Users can upload their own scan images" on storage.objects;
create policy "Users can upload their own scan images"
    on storage.objects for insert to authenticated
    with check (
        bucket_id = 'scan-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

drop policy if exists "Users can update their own scan images" on storage.objects;
create policy "Users can update their own scan images"
    on storage.objects for update to authenticated
    using (
        bucket_id = 'scan-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    )
    with check (
        bucket_id = 'scan-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );

drop policy if exists "Users can delete their own scan images" on storage.objects;
create policy "Users can delete their own scan images"
    on storage.objects for delete to authenticated
    using (
        bucket_id = 'scan-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );
