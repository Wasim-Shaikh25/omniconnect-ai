# REQ-0093 — Security Hardening: SSRF Guard and Metrics Auth

**Status:** In Progress  
**Priority:** Critical / High  
**Author:** Claude Code  
**Created:** 2026-08-07  
**Branch:** claude/framer-motion-deps-setup-ajyb2y  

---

## 1. Background

The End-to-End Production Readiness Audit (2026-08-07 third pass) identified three open findings that must be resolved before release:

- **N1 (High — Release Blocker):** Server-Side Request Forgery in `ConfigInterpreter`. The dynamic e-commerce adapter fetches any URL derived from the user-supplied `baseUrl` without validating the resolved address. An authenticated user can force the server to issue HTTP requests to internal services (metadata APIs, Redis, other micro-services) and read the response.
- **N2 (Medium — Required Pre-Release):** `/api/metrics` is unauthenticated. Any unauthenticated client can poll queue depth and learn about internal failure rates.
- **N3 (Low — Documentation):** `docs/specs/current-state.md §11.1` still shows "🔴 NO-GO as of 2026-07-31", contradicting the remediated state of all 33 prior findings.

---

## 2. Scope

| Item | In scope |
|------|----------|
| `src/shared/security/outbound-url-guard.ts` | ✅ New utility |
| `src/shared/security/outbound-url-guard.test.ts` | ✅ New tests |
| `src/modules/ecommerce/infrastructure/config-interpreter.ts` | ✅ Call guard before fetch |
| `src/modules/ecommerce/infrastructure/adapter-config-schema.ts` | ✅ Require HTTPS |
| `src/shared/config/env.ts` | ✅ Add METRICS_TOKEN |
| `src/app/api/metrics/route.ts` | ✅ Bearer token auth |
| `docs/specs/current-state.md §11.1` | ✅ Update to CONDITIONAL GO |
| Unrelated refactoring | ❌ Out of scope |

---

## 3. Acceptance Criteria

### N1 — SSRF Guard

- **AC-1:** `assertPublicHttpUrl(rawUrl)` resolves DNS and rejects any address that falls in a private or loopback range (127.x, 10.x, 172.16–31.x, 192.168.x, 169.254.x, ::1, fc00::/7, fe80::/10, fdaa::/16 — Fly.io 6PN).
- **AC-2:** Only `http:` and `https:` schemes are permitted; `file:`, `ftp:`, etc. are rejected.
- **AC-3:** `ConfigInterpreter.fetchJson()` calls `assertPublicHttpUrl(url)` before every outbound `fetch()`. A rejection throws `ConnectorError`.
- **AC-4:** `baseUrl` in `AdapterConfigMapping` validates to `https:` only via the Zod schema.
- **AC-5:** Unit tests cover: public HTTPS domain allowed, HTTP loopback rejected, private IPv4 ranges rejected, IPv6 loopback rejected, Fly.io 6PN rejected, unsupported scheme rejected.

### N2 — Metrics Auth

- **AC-6:** `GET /api/metrics` requires a `METRICS_TOKEN` bearer token when `METRICS_TOKEN` is set in env.
- **AC-7:** Requests without a valid token receive `401 Unauthorized`.
- **AC-8:** When `METRICS_TOKEN` is absent from env (development/test), the endpoint is open (unchanged behaviour for local dev).
- **AC-9:** `METRICS_TOKEN` is added to `src/shared/config/env.ts` as an optional string.

### N3 — Documentation

- **AC-10:** `docs/specs/current-state.md §11.1` heading updated from "🔴 NO-GO as of 2026-07-31" to "🟡 CONDITIONAL GO as of 2026-08-07 (post third-pass audit)".
- **AC-11:** Body reflects current state: prior 33 findings remediated; N1/N2 addressed by REQ-0093; N3 is this document update.

### General

- **AC-12:** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` all pass after changes.
- **AC-13:** No new `any`, `@ts-ignore`, or cross-module internal imports introduced.

---

## 4. Technical Approach

### N1 — `assertPublicHttpUrl`

Place in `src/shared/security/` (existing security utilities directory). Use Node's built-in `node:dns/promises` `lookup` for DNS resolution and `node:net` `isIP` for address classification. The guard must:
1. Parse the raw string as a `URL` (rejects malformed strings).
2. Assert scheme is `http:` or `https:`.
3. Extract `hostname`. If it is a raw IP, use it directly; otherwise `lookup(host, { all: true })`.
4. For each resolved address, reject if it falls in a blocked range.
5. Return the parsed `URL` on success.

Call site in `config-interpreter.ts`: replace the bare `fetch(url, init)` with:
```typescript
await assertPublicHttpUrl(url); // throws ConnectorError on rejection
response = await fetch(url, init);
```

### N2 — Metrics bearer token

Use a simple constant-time comparison. The route reads `env.METRICS_TOKEN`; if set, it checks the `Authorization: Bearer <token>` header and returns `401` if it does not match. Uses `timingSafeEqual` from `node:crypto`.

### N3 — current-state update

Edit `docs/specs/current-state.md` lines 369–403 to reflect post-remediation state.
