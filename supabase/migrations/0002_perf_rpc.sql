-- 0002_perf_rpc.sql — read-only aggregate functions.
--
-- Run with:  node scripts/migrate.mjs supabase/migrations/0002_perf_rpc.sql
--
-- Each function replaces a whole-table scan the app used to do in JS (charts, savings,
-- forex-linked ids, data years, recent categories). The JS implementations remain in the
-- app as fallbacks — a database that has not run this migration keeps working, the app just
-- pays the old scan cost (lib code detects PGRST202/42883 "function does not exist").
--
-- All functions are STABLE and read-only. Every numeric they emit is an IDR bigint sum,
-- far inside double precision, so jsonb numbers are safe.

-- =============================================================================
-- fn_chart_data — everything /charts needs, aggregated in one query.
--
-- Mirrors lib/data.ts getChartData EXACTLY (money correctness, ATLAS.md §3.3):
--   * transfers are excluded from flows and per-category aggregates;
--   * a withdrawal NETS AGAINST ITS BUCKET'S KIND (saving/investment), it is never income;
--   * monthDelta counts a row only when the wallet slot its type uses is non-null;
--   * descriptions are whitespace-normalized so "Coffee  run" and "Coffee run" collapse;
--   * catEntries.max is the largest UNSIGNED amount while total is withdrawal-signed.
-- Net worth composition (opening baseline + cumulative deltas) stays in JS, where the
-- opening-month rule lives.
-- =============================================================================

create or replace function fn_chart_data()
returns jsonb
language sql
stable
as $fn$
with txn as (
  select
    (date_trunc('month', t.occurred_on)::date)::text as month,
    t.occurred_on::text as day,
    t.type::text as type,
    t.amount,
    t.category_id,
    t.source_wallet_id,
    t.dest_wallet_id,
    trim(regexp_replace(coalesce(t.description, ''), '\s+', ' ', 'g')) as note,
    c.kind::text as kind
  from transactions t
  left join categories c on c.id = t.category_id
),
flows as (
  select month,
    coalesce(sum(amount) filter (where type = 'income'), 0) as income,
    coalesce(sum(amount) filter (where type = 'expense'), 0) as expense,
    coalesce(sum(amount) filter (where type = 'saving'), 0)
      - coalesce(sum(amount) filter (where type = 'withdrawal' and kind = 'saving'), 0) as saving,
    coalesce(sum(amount) filter (where type = 'investment'), 0)
      - coalesce(sum(amount) filter (where type = 'withdrawal' and kind = 'investment'), 0) as investment
  from txn
  where type <> 'transfer'
  group by month
),
daily_flows as (
  select day,
    coalesce(sum(amount) filter (where type = 'income'), 0) as income,
    coalesce(sum(amount) filter (where type = 'expense'), 0) as expense,
    coalesce(sum(amount) filter (where type = 'saving'), 0)
      - coalesce(sum(amount) filter (where type = 'withdrawal' and kind = 'saving'), 0) as saving,
    coalesce(sum(amount) filter (where type = 'investment'), 0)
      - coalesce(sum(amount) filter (where type = 'withdrawal' and kind = 'investment'), 0) as investment
  from txn
  where type <> 'transfer'
  group by day
),
cat_totals as (
  select month, category_id, kind,
    sum(case when type = 'withdrawal' then -amount else amount end) as total
  from txn
  where type <> 'transfer' and category_id is not null and kind is not null
  group by month, category_id, kind
),
cat_entries as (
  select month, category_id, note,
    count(*) as cnt,
    sum(case when type = 'withdrawal' then -amount else amount end) as total,
    max(amount) as max_amt
  from txn
  where type <> 'transfer' and category_id is not null and kind is not null
  group by month, category_id, note
),
month_delta as (
  select month,
    sum(case when type in ('income', 'withdrawal') then amount else -amount end) as delta
  from txn
  where type <> 'transfer'
    and (
      (type in ('income', 'withdrawal') and dest_wallet_id is not null)
      or (type in ('expense', 'saving', 'investment') and source_wallet_id is not null)
    )
  group by month
)
select jsonb_build_object(
  'flows', coalesce((
    select jsonb_object_agg(month, jsonb_build_object(
      'income', income, 'expense', expense, 'saving', saving, 'investment', investment))
    from flows
  ), '{}'::jsonb),
  'dailyFlows', coalesce((
    select jsonb_object_agg(day, jsonb_build_object(
      'income', income, 'expense', expense, 'saving', saving, 'investment', investment))
    from daily_flows
  ), '{}'::jsonb),
  'catTotals', coalesce((
    select jsonb_object_agg(month, per_month)
    from (
      select month, jsonb_object_agg(category_id::text,
        jsonb_build_object('kind', kind, 'total', total)) as per_month
      from cat_totals
      group by month
    ) x
  ), '{}'::jsonb),
  'catEntries', coalesce((
    select jsonb_object_agg(month, per_month)
    from (
      select month, jsonb_object_agg(category_id::text, per_cat) as per_month
      from (
        select month, category_id, jsonb_object_agg(note, jsonb_build_object(
          'description', note, 'count', cnt, 'total', total, 'max', max_amt)) as per_cat
        from cat_entries
        group by month, category_id
      ) inner_agg
      group by month
    ) outer_agg
  ), '{}'::jsonb),
  'monthDelta', coalesce((
    select jsonb_object_agg(month, delta) from month_delta
  ), '{}'::jsonb)
)
$fn$;

