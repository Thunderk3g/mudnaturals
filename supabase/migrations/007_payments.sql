-- 007 · Payments: attempts, events, refunds.
--
-- eSewa ePay v2 has no reliable server-to-server notification. The browser
-- redirect plus our own polling of the status API is the entire notification
-- surface, so the reconciliation cron is the primary confirmation channel and
-- every structure here is built to be polled and replayed safely.

create table payment_attempts (
  -- The primary key IS the transaction_uuid sent to eSewa. Per-request
  -- uniqueness is a gateway requirement, and a UUIDv4 is unguessable, which
  -- matters because the status API takes no authentication.
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  status        payment_attempt_status not null default 'initiated',

  -- Frozen at initiation. Confirmation verifies against this snapshot and never
  -- re-derives the price: re-pricing at callback time strands captured payments
  -- when a price or promotion changes mid-flight.
  amount_paisa  integer not null,
  product_code  text not null,

  esewa_transaction_code text,
  esewa_ref_id           text,
  last_status_raw        text,
  last_polled_at         timestamptz,
  poll_attempts          int not null default 0,
  signature_valid        boolean,

  expires_at    timestamptz not null default (now() + interval '15 minutes'),
  succeeded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint payment_attempts_amount_positive check (amount_paisa > 0),
  constraint payment_attempts_polls_non_negative check (poll_attempts >= 0)
);
-- At most one successful attempt per order. Double-charge-then-double-ship
-- becomes structurally impossible rather than merely unlikely.
create unique index payment_attempts_one_success_uq
  on payment_attempts(order_id) where status = 'succeeded';
create index payment_attempts_order_id_idx on payment_attempts(order_id);
-- The reconciliation cron's work queue.
create index payment_attempts_poll_queue_idx
  on payment_attempts(last_polled_at nulls first)
  where status in ('initiated', 'pending', 'ambiguous');
create trigger payment_attempts_updated_at before update on payment_attempts
  for each row execute function public.set_updated_at();
alter table payment_attempts enable row level security;

-- Append-only audit of everything the gateway ever told us, and everything we
-- did about it. Dedupe is on (attempt, code, status) so a replayed callback is
-- inert while a genuinely new state still lands.
create table payment_events (
  id         bigserial primary key,
  attempt_id uuid references payment_attempts(id) on delete cascade,
  order_id   uuid references orders(id) on delete cascade,
  source     text not null,
  event      text not null,
  raw_payload jsonb,
  signature_valid boolean,
  processed  boolean not null default false,
  actor      uuid,
  created_at timestamptz not null default now(),
  constraint payment_events_source_known check (
    source in ('initiate', 'return_success', 'return_failure', 'cron', 'admin', 'cod')
  )
);
create index payment_events_attempt_id_idx on payment_events(attempt_id, created_at);
create index payment_events_order_id_idx   on payment_events(order_id, created_at);
-- Defect C2 in the reference: it deduped on the event id alone, so a failed
-- apply could never be retried — the retry hit the conflict branch and got 200.
-- Deduping on (…, processed) means an unprocessed event is still replayable.
create unique index payment_events_dedupe_uq
  on payment_events(attempt_id, event, processed) where processed;
alter table payment_events enable row level security;
create trigger payment_events_no_delete before delete on payment_events
  for each row execute function public.reject_ledger_mutation();

-- Refunds are operator-driven: eSewa documents no refund API, and third-party
-- claims to the contrary are unsourced. The operator acts in the merchant
-- portal and records the reference here; the cron detects the status flipping
-- to FULL_REFUND / PARTIAL_REFUND and reconciles the order.
create table refunds (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete restrict,
  amount_paisa integer not null,
  reason       text,
  status       text not null default 'requested',
  external_reference text,
  requested_by uuid,
  approved_by  uuid,
  restock      boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint refunds_amount_positive check (amount_paisa > 0),
  constraint refunds_status_known check (status in ('requested', 'approved', 'completed', 'rejected'))
);
create index refunds_order_id_idx on refunds(order_id);
create trigger refunds_updated_at before update on refunds
  for each row execute function public.set_updated_at();
alter table refunds enable row level security;

create table shipments (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  carrier     text,
  tracking_ref text,
  shipped_at  timestamptz,
  delivered_at timestamptz,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index shipments_order_id_idx on shipments(order_id);
create trigger shipments_updated_at before update on shipments
  for each row execute function public.set_updated_at();
alter table shipments enable row level security;
