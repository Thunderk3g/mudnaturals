-- 013 · Let place_order exist.
--
-- place_order prices, reserves and writes order_items inside its pricing loop,
-- and only inserts the orders row afterwards, once the totals are known. The
-- foreign key from order_items to orders checked immediately, so every call
-- died on the first item — the function had never once succeeded, which is why
-- the orders table held zero rows on 23 Aug 2026 despite two days of "working"
-- checkout. It surfaced the moment an end-to-end smoke placed a real order.
--
-- Deferring the check moves it to commit, which for a single-statement function
-- call is the end of that same call: the orders row exists by then, and a call
-- that fails part-way still rolls back whole. Nothing about the invariant is
-- given up — an order_items row still cannot outlive the transaction without
-- its order.
alter table order_items
  alter constraint order_items_order_id_fkey deferrable initially deferred;
