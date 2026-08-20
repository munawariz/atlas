-- Atlas — starting data. FRESH DATABASES ONLY.
--
-- Never run this against a populated database (see ATLAS.md §18.2). Every statement is
-- `on conflict do nothing` regardless, so a stray run cannot clobber live data.
--
-- This is the ONE file allowed to contain category names: it proposes starting data rather
-- than resolving anything at runtime. Everywhere else, categories resolve by id through
-- app_settings (ATLAS.md §14.14).

-- ---------------------------------------------------------------------------
-- Wallets
-- ---------------------------------------------------------------------------
insert into wallets (name, sort_order) values
  ('Cash', 0), ('Bank', 1), ('E-Wallet', 2), ('Broker', 3)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
insert into categories (kind, name, sort_order) values
  ('income', 'Salary', 0),
  ('income', 'Freelance', 1),
  ('income', 'Loan Repayment', 2),
  ('income', 'Trading Profit', 3),
  ('income', 'Dividend', 4),
  ('income', 'Bond Coupon', 5),
  ('income', 'Forex Profit', 6),
  ('income', 'Crypto Profit', 7)
on conflict (kind, name) do nothing;

insert into categories (kind, name, sort_order) values
  ('expense', 'Food', 0),
  ('expense', 'Entertainment', 1),
  ('expense', 'Other', 2),
  ('expense', 'Realized Loss', 3),
  ('expense', 'Forex Loss', 4),
  ('expense', 'Crypto Loss', 5)
on conflict (kind, name) do nothing;

insert into categories (kind, name, sort_order) values
  ('saving', 'Emergency Fund', 0)
on conflict (kind, name) do nothing;

insert into categories (kind, name, sort_order) values
  ('investment', 'Stock', 0),
  ('investment', 'Bonds', 1),
  ('investment', 'Forex', 2),
  ('investment', 'Crypto', 3)
on conflict (kind, name) do nothing;

-- ---------------------------------------------------------------------------
-- Installment providers, each with a matching is_installment expense category, linked 1:1.
-- ---------------------------------------------------------------------------
insert into paylater_providers (name, sort_order) values
  ('Credit Card', 0), ('Paylater', 1), ('Store Credit', 2)
on conflict (name) do nothing;

insert into categories (kind, name, is_installment, sort_order)
  select 'expense', p.name, true, 10 + p.sort_order from paylater_providers p
  on conflict (kind, name) do update set is_installment = true;

update paylater_providers p set category_id = c.id from categories c
  where c.kind = 'expense' and c.name = p.name and p.category_id is null;

-- ---------------------------------------------------------------------------
-- app_settings mappings.
--
-- Nothing is auto-created at runtime, so without these a fresh install starts fully
-- unmapped and every automated feature refuses until the user visits Settings.
-- Resolve by name here, once, at seed time.
--
-- `on conflict do nothing` matters twice over: it makes the seed safe to re-run, and it
-- means the seed can never overwrite a mapping an adopted database already has.
-- ---------------------------------------------------------------------------
insert into app_settings (key, value)
select v.key, c.id::text
from (values
  ('cat_loan','income','Loan Repayment'),        ('cat_stock','investment','Stock'),
  ('cat_stock_profit','income','Trading Profit'), ('cat_stock_loss','expense','Realized Loss'),
  ('cat_stock_dividend','income','Dividend'),     ('cat_bond','investment','Bonds'),
  ('cat_bond_coupon','income','Bond Coupon'),     ('cat_forex','investment','Forex'),
  ('cat_forex_profit','income','Forex Profit'),   ('cat_forex_loss','expense','Forex Loss'),
  ('cat_crypto','investment','Crypto'),           ('cat_crypto_profit','income','Crypto Profit'),
  ('cat_crypto_loss','expense','Crypto Loss')
) as v(key, kind, name)
join categories c on c.kind = v.kind::category_kind and c.name = v.name
on conflict (key) do nothing;

-- Default wallets for the stock, bond and crypto forms.
insert into app_settings (key, value)
select v.key, w.id::text
from (values ('wallet_stock','Broker'), ('wallet_bond','Broker'), ('wallet_crypto','Broker')) as v(key, name)
join wallets w on w.name = v.name
on conflict (key) do nothing;
