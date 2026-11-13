# PDF Generation for Web Apps — A Full-Stack Deep Dive

> Written as study notes for a developer who's built a lot of web apps but has never generated, stored, or served PDFs from a backend before. Goes from "what is a PDF really" all the way to "how would Stripe / Razorpay do it at scale".

---

## 1. What a PDF actually is

A PDF (Portable Document Format) is a **binary file format** invented by Adobe in 1993, now an open ISO standard (ISO 32000). At its core a PDF file is a sequence of objects — text strings, drawing instructions, fonts, images, metadata — wrapped in a structure that any PDF reader (Chrome's built-in viewer, Adobe Reader, macOS Preview, mobile viewers) knows how to render the same way on every device.

Three facts to anchor on:

1. **It's just a file.** Like a `.jpg` or `.zip`. Has bytes. Has a size. Lives on disk or in memory or in object storage. There is nothing magical about it being "a document".
2. **It describes drawing, not text flow.** Unlike HTML which says "here's a paragraph, browser please figure out where to wrap it", PDF instructions say "draw the glyph 'A' at coordinates (72, 540) using font Helvetica 12pt". This is why PDFs look identical everywhere — there's no layout engine making different decisions per device.
3. **It can embed everything it needs.** Fonts, images, vector graphics, even small JavaScript and forms. That's why a "self-contained" PDF can be 200 KB even for a one-page invoice — the font subset alone can be 30–80 KB.

You almost never write the raw PDF format by hand. A library does it for you.

### The minimal mental model

```
Your data  ──►  PDF library  ──►  bytes (a Buffer in Node)
                                    │
                                    ├── send back in HTTP response  → browser
                                    └── upload to object storage    → URL for later
```

That's the entire web-development picture.

---

## 2. What "bytes" means in this context

**Bytes = the raw 0/1 contents of the file**, held in memory.

In Node.js this is a `Buffer`:

```ts
const pdfBytes: Buffer = await renderInvoice(order);
console.log(pdfBytes.length);       // e.g. 47238  (≈ 47 KB)
console.log(pdfBytes[0], pdfBytes[1], pdfBytes[2], pdfBytes[3]);
//    37  80  68  70   →  ASCII for  '%' 'P' 'D' 'F'   (every PDF starts with %PDF)
```

You can do three things with those bytes:

1. **Send them in an HTTP response** (your server → user's browser):
   ```ts
   return new NextResponse(pdfBytes, {
     headers: {
       'Content-Type': 'application/pdf',
       'Content-Disposition': 'attachment; filename="INV-2025-001.pdf"',
       'Content-Length': String(pdfBytes.length),
     },
   });
   ```
   The browser receives the bytes, sees `application/pdf`, and either previews (Chrome's PDF viewer) or downloads (because of `Content-Disposition: attachment`).

2. **Upload them to object storage** (your server → S3/R2/MinIO):
   ```ts
   await s3.send(new PutObjectCommand({
     Bucket: 'invoices',
     Key: 'storeXYZ/2025-26/INV-2025-001.pdf',
     Body: pdfBytes,
     ContentType: 'application/pdf',
   }));
   ```
   Now the bytes live on a remote disk you don't manage. You get back a URL (or you compute the key yourself) and can download them again later.

3. **Write them to local disk** (rare in production, useful in dev):
   ```ts
   await fs.writeFile('./.data/invoices/INV-2025-001.pdf', pdfBytes);
   ```

`Buffer` vs `Uint8Array` vs `Blob` vs `ReadableStream` — these are all just different containers for the same idea ("a sequence of bytes"). Modern Node + the Fetch standard accept any of them in HTTP responses, so don't over-think it.

### Why "stream" sometimes appears

If a PDF is 5 MB you don't want to hold all 5 MB in RAM for every concurrent user. A **stream** lets you produce/transmit the bytes in chunks (e.g. 64 KB at a time). For invoices (typically 30–200 KB) this is overkill — buffer is fine. For 100-page reports it matters.

---

## 3. The three industry approaches to generating PDFs in 2025

| Approach | Core idea | Pros | Cons | When to pick |
| --- | --- | --- | --- | --- |
| **A. React/JSX → PDF** | Describe the doc in JSX-like components, library compiles to PDF | Fast (no browser), runs anywhere Node runs, deterministic, easy to template | Limited CSS subset (its own flexbox-style engine), no DOM | New invoices, receipts, tickets, certificates |
| **B. HTML → PDF (headless browser)** | Render HTML+CSS in a real Chromium, "print to PDF" | Pixel-perfect to your existing CSS, full web platform | Heavy (200+ MB Chromium), slow cold-start (1–3 s), high memory, fonts/CJK gotchas | When the doc is already an HTML page you want to mirror |
| **C. Low-level imperative API** | Call `pdf.text(...)`, `pdf.line(...)` yourself | Maximum control, can edit/sign existing PDFs | Verbose, you reinvent layout | Watermarking, signing, splitting/merging, post-processing |

### A. React → PDF (`@react-pdf/renderer`)

What we're using. JSX-style:

```tsx
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10 },
  h1:   { fontSize: 18, marginBottom: 12, fontWeight: 700 },
  row:  { flexDirection: 'row', justifyContent: 'space-between' },
});

export const InvoicePdf = ({ order }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.h1}>Tax Invoice</Text>
      <Text>{order.invoiceNumber}</Text>
      <View style={styles.row}>
        <Text>Subtotal</Text>
        <Text>₹{order.subtotal}</Text>
      </View>
    </Page>
  </Document>
);
```

Render to bytes:

```ts
import { renderToBuffer } from '@react-pdf/renderer';
const bytes = await renderToBuffer(<InvoicePdf order={order} />);
```

**Why it's the modern default:** no headless browser, deterministic output, runs on a tiny VM with no Chromium baggage, easy to unit-test (you can render and assert on the bytes), templates feel like writing React. Stripe-style receipts are typically built this way.

**Catches:**
- The "CSS" is a small subset (its own Yoga-based flexbox engine). No grid, no `position: absolute` like the browser, etc.
- Custom fonts must be **registered** explicitly via `Font.register({ family, src })` — if you forget, all unicode outside Latin-1 may render as boxes (the dreaded "tofu").
- Unicode for ₹, Hindi scripts, etc., needs a font that contains those glyphs (Noto family is the safe default).

### B. Headless browser (Puppeteer / Playwright)

```ts
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://internal/invoices/preview?orderId=…');
const bytes = await page.pdf({ format: 'A4', printBackground: true });
await browser.close();
```

You control a real Chromium and call its built-in "Save as PDF". Looks identical to what the user sees on screen. Used by tools where designers iterate on the HTML directly.

**Trade-offs:** binary is 200+ MB, cold-start is slow (1–3 s on a typical VM), needs system fonts installed, prone to "works locally, fails in Docker" font issues. Worth it for marketing PDFs / report dashboards. Overkill for an invoice.

### C. Imperative low-level (`pdf-lib`, `pdfkit`)

```ts
import { PDFDocument, StandardFonts } from 'pdf-lib';
const doc = await PDFDocument.create();
const page = doc.addPage([595, 842]); // A4 in points
const font = await doc.embedFont(StandardFonts.Helvetica);
page.drawText('Hello', { x: 50, y: 800, size: 18, font });
const bytes = await doc.save();
```

You're literally placing glyphs at coordinates. **Where this shines:** post-processing existing PDFs — adding a QR code on top of a generated invoice (we'll need this for India's e-invoice IRN later), watermarking ("PAID"), splitting a big PDF, merging multiple PDFs, signing a PDF with a digital certificate.

**Best practice:** use **A** to generate new docs, keep **C** in your toolbox to mutate them later.

---

## 4. Storing PDFs — object storage is the answer

You almost never store PDFs in your relational database. Reasons:

- Postgres rows aren't designed for big binaries. `bytea` works but it bloats the DB, breaks streaming replication performance, and you can't put a CDN in front of it.
- Backups become painful — every dump pulls every PDF.
- You can't directly serve a row to a user; you have to read it via your app.

Instead, you store PDFs in **object storage** (sometimes called "blob storage" — same thing, "blob" = binary large object). The DB only stores **metadata**: where the file lives, its size, its hash, who issued it.

### What is object storage

A simple HTTP-style API: `PUT /bucket/key`, `GET /bucket/key`, `DELETE /bucket/key`. No directory tree, no filesystem semantics. Just key-value: the key is the path-like string you choose, the value is the bytes.

The de-facto standard API is **S3** (Amazon's). Many providers implement the same protocol so the SDK code is identical:

| Provider | Where it runs | Notes |
| --- | --- | --- |
| **AWS S3** | AWS | The original. Very mature. |
| **Cloudflare R2** | Cloudflare's edge | S3-compatible, **zero egress fees** — huge cost win when users download lots of PDFs. |
| **Backblaze B2** | Backblaze | Cheapest per GB. S3-compatible. |
| **Wasabi** | Independent | Cheap, S3-compatible. |
| **MinIO** | **You run it** (on your VM, in Docker) | S3-compatible, open source. Perfect for local dev or self-hosted prod. |
| **Vercel Blob, Supabase Storage** | Managed | Convenient if you're already in their ecosystem. |

Same code talks to all of them via `@aws-sdk/client-s3` — you just change the endpoint and credentials in env vars.

```ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,        // https://<account>.r2.cloudflarestorage.com  OR  http://localhost:9000 for MinIO
  region:   process.env.S3_REGION,
  credentials: {
    accessKeyId:     process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true, // required for MinIO and some R2 setups
});
```

### Public bucket vs private bucket

- **Public bucket:** anyone with the URL can read. Fine for product images. **Never use for invoices** — they contain customer PII (names, addresses, GSTINs) and tax numbers.
- **Private bucket (correct for invoices):** reads require authentication. Two ways to give a user access:
  1. **Proxy through your app**: user hits `/api/.../invoice.pdf`, your server checks auth, fetches from S3, streams back. Simplest, you keep full control, you can add audit logs. Slight extra latency.
  2. **Pre-signed URLs**: your server generates a short-lived (e.g. 5-minute) signed URL, returns it to the client, the client downloads directly from S3. Lower load on your server, great for bigger files.

For invoices we use option 1 — they're small, we want to log every access (compliance), and we don't want stale URLs floating in inboxes.

### Key naming conventions

Your "key" is the path. Pick something deterministic and shardable:

```
invoices/{storeId}/{fy}/{invoiceNumber}.pdf
       └─tenant─┘ └─FY─┘ └─unique per tenant─┘
```

Why this layout:
- **Tenant prefix** lets you list-by-store, lifecycle-by-store, or bulk-delete-by-store.
- **FY prefix** keeps directories reasonably sized (Indian invoice retention is 6+ years — at 1000 invoices/store/year that's a manageable folder).
- **Invoice number as filename** = self-documenting, you can find a file by name in the dashboard.

### Don't forget the hash

When you upload, compute SHA-256 of the bytes and store it on the DB row. Two reasons:
1. **Tamper detection** — if the bytes in storage ever change, your hash mismatches and you know.
2. **Idempotency / dedupe** — same hash + same key means it's the same file; safe to skip a re-upload.

```ts
import { createHash } from 'node:crypto';
const sha256 = createHash('sha256').update(bytes).digest('hex');
```

---

## 5. The DB layer

Two patterns, both valid:

### Pattern 1: Snapshot fields on the related row (we already do this)

`Payment` carries `invoiceNumber, invoiceKind, invoiceDate, invoiceFy`. The PDF location goes onto a new `Invoice` row that joins back via `paymentId`. Pro: you can answer "what's the invoice number for order X" without an extra join.

### Pattern 2: Single Invoice table as source of truth

```prisma
model Invoice {
  id             String       @id @default(cuid())
  storeId        String
  paymentId      String       @unique
  orderId        String
  invoiceNumber  String       // "INV-2025-26-00042"
  fy             String       // "2025-26"
  sequence       Int          // 42
  kind           InvoiceKind  // TAX_B2B | TAX_B2C | BILL_OF_SUPPLY
  storageKey     String       // "invoices/storeXYZ/2025-26/INV-2025-26-00042.pdf"
  fileSize       Int
  fileSha256     String
  version        Int          @default(1)
  supersededById String?      @unique
  issuedAt       DateTime     @default(now())

  store     Store    @relation(fields: [storeId],   references: [id])
  payment   Payment  @relation(fields: [paymentId], references: [id])
  superseded Invoice? @relation("InvoiceVersion", fields: [supersededById], references: [id])
  predecessor Invoice? @relation("InvoiceVersion")

  @@unique([storeId, fy, sequence])  // gapless, monotonic per store per FY
  @@index([storeId, issuedAt])
}
```

The `@@unique([storeId, fy, sequence])` is the **scalability + correctness lever**: if two requests race to issue the same invoice, exactly one INSERT succeeds; the other gets a constraint violation, retries, reads the now-existing row, and serves it. No double-numbering, no application-level locks needed.

### Sequential numbering inside a transaction

```ts
await prisma.$transaction(async (tx) => {
  const last = await tx.invoice.findFirst({
    where:  { storeId, fy },
    orderBy: { sequence: 'desc' },
    select: { sequence: true },
  });
  const next = (last?.sequence ?? 0) + 1;

  // The unique constraint protects us from races; on conflict we'll retry.
  return tx.invoice.create({
    data: {
      storeId, fy, sequence: next,
      invoiceNumber: format(storeFormat, { fy, seq: next }),
      paymentId, orderId, kind, storageKey, fileSize, fileSha256,
    },
  });
});
```

For very high write rates you'd graduate to a dedicated counter row using `SELECT … FOR UPDATE` or a Postgres sequence per store (one sequence per tenant; cheap to create).

---

## 6. Putting it all together — the request flow

```
1. User clicks "Download invoice" → GET /api/[storeId]/orders/[orderId]/invoice.pdf
2. Auth check (Clerk for admin, signed token for storefront).
3. Look up order, payment, store.  Reject if not paid yet.
4. Has Invoice row already?
     YES → fetch bytes from object storage, stream back. DONE.
     NO  → continue.
5. BEGIN TX
     a. Allocate next invoice number for (store, FY).
     b. Render PDF bytes via @react-pdf/renderer.
     c. Compute SHA-256.
     d. PUT bytes to object storage at deterministic key.
     e. INSERT Invoice row with storageKey + hash.
     f. UPDATE Payment with invoiceNumber + invoiceDate.
   COMMIT TX  (if storage upload failed, roll back; if DB insert failed, optionally delete the upload — it's idempotent on key, so a retry just overwrites).
6. Stream the bytes back with Content-Type: application/pdf.
```

Subtle point: step 4 ("already exists") makes the whole route **idempotent** — the user can hit refresh 100 times and you generate exactly once.

---

## 7. Scaling the PDF pipeline

This is where it gets fun and is the real reason to build it on a VM yourself.

### Stage 1 — Inline generation (where we start)

Generate synchronously in the request handler. Fine for tens of generations per minute on a single VM. Profile: each invoice ~50–200 ms CPU on `@react-pdf/renderer`, well below the typical 30 s HTTP timeout.

### Stage 2 — Background queue

When traffic spikes (end of month, sale events) or you add bulk operations ("download all invoices for October as ZIP"), CPU-bound generation shouldn't block the web tier.

Add **BullMQ on Redis** (you already have a `docker-compose.redis.yml`):

```
Web tier (Node)         Redis             Worker tier (Node, separate process)
   │                      │                       │
   │ enqueue(generate,   │                       │
   │   {orderId})  ───►  │                       │
   │                      │  ◄── BLPOP ─── pop ──┤
   │                      │                       │ render PDF
   │                      │                       │ upload to S3
   │                      │  ◄── set status ─────┤ INSERT Invoice
   │ poll status ───────► │                       │
   │ ◄── ready, url ──── │                       │
   ▼                      ▼                       ▼
```

Now you can scale the worker tier independently of the web tier — add more worker VMs when generation queue grows. The web tier stays light and stateless.

### Stage 3 — Caching + CDN

Once an invoice exists, its bytes never change. Therefore:

```
Cache-Control: private, max-age=31536000, immutable
ETag: "<sha256>"
```

Put a CDN (Cloudflare, Fastly, BunnyCDN) in front of your invoice route or directly in front of the bucket. Subsequent downloads of the same invoice never hit your origin.

### Stage 4 — Horizontal scaling

Because the app servers are stateless (no PDF on local disk, no per-user session in memory), you can put N of them behind nginx / haproxy / a cloud load balancer. Add VMs, restart any one without losing data, blue-green deploys, etc.

The **boundaries of state** in this design are:
- Postgres (your DB) — the source of truth for who owns what.
- Object storage — the source of truth for the bytes.
- Redis — ephemeral queue + cache.

The Node app servers own zero durable state. This is the fundamental scaling pattern for modern web apps and the reason the PDF stack you build here generalises to images, exports, ML jobs, anything CPU/IO heavy.

### Stage 5 — Observability

Three things to instrument from day one:

- **Logs**: every generation logs `{storeId, orderId, durationMs, sizeBytes, status}`.
- **Metrics**: a Prometheus counter `invoices_generated_total{kind, status}` and a histogram `invoice_render_duration_ms`. Scrape from a Prometheus server later; for now just record them in a registry.
- **Tracing** (optional, advanced): wrap render + upload + DB write in spans (OpenTelemetry) so you can see which leg is slow.

---

## 8. Security & compliance — the things juniors miss

1. **PII in invoices.** Names, addresses, phone numbers, GSTINs. Treat the bucket as confidential. Private only. Audit every access (log who downloaded which invoice when). Comply with India's DPDP Act / equivalent.
2. **Tax retention.** Indian tax law requires invoices be retained for **8 years** (CGST Rule 56). Don't lifecycle-delete them on a 1-year rule the way you might for product images. Use object-storage **Object Lock** / **legal hold** features when available — prevents even an admin from deleting prematurely.
3. **Immutability of issued numbers.** Once an invoice number is issued, it cannot be reused or skipped. You either issue a credit/debit note or a versioned re-issue. Hard rule.
4. **Signed download URLs must be short-lived.** 5–15 minutes max. Long ones leak via referrer headers, caches, screenshots.
5. **Don't trust client-supplied filenames** when uploading anywhere. Always derive the storage key server-side from internal IDs. (Less relevant for invoices, very relevant for user-uploaded attachments.)
6. **PDF JavaScript** is a real attack surface — never render a PDF that came from an untrusted user inside your admin without sanitising via `pdf-lib` first. (Not relevant when **you're** the one generating it; very relevant if users upload PDFs.)
7. **Font licensing.** "Free for personal use" is not enough — embedding a font in a PDF is redistribution. Stick to liberally-licensed families (Noto, IBM Plex, Inter, system fonts).

---

## 9. Common gotchas (battle scars)

- **Tofu / boxes instead of glyphs** → font is missing or doesn't include those code points. Fix: register a Unicode-rich font (Noto Sans / Noto Sans Devanagari).
- **PDF previews fine in Chrome but breaks in Acrobat** → almost always a font subsetting bug. Re-embed full font once to confirm.
- **First request takes 3 s, subsequent are 200 ms** → you're using Puppeteer/Chromium and paying cold-start. Either keep a warm browser pool or switch to `@react-pdf/renderer`.
- **PDF bytes change every render even with same input** → some libraries embed a creation timestamp by default. Set it explicitly to a constant if you need byte-stable output (matters for testing).
- **Wrong page size in print preview** → A4 is `595 × 842` pt; Letter is `612 × 792` pt. Always declare the size; never let the library guess.
- **Right-to-left text mangled** → Arabic, Hebrew need a library that handles bidi text (`@react-pdf/renderer` does; some others don't).
- **Mojibake in metadata** → ensure UTF-8 throughout. Some old libraries default to Latin-1 in the title/author fields.
- **`Content-Length` mismatch** when streaming → if you set it, it must equal the bytes you actually send. Easier to omit and use chunked encoding.

---

## 10. The wider full-stack pattern this teaches you

Building an invoice PDF service is a microcosm of every "produce-store-deliver-binary-artifact" pipeline you'll ever build:

| Concept here | Generalises to |
| --- | --- |
| Render with `@react-pdf/renderer` | Generating CSV exports, ZIP bundles, images, ML model artifacts |
| Object storage with S3-compatible API | Storing user uploads, video transcodes, backups |
| Idempotent issue-or-fetch route | Any "generate-on-demand, cache-forever" endpoint |
| Background queue with BullMQ | Email sending, webhook delivery, scheduled jobs, heavy reports |
| `@@unique` for race-safe sequencing | Order numbers, ticket numbers, booking codes |
| Stateless app servers + state in Redis/Postgres/object storage | The default architecture for any modern web app you'll ever scale |
| SHA-256 hash for tamper detection | File deduplication, content-addressable storage (think Git, Docker layers) |
| Pre-signed URLs vs proxied download | Same trade-off appears for user uploads, signed avatars, secure media streaming |

When you've shipped this end-to-end on a VM you control, you've effectively practised every primitive needed to scale almost any data-heavy SaaS to mid-tier traffic without managed cloud magic.

---

## 11. Recommended further reading (when you have time)

- **PDF spec primer** — Adobe's "PDF Reference" overview chapter (the full spec is enormous; just read the structure section).
- **`@react-pdf/renderer` docs** — short, complete.
- **`pdf-lib` examples** — see how digital signatures and form fills work; useful when we add e-invoice IRN QR.
- **AWS "S3 best practices"** doc — applies verbatim to R2/MinIO/B2.
- **BullMQ guide** — patterns for retries, exponential backoff, repeatable jobs (will replace the Vercel cron eventually).
- **Cloudflare R2 vs AWS S3 cost calculator** — instructive for understanding why egress dominates object-storage TCO.
- **MinIO "single-node single-drive" tutorial** — fastest way to spin up local S3 for dev.
- **Postgres sequences vs `@@unique` for counters** — when one outperforms the other.
- **OWASP "File Upload" cheat sheet** — even though we're generating not uploading, the threat model overlaps.
