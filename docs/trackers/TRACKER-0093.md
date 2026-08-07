# TRACKER-0093 — Security Hardening

**Requirement:** REQ-0093  
**Task:** TASK-0093  
**Status:** In Progress  
**Last Updated:** 2026-08-07  

---

## Checklist

- [x] `outbound-url-guard.ts` created  
- [x] `outbound-url-guard.test.ts` created (19 tests passing)
- [x] `config-interpreter.ts` calls `assertPublicHttpUrl` before fetch  
- [x] `adapter-config-schema.ts` requires HTTPS  
- [x] `env.ts` adds `METRICS_TOKEN`  
- [x] `metrics/route.ts` bearer token check  
- [x] `current-state.md §11.1` updated  
- [x] `ecommerce/index.ts` barrel cleaned (removed `ConfigInterpreter`, `getConnector` — both only used internally)
- [x] `next.config.ts` — no extra changes needed; `/* webpackIgnore: true */` comment resolves client-bundle conflict
- [x] lint passes  
- [x] typecheck passes  
- [x] tests pass (364/367, 3 Redis-integration skipped)
- [x] build passes  
- [ ] CHANGELOG.md updated  
