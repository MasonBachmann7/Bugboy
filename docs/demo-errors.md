# BugBoy demo errors

Reference for the five seeded runtime errors that bugstack captures
for the homepage hero screenshot. The hosted BugBoy app is the demo
target — its entire purpose is to break in predictable ways when each
trigger fires.

## The five errors

| # | Route | Method | Error message | Expected dashboard status | Trigger notes |
|---|---|---|---|---|---|
| 1 | `/api/admin/metrics` | GET | `Failed to connect to Redis: ECONNREFUSED redis:6379` | Out of scope | Single GET. Fires whenever `REDIS_URL` points at a non-listening host (default `redis://redis-not-here:6379`). |
| 2 | `/api/orders` | POST | `CheckViolation: stock_must_be_non_negative` | Auto-deployed | **10 concurrent POSTs** for `prod_005` with `quantity=5`. Race on read-then-write decrement; first wins, rest fail the CHECK constraint. Run `pnpm run demo:seed` first to reset stock to 5. |
| 3 | `/api/users/[id]` | GET | `Cannot read properties of undefined (reading 'avatarUrl')` | PR ready | Hit `/api/users/usr_7g8h9i` — the seed user with `profile: null` (SSO user, profile not yet synced). |
| 4 | `/api/notifications` | POST | `Unhandled promise rejection: Notification queue unavailable` | Auto-deployed | Single POST with `{userId, message}`. Route returns 200; the queue helper rejects asynchronously with no `.catch`, surfacing as an unhandled rejection at the process level. |
| 5 | `/api/products` | GET | `Cannot read properties of null (reading 'name')` | PR ready | GET `/api/products?id=<does_not_exist>` — `findUnique` returns null, handler reads `product.name` without guarding. |

## Trigger order for screenshot day

The dashboard sorts by recency (most recent first). Trigger oldest
first so the rendered top-to-bottom order is: **#1 (Out of scope) →
#2 → #3 → #4 → #5**.

| Bug | Trigger this many hours before screenshot |
|---|---|
| #5 products | 120h (5d) |
| #4 notifications | 96h (4d) |
| #3 users/[id] | 48h (2d) |
| #2 orders (race) | 24h (1d) |
| #1 admin/metrics | 5h |

After triggering #2, wait ~2 minutes and verify the dashboard row
reads `Auto-deployed` (not `Failed` or stuck `In progress`). If
bugstack hasn't auto-deployed within ~10 minutes, check whether the
DB constraint is actually present in the deployed schema (see
`db/migrations/20240122_add_stock_check.sql`).

## Running the triggers

```bash
# Reset prod_005 stock to 5 first (only matters for bug #2)
pnpm run demo:seed

# Fire one specific bug
pnpm run demo:errors -- --bug=2

# Fire all five in trigger-schedule order
pnpm run demo:errors -- --bug=all
```

`DEMO_TARGET_URL` defaults to `http://localhost:3000`. For the hosted
demo, set it to whichever URL BugBoy is deployed at (e.g.
`DEMO_TARGET_URL=https://bugboy.bugstack.ai pnpm run demo:errors -- --bug=all`).

## Environment

| Var | Purpose | Demo value |
|---|---|---|
| `BUGSTACK_API_KEY` | bugstack SDK auth | (set by hosting env) |
| `REDIS_URL` | Redis target for `/api/admin/metrics` | `redis://redis-not-here:6379` |
| `NOTIFICATION_QUEUE_URL` | Notification queue target | `queue://notifications` (no worker) |

## Schema constraint

Bug #2 depends on a database-level CHECK constraint. The mock db in
`lib/db.ts` simulates the constraint so the bug fires in this repo
out-of-the-box; the SQL artifact at
`db/migrations/20240122_add_stock_check.sql` is the equivalent
migration to run when wiring this up against a real Postgres.
