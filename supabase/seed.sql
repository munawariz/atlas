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
