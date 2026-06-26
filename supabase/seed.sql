-- Atlas — boilerplate reference data (wallets + a starter category set).
-- Idempotent: safe to run repeatedly (`on conflict do nothing`). Customize everything
-- in-app after install (More → Categories / Wallets / Settings).

insert into wallets (name, sort_order) values
  ('Cash', 1), ('Bank', 2), ('E-Wallet', 3), ('Broker', 4)
on conflict (name) do nothing;

-- Starter categories. "Stock", "Bonds" & "Forex" (investment) MUST exist — the
-- Stocks/Bonds/Forex modules move money into these buckets. The other auto-transaction
-- categories (paylater installment, loan collection, stock & forex profit/loss, bond
-- coupon) are created on first use and can be remapped in More → Settings — see
-- lib/settings.ts.
insert into categories (kind, name, sort_order) values
  ('income', 'Salary', 1), ('income', 'Freelance', 2),
  ('expense', 'Food', 1), ('expense', 'Entertainment', 2), ('expense', 'Other', 3),
  ('saving', 'Trip To Japan', 1),
  ('investment', 'Stock', 1), ('investment', 'Bonds', 2), ('investment', 'Forex', 3)
on conflict (kind, name) do nothing;

-- Installment expense categories — one per provider, plus the default. Marked installment
-- so the stats page can track them separately from normal spending.
insert into categories (kind, name, sort_order, is_installment) values
  ('expense', 'ShopeePaylater', 10, true),
  ('expense', 'GoPayLater', 11, true),
  ('expense', 'Credit Card', 12, true),
  ('expense', 'Cicilan Paylater', 13, true)
on conflict (kind, name) do nothing;

-- Starter installment providers — group paylater items by where they're financed, each
-- linked 1:1 to its installment category. Manage under More → Installment providers.
insert into paylater_providers (name, sort_order) values
  ('ShopeePaylater', 1), ('GoPayLater', 2), ('Credit Card', 3)
on conflict (name) do nothing;

update paylater_providers p
  set category_id = c.id
  from categories c
  where c.kind = 'expense' and c.name = p.name and p.category_id is null;
