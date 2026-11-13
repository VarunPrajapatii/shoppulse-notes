# Idempotency in HTTP APIs — Patterns, Pitfalls, and Implementation

> **Audience:** backend engineers, system-design interview prep.
> **Goal:** understand *why* idempotency matters, *what* it actually guarantees,
> *how* the industry implements it (Stripe, AWS, Razorpay, GitHub), and *how*
> we implement it in this codebase as a reusable helper.

---

## 1. The problem in one sentence

> *The same logical request can hit your server more than once, and you must
> not perform the underlying side-effect more than once.*

If a customer clicks **"Submit return"** and your server creates a
`ReturnRequest` row, you do **not** want a second click (or a network retry,
or a serverless cold-start re-invocation, or a load-balancer replay) to
create a second row.

### Why does the same request arrive twice?

| Source | Why it duplicates |
|---|---|
| Double-click / double-tap | Customer is impatient, button not disabled fast enough |
| React Strict Mode (dev) | Effects run twice on purpose |
| Browser back-then-resubmit | Clicks "post" again |
| Network retry by client | `fetch` failed mid-flight → retry library re-fires |
| Mobile carrier / proxy retry | Some carriers retry idle requests after timeout |
| Vercel / API gateway retry | Edge layer reissues on 5xx |
| Serverless cold-start | First invocation timed out, platform launches a fresh one |
| Razorpay/Shiprocket webhooks | Provider retries until they receive 2xx |
| User in two tabs | Two browsers, same intent, same moment |

**You cannot solve this on the client.** Disabling the submit button helps,
but it doesn't help with serverless retries, webhook replays, or malicious
double-POSTs. **Server-side idempotency is the only correct answer.**

---

## 2. What "idempotent" actually means (precise)

A request is idempotent if **executing it `N` times has the same observable
effect as executing it once**, for any `N ≥ 1`, with the same response body
and the same side-effects.

This is **not** the same as "safe":
- **Safe** = no side-effects at all (e.g. `GET`).
- **Idempotent** = side-effects are bounded; running it again is a no-op or
  returns the same answer.

Per the HTTP spec:

| Method | Safe | Idempotent (by spec) |
|---|---|---|
| `GET`, `HEAD` | ✅ | ✅ |
| `PUT` | ❌ | ✅ — replacing X with the same payload twice = same result |
| `DELETE` | ❌ | ✅ — deleting an already-deleted resource is a no-op |
| `POST` | ❌ | ❌ — creates a new thing every time **by default** |

`POST` is **not** idempotent by spec. We have to **make it idempotent
ourselves** when we want it to be — using an idempotency key.

---

## 3. The idempotency-key pattern (canonical)

The pattern used by Stripe, AWS, Razorpay, GitHub, Shopify:

1. **Client generates a unique key per logical request.**
   - A UUID v4 is the simplest choice. Stripe accepts up to 255 chars.
   - The key is generated **once per intent**. If the user clicks Submit,
     the same key is used for every retry of that submission.
   - Different intents → different keys.
2. **Client passes the key in a header**: `Idempotency-Key: <uuid>` (or
   `X-Submission-Id`, `X-Request-Id` — convention varies).
3. **Server, on receiving the request:**
   - Look up the key in a fast store (Redis, DynamoDB).
   - **Hit** → return the previously-cached response *as-is*. Do **not**
     re-run the work. Do **not** re-validate the body (you already did).
   - **Miss** → run the work. On success, **cache the response** under the
     key with a TTL (24h is a typical industry default). Return the result.
4. **Failures (4xx/5xx) are usually NOT cached.** A retry should re-run
   validation. Stripe caches *all* responses (including 4xx) for safety;
   AWS caches only successes. Both are defensible — pick one and document.
5. **TTL** is critical. Without expiry, your cache grows forever. 24h is a
   sane default for human-driven flows; 1h for high-volume APIs.

---

## 4. Where it gets tricky — race conditions

### Scenario: "two requests arrive at the same millisecond"

Two retries hit the server within microseconds of each other. Both check the
cache → both miss → both start the work → both create a `ReturnRequest`.
You're back where you started.

### Three real fixes

