## The 3 cross-origin bugs explained

### Bug 1: Cookie `SameSite=Lax` won't be sent cross-origin

**What is it?**
Every cookie carries a `SameSite` attribute that tells the browser when it's allowed to send the cookie back to the server. Three values:
- `Strict` — only when the URL bar matches the cookie's domain. Toughest.
- `Lax` — sent on top-level navigation (clicking a link) but **NOT on background AJAX requests** to a different site.
- `None` — sent on every request to the cookie's domain, including cross-site AJAX. **Requires `Secure`** (HTTPS only).

**How it's currently coded:**
In return-auth.ts, `setOrderSessionCookie` writes the cookie with `sameSite: 'lax'` and `secure: process.env.NODE_ENV === 'production'`. That was right when I assumed the storefront would be served from the **same** domain as the API. It isn't — D3 runs on its own origin (e.g. `https://store.example.com`) and our API runs on another (e.g. `https://admin.shoppulse.com`). When D3's JavaScript does `fetch('https://admin.shoppulse.com/api/.../returns/eligibility', {credentials: 'include'})`, the browser checks the cookie's SameSite attribute. Since it's `Lax` and this is a cross-site fetch (not a top-level navigation), **the cookie is silently dropped**. The API sees no cookie → returns 401 → customer is stuck.

**Why it must be fixed:**
For the storefront/API split to work, the session cookie has to traverse origins. Only `SameSite=None; Secure` allows that. `Secure` must be `true` even in dev — modern browsers reject `SameSite=None` cookies that aren't `Secure`. (Localhost is the one exception in some browsers, but we shouldn't rely on quirks.)

**What I'll fix:**
Set `sameSite: 'none'` and `secure: true` unconditionally in `setOrderSessionCookie` and `clearOrderSessionCookie`. Add a clear comment explaining cross-origin requirement.

---

### Bug 2: CORS `Access-Control-Allow-Origin: *` is incompatible with cookies

**What is it?**
CORS is the browser's "may this site read this response" gate. For cross-origin requests:
- The browser sends an `Origin: https://store.example.com` header.
- The server must respond with `Access-Control-Allow-Origin` matching that origin.
- If the request carries cookies (or sets them via `Set-Cookie`), the server must **also** respond with `Access-Control-Allow-Credentials: true`.

**The combination rule:** when `Access-Control-Allow-Credentials: true` is present, the browser **forbids** `Access-Control-Allow-Origin: *`. The wildcard is treated as "anyone can read this response", which is incompatible with cookies (which are user-specific). The browser will reject the response and the JS sees a CORS error.

**How it's currently coded:**
The 5 Layer 2 auth routes plus the 4 Layer 3 read routes all serve `OPTIONS` (preflight) and `Access-Control-Allow-Origin: *` headers. No `Access-Control-Allow-Credentials` is set anywhere. That worked when I assumed no cookies cross origins. With the corrected SameSite=None cookie, every cross-origin request now carries credentials → browser rejects every response.

**Why it must be fixed:**
The server has to:
1. Read the incoming `Origin` header.
2. Check it against an allow-list (otherwise any malicious site could embed our endpoints).
3. Echo it back as `Access-Control-Allow-Origin: <that-origin>` (specific, not `*`).
4. Always send `Access-Control-Allow-Credentials: true`.
5. Send `Vary: Origin` so caches don't conflate responses across origins.
6. On preflight (OPTIONS), additionally echo `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers` (including any custom headers like `Content-Type`, `Authorization` for the Bearer-token fallback).

**What I'll fix:**
Add a small helper `src/lib/returns/cors.ts` exporting:
- `getStorefrontCorsHeaders(req: Request): Record<string, string>` — looks up `Origin`, validates against `STOREFRONT_ALLOWED_ORIGINS`, returns the right headers (or empty if origin is disallowed → CORS will block at the browser, which is correct).
- `storefrontPreflightResponse(req)` — handy wrapper for `OPTIONS` handlers.

Then update every storefront route to use this helper for both real responses AND preflight, replacing the existing `'*'` patterns.

---

### Bug 3: No `STOREFRONT_ALLOWED_ORIGINS` env var → no allow-list source of truth

**What is it?**
"Don't echo any random origin" is the core CORS security rule. Without an explicit allow-list, you either:
- Reject everything (storefront can't talk to API) — too tight, or
- Accept everything (`*` or echo any incoming `Origin`) — opens us up to CSRF-via-CORS, where a malicious site embedded in a victim's browser makes authenticated calls to our API and reads the response.

We need a server-side configured list of which storefront origins are trusted. Multiple, because:
- Local dev: `http://localhost:3001`
- Staging: `https://store-staging.example.com`
- Each customer's production storefront: their own domain (BYOK / multi-tenant deploys)

**How it's currently configured:**
**It's not.** No env var, no config file, no code path that reads any allow-list. The wildcard masks the absence.

**Why it must be fixed:**
- Closes the CORS-CSRF hole.
- Lets us add/remove storefronts without redeploying code.
- Operators (you) get a single env knob to manage.

**What I'll fix:**
- Read `STOREFRONT_ALLOWED_ORIGINS` (comma-separated) once at module load, parse to a `Set<string>` (trim whitespace, lowercase, strip trailing slashes).
- The CORS helper checks the request's `Origin` against this set.
- Document the env var in the cors.ts file's header comment.
- Default in dev: if the env var is missing AND `NODE_ENV !== 'production'`, allow `http://localhost:3001` and `http://localhost:3000` so local dev doesn't break out of the box. In production, missing env var = no allowed origins (fail closed).

