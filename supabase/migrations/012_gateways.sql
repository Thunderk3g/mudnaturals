-- 012 · Khalti and Fonepay join eSewa.
--
-- The payment pipeline is already gateway-shaped: attempts are polled, a status
-- becomes a decision, and `confirm_payment` verifies the amount against the
-- snapshot frozen at initiation. What each new gateway needs is only a place to
-- keep the handle its status API answers to — Khalti's `pidx`, Fonepay's
-- `UID`/`BID` pair — plus a discriminator so the poller knows whom to ask.
--
-- The enum values added here must not be *used* later in this same migration:
-- migrations run in one transaction, and Postgres refuses to use an enum value
-- added in the transaction that is still open.

alter type payment_method add value if not exists 'khalti';
alter type payment_method add value if not exists 'fonepay';

alter table payment_attempts
  add column gateway text not null default 'esewa'
    constraint payment_attempts_gateway_known check (gateway in ('esewa', 'khalti', 'fonepay')),

  -- Khalti: the initiate response's `pidx` — the only key its lookup API takes,
  -- so a Khalti attempt is always resolvable server-side, browser or no browser.
  add column khalti_pidx text,

  -- Fonepay: PRN is the merchant reference sent at initiation, capped at 25
  -- characters so an attempt uuid does not fit; UID and BID arrive only on the
  -- browser callback and are what the verification API wants back. An attempt
  -- whose customer never returned therefore has no UID and cannot be verified —
  -- it waits out its window and expires, which the poller handles as NOT_FOUND.
  add column fonepay_prn text,
  add column fonepay_uid text,
  add column fonepay_bid text;

-- Return handlers look attempts up by the gateway's own reference.
create index payment_attempts_khalti_pidx_idx
  on payment_attempts(khalti_pidx) where khalti_pidx is not null;
create unique index payment_attempts_fonepay_prn_uq
  on payment_attempts(fonepay_prn) where fonepay_prn is not null;

-- Which payment methods checkout offers. COD's own on/off and ceiling stay in
-- the `cod` row it always had; this only decides what appears at all.
insert into settings (key, value) values
  ('payments', '{
     "enabled": { "esewa": true, "khalti": true, "fonepay": true, "cod": true }
   }'::jsonb)
on conflict (key) do nothing;