**Fix A — atomic SETNX lock (simple, used by Stripe):**

```ts
// Try to claim the key with NX (only-if-not-exists).
const claimed = await redis.set(
  `idem:${key}:lock`,
  'IN_PROGRESS',
  'EX', 60,         // 60s lock TTL — long enough for the work to complete
  'NX'              // atomic "only set if not already set"
);
if (claimed === null) {
  // Someone else is already working on this key.
  // Either wait + retry the cache GET, or return 409 "in progress".
  return { status: 409, body: { error: 'IDEMPOTENCY_IN_PROGRESS' } };
}
// We hold the lock. Run the work, cache the result, release the lock.
```

**Fix B — database unique constraint as the ultimate guard:**

If the underlying entity has a natural unique key (e.g. an order can have at
most one active return), enforce it with a `UNIQUE` index. Even if two
concurrent requests both pass the cache check, the second `INSERT` fails
with a unique-violation, and you can map that error back to "look up the
existing row and return it."

This is the pattern Stripe uses for `PaymentIntent` — every payment intent
has a `client_secret` that's unique by construction; even if two requests
slip through, only one row can ever exist.

**Fix C — write-then-check (compare-and-swap):**

Race-tolerant ordering:
1. Insert a "pending" row keyed by the idempotency key.
2. Run the work, populate the row.
3. On retry, the second request sees the pending row and waits/replays.

We use **Fix A + Fix B together** in this codebase. The Redis cache de-dupes
99% of duplicates; the DB-side `(orderId, status)` semantics catch the rest.

---

## 5. What gets cached, exactly

The **response body the client would have seen** — not the internal state.
Reason: a retry should return *exactly* what the original returned, byte-for-byte
if possible, so the client never has to handle "the same key gave me a
different shape". For most APIs that means:

- HTTP status code.
- Response body (JSON).
- Optionally: response headers that the client cares about (`ETag`, etc.).

It does **not** include:
- Server-side state. The state is in the DB; the cache only echoes the API.
- Headers like `Set-Cookie` (you might want to re-issue them per-request).

---

## 6. Scope — namespace your keys

A single Redis key namespace for *all* idempotency in your app is asking for
collisions. Different endpoints can — and will — receive the same UUID from
different clients.

**Always namespace by logical scope:**

```
idem:returns:submit:<storeId>:<orderId>:<submissionId>
idem:orders:checkout:<storeId>:<userId>:<idemKey>
idem:refunds:create:<storeId>:<idemKey>
```

This also lets you tune TTL per scope (24h for human submits, 1h for
machine APIs) and reason about cache size per feature.

---

## 7. Failure modes — what happens when Redis is down?

Two camps:

**Strict camp** (PCI / fintech):
- If the cache is unreachable, **reject** the request with 503. Better to
  refuse a transaction than to risk a duplicate charge.

**Pragmatic camp** (most product APIs):
- If the cache is unreachable, **fall through** as if it were a miss.
  Worst case: a network retry creates a duplicate. The DB unique constraint
  + monitoring catch it. The cost of refusing all submits during a Redis
  outage is far higher than the cost of one or two duplicates.

Our codebase uses the **pragmatic camp** (graceful degradation). All cache
helpers `try/catch` Redis errors, log a warning, and return "no cache". The
underlying business invariants (can't create two pickup bundles for the
same return, etc.) are enforced at the DB layer.

---

## 8. The reusable helper in this repo

Lives at `src/lib/idempotency.ts`. Three primitives:

```ts
// 1. Read an idempotency key off a Request.
export function readIdempotencyKey(req: Request): string | null;

// 2. Manual two-call pattern (when you need to control where the cache
//    write happens — e.g. only after a successful transaction commit).
export async function getCachedResponse<T>(opts: IdempotencyOptions): Promise<T | null>;
export async function cacheResponse<T>(opts: IdempotencyOptions, body: T): Promise<void>;

// 3. High-level wrapper — handles the lifecycle.
export async function withIdempotency<T>(
  opts: IdempotencyOptions,
  fn: () => Promise<T>
): Promise<{ value: T; replayed: boolean }>;
```

Where:

