create table if not exists public.scan_daily_usage (
    user_id uuid not null references auth.users (id) on delete cascade,
    quota_date date not null,
    scan_count integer not null default 0 check (scan_count >= 0),
    updated_at timestamptz not null default now(),
    primary key (user_id, quota_date)
);

alter table public.scan_daily_usage enable row level security;

drop policy if exists "Users can view their own daily scan usage"
    on public.scan_daily_usage;
create policy "Users can view their own daily scan usage"
    on public.scan_daily_usage for select to authenticated
    using ((select auth.uid()) = user_id);

create or replace function public.reserve_daily_scan_quota(
    p_user_id uuid,
    p_daily_quota integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_count integer;
begin
    if p_daily_quota < 1 then
        raise exception using
            errcode = '22023',
            message = 'DAILY_QUOTA_INVALID';
    end if;

    insert into public.scan_daily_usage (user_id, quota_date, scan_count)
    values (p_user_id, (timezone('UTC', now()))::date, 1)
    on conflict (user_id, quota_date) do update
    set scan_count = public.scan_daily_usage.scan_count + 1,
        updated_at = now()
    where public.scan_daily_usage.scan_count < p_daily_quota
    returning scan_count into current_count;

    if current_count is null then
        raise exception using
            errcode = 'P0001',
            message = 'DAILY_QUOTA_EXCEEDED';
    end if;
    return current_count;
end;
$$;

revoke all on function public.reserve_daily_scan_quota(uuid, integer)
    from public, anon, authenticated;
grant execute on function public.reserve_daily_scan_quota(uuid, integer)
    to service_role;