-- =============================================================================
-- fn_savings_buckets — per-category contributed/withdrawn totals.
-- The app joins these against ACTIVE saving/investment categories (ATLAS.md §14.10) and
-- computes balance = contributed - withdrawn, exactly as the JS scan did.
-- =============================================================================

create or replace function fn_savings_buckets(p_as_of date default null)
returns table(category_id bigint, contributed bigint, withdrawn bigint)
language sql
stable
as $fn$
  select t.category_id,
    coalesce(sum(t.amount) filter (where t.type <> 'withdrawal'), 0)::bigint as contributed,
    coalesce(sum(t.amount) filter (where t.type = 'withdrawal'), 0)::bigint as withdrawn
  from transactions t
  where t.type in ('saving', 'investment', 'withdrawal')
    and t.category_id is not null
    and (p_as_of is null or t.occurred_on <= p_as_of)
  group by t.category_id
$fn$;

-- =============================================================================
-- fn_forex_linked_txn_ids — every ledger txn id booked by the forex module.
-- Replaces fetching the whole forex_transactions table for an id set.
-- =============================================================================

create or replace function fn_forex_linked_txn_ids()
returns table(id bigint)
language sql
stable
as $fn$
  select distinct f.txn_id from forex_transactions f where f.txn_id is not null
  union
  select distinct f.pl_txn_id from forex_transactions f where f.pl_txn_id is not null
$fn$;

-- =============================================================================
-- fn_txn_date_range — min/max ledger dates in one round trip (getDataYears used two).
-- =============================================================================

create or replace function fn_txn_date_range()
returns table(min_day date, max_day date)
language sql
stable
as $fn$
  select min(occurred_on), max(occurred_on) from transactions
$fn$;

-- =============================================================================
-- fn_recent_category_ids — distinct categories of the latest ENTERED rows (id order,
-- ATLAS.md: what you just added is always at the front). The JS version approximated this
-- from the last 60 rows; the aggregate is exact over the whole ledger.
-- =============================================================================

create or replace function fn_recent_category_ids(p_limit int default 5)
returns table(category_id bigint)
language sql
stable
as $fn$
  select t.category_id
  from (
    select category_id, max(id) as latest_id
    from transactions
    where category_id is not null
    group by category_id
    order by latest_id desc
    limit p_limit
  ) t
  order by t.latest_id desc
$fn$;