```ts
interface IdempotencyOptions {
  scope: string;            // logical namespace, e.g. 'returns:submit'
  key: string;              // composite cache key (no need to include scope)
  ttlSeconds?: number;      // default 86400 (24h)
}
```

### Usage example — POST /returns

```ts
const submissionId = readIdempotencyKey(req);
if (submissionId) {
  const cached = await getCachedResponse<SubmitResponse>({
    scope: 'returns:submit',
    key: `${storeId}:${orderId}:${submissionId}`,
  });
  if (cached) return NextResponse.json(cached, { status: 201 });
}

const result = await submitMultiSlice(input);

if (submissionId) {
  await cacheResponse({
    scope: 'returns:submit',
    key: `${storeId}:${orderId}:${submissionId}`,
  }, result);
}
return NextResponse.json(result, { status: 201 });
```

### Usage example — anywhere else

```ts
const { value, replayed } = await withIdempotency(
  { scope: 'orders:cancel', key: `${storeId}:${orderId}:${idemKey}` },
  () => cancelOrder({ storeId, orderId }),
);
return NextResponse.json(value, { status: replayed ? 200 : 201 });
```

---

## 9. Interview talking points

If someone asks you to design idempotency for a payments API:

1. **State the contract first.** "Same key + same payload = same response,
   guaranteed for 24h after first success."
2. **Mention the key format.** UUID v4 is fine; the server should validate
   shape (8-128 chars, ASCII-safe charset) so a malicious client can't pin
   gigabytes of garbage in the cache.
3. **Mention the storage choice.** Redis with TTL is the industry default.
   DynamoDB with TTL is the AWS-native equivalent. Both give O(1) lookup.
4. **Mention the race fix.** SETNX lock OR DB unique constraint. Best teams
   use both.
5. **Mention what NOT to do.** Don't cache by request body hash — clients
   legitimately resubmit with the same body for two different intents
   (e.g. "create another invoice with the same line items"). Always rely
   on the client-supplied key.
6. **Mention the failure mode.** What does the system do when Redis is
   down? Fail-closed (reject) for high-stakes flows, fail-open (degrade
   gracefully) for product flows. Document the choice.
7. **Mention header normalisation.** `Idempotency-Key` is the de-facto
   standard. Accept variants (`X-Idempotency-Key`, `X-Request-Id`,
   `X-Submission-Id`) at your boundary if you want to be friendly.
8. **Mention monitoring.** Log every cache hit. Alert on hit-rate spikes
   (suggests retry storms) and on `setnx` collisions (suggests a buggy
   client).

### Questions an interviewer often follows up with

- *"What if the client sends the same key with a different body?"* —
  Stripe answer: 422 with a "key already used with different params" error.
  Cheaper answer: ignore the body, replay the original response.
- *"What if the server crashes mid-work, after deducting stock but before
  caching the response?"* — That's why the underlying work must itself be
  transactional. Idempotency is a layer **on top of** transactional
  correctness, not a substitute for it.
- *"Why not use the request body as the key?"* — Two distinct intents can
  legitimately have the same body (e.g. "buy 1 unit" twice). Only the
  client knows whether two submissions are the same intent or two distinct
  ones.

---

## 10. Pitfalls we've seen and avoided

- **Caching the request body to compare on retry.** Doubles cache size,
  doesn't add safety. Skipped.
- **Caching errors.** A 500 cached for 24h means a user can't retry a
  transient failure. Cache only 2xx.
- **Forgetting to pass the key on retry.** Client must reuse the same key
  on every retry of the same intent. New click = new key. Document this
  contract clearly to API consumers.
- **Using `setex` without `nx`.** Two requests both call `set` and the
  second silently overwrites the first's cached response. Use `set ... nx`
  or do "get → if miss, run → set", but be aware the get→run→set window
  is racy unless you also hold a lock.

---

## 11. Further reading

- [Stripe — Idempotent Requests](https://stripe.com/docs/api/idempotent_requests)
- [AWS — Idempotency in Lambda](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html)
- [IETF Draft — The Idempotency-Key Header Field](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
- [Razorpay — Webhook Idempotency](https://razorpay.com/docs/webhooks/best-practices/)
