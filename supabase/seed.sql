-- Seed reference data (wallets + categories) from the Setup sheet.
-- Idempotent: safe to run repeatedly. Budgets and historical data are loaded
-- separately by scripts/import_xlsx.py.

insert into wallets (name, sort_order) values
  ('Cash', 1), ('Koin', 2), ('Bank Jago', 3), ('Bank BCA', 4), ('Blu', 5),
  ('Shopeepay', 6), ('Gopay', 7), ('Stockbit', 8), ('TempStockbit', 9)
on conflict (name) do nothing;

insert into categories (kind, name, sort_order) values
  -- income
  ('income', 'Gaji', 1), ('income', 'Freelance', 2), ('income', 'Hutang', 3),
  ('income', 'Surprise', 4), ('income', 'Trading', 5), ('income', 'Ambil Tabungan', 6),
  -- expense
  ('expense', 'Food', 1), ('expense', 'Listrik', 2), ('expense', 'Jajan', 3),
  ('expense', 'Kopi', 4), ('expense', 'Susu', 5), ('expense', 'Internet', 6),
  ('expense', 'Akomodasi', 7), ('expense', 'Entertainment', 8), ('expense', 'Traktir', 9),
  ('expense', 'Transportation', 10), ('expense', 'Bayar Hutang', 11), ('expense', 'Biaya Admin', 12),
  ('expense', 'Fitness', 13), ('expense', 'Groceries', 14), ('expense', 'Other', 15),
  ('expense', 'Minjemin', 16), ('expense', 'Fashion', 17), ('expense', 'Liburan', 18),
  ('expense', 'Cut Loss', 19), ('expense', 'Cicilan Paylater', 20),
  -- saving
  ('saving', 'Dana Darurat', 1), ('saving', 'Dana Pensiun', 2), ('saving', 'Jepang', 3),
  ('saving', 'Rumah', 4),
  -- investment
  ('investment', 'Stock', 1), ('investment', 'Bonds', 2)
on conflict (kind, name) do nothing;

-- Forex is now its own module — hide the old "Forex Yen" investment category from pickers
-- (kept archived so existing history still resolves its name).
update categories set archived = true where kind = 'investment' and name = 'Forex Yen';

-- Forex holding (kept on conflict so your edited balance isn't overwritten on re-seed).
insert into forex_accounts (name, currency, units) values ('Forex Yen', 'JPY', 60051.51)
on conflict (name) do nothing;
