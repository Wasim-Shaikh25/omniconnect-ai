---
description: Dynamic E-Commerce Adapters
---

# REQ-0078: Dynamic E-Commerce Adapters

- **Status:** Implemented (scaffold); full dynamic connector generation and hardcoded connector removal remain queued.
- **Owner:** wasim
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0078-dynamic-ecommerce-adapters.md`
- **Related Tracker:** `docs/trackers/TRACKER-0078-dynamic-ecommerce-adapters.md`
- **Supersedes:** `REQ-0002-ecommerce-connector.md` (hardcoded connectors → dynamic config mapping)
- **Last updated:** 2026-08-06

## 1. Summary

Replace hardcoded e-commerce connectors (Shopify, WooCommerce, BigCommerce) with a dynamic adapter system. AI reads e-commerce API documentation and generates a JSON configuration mapping — no code generation. A safe built-in ConfigInterpreter executes the mapping, implementing the existing `EcommerceConnector` interface. This eliminates code injection risk entirely.

## 2. Goals

- `AdapterConfigMapping` interface: JSON schema describing any e-commerce API.
- `ConfigInterpreter`: safe HTTP executor implementing `EcommerceConnector`.
- AI adapter generation: user pastes API docs URL → AI generates config mapping via OpenRouter.
- Adapter validation: test generated mapping against connector interface before use.
- Delete all hardcoded connectors after migration.

## 3. Non-Goals

- AI-generated code running on the server (security risk — explicitly rejected).
- Custom adapter code editing by users.
- Non-HTTP APIs (GraphQL-only platforms without REST fallback).

## 4. User Stories

- As a user, I want to connect any e-commerce platform by pasting its API documentation.
- As a user, I want the AI to auto-generate the connection configuration.
- As a user, I want to validate the connection works before saving.
- As a user, I want the same features (products, orders, coupons) regardless of platform.

## 5. Acceptance Criteria

- [x] `AdapterConfigMapping` interface defined with endpoints for all `EcommerceConnector` methods.
- [x] `ConfigInterpreter` scaffold implements `EcommerceConnector`; runtime HTTP execution queued for later.
- [ ] AI generates valid config from API documentation via OpenRouter (queued).
- [ ] Generated config validated against schema before storage (queued).
- [ ] Connection test UI: user enters credentials → system tests getProducts/fetchStoreInfo (queued).
- [ ] Hardcoded shopify/woocommerce/bigcommerce connector files deleted after dynamic adapters are wired.
- [ ] Config mapping stored encrypted in `GeneratedAdapter` model (queued).

## 6. Scope & Dependencies

- Modules: `ecommerce`, `ai`
- Depends on: REQ-0086 (OpenRouter for AI generation), REQ-0077 (Project model)
- Maintains: `EcommerceConnector` interface unchanged — all callers unaffected.

## 7. Code Snippets

### AdapterConfigMapping Schema

```ts
interface AdapterConfigMapping {
  platformName: string;
  baseUrl: string;                         // "https://{{shopDomain}}/admin/api/2024-01"
  authPattern: {
    type: "bearer" | "basic" | "apiKey" | "oauth2";
    headerName?: string;
    tokenField?: string;
  };
  credentialSchema: {
    fields: Array<{
      key: string;
      label: string;
      type: "text" | "password" | "url";
      required: boolean;
      placeholder?: string;
    }>;
  };
  endpoints: {
    getProducts: EndpointMapping;
    getOrders: EndpointMapping;
    getCustomers: EndpointMapping;
    createCoupon: EndpointMapping;
    disableCoupon: EndpointMapping;
    fetchStoreInfo: EndpointMapping;
  };
  pagination?: {
    type: "cursor" | "offset" | "link-header";
    cursorField?: string;
    limitParam?: string;
    maxPerPage?: number;
  };
}

interface EndpointMapping {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: Record<string, unknown>;
  responseMapping: {
    dataPath: string;
    fieldMap: Record<string, string>;
  };
}
```

### ConfigInterpreter (Safe Executor)

```ts
// src/modules/ecommerce/infrastructure/config-interpreter.ts

class ConfigInterpreter implements EcommerceConnector {
  constructor(
    private config: AdapterConfigMapping,
    private credentials: Record<string, string>,
  ) {}

  readonly provider = this.config.platformName;

  async getProducts(limit = 50): Promise<ConnectorProduct[]> {
    const endpoint = this.config.endpoints.getProducts;
    const url = this.buildUrl(endpoint.path, { limit: String(limit) });
    const headers = this.buildHeaders();
    const response = await fetch(url, { method: endpoint.method, headers });
    const data = await response.json();
    const items = this.extractPath(data, endpoint.responseMapping.dataPath);
    return items.map((item: Record<string, unknown>) =>
      this.mapFields(item, endpoint.responseMapping.fieldMap)
    );
  }

  async generateCoupon(input: GenerateCouponInput): Promise<ConnectorCoupon> {
    const endpoint = this.config.endpoints.createCoupon;
    const body = this.interpolateBody(endpoint.body, {
      code: input.code,
      discountPct: input.discountPct,
      expiresAt: input.expiresAt?.toISOString(),
    });
    const response = await fetch(this.buildUrl(endpoint.path), {
      method: endpoint.method,
      headers: { ...this.buildHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return this.mapFields(
      this.extractPath(data, endpoint.responseMapping.dataPath),
      endpoint.responseMapping.fieldMap,
    );
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    let url = this.interpolate(this.config.baseUrl + path, this.credentials);
    if (params) {
      const search = new URLSearchParams(params);
      url += (url.includes("?") ? "&" : "?") + search.toString();
    }
    return url;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const auth = this.config.authPattern;
    if (auth.type === "bearer") {
      headers["Authorization"] = `Bearer ${this.credentials[auth.tokenField!]}`;
    } else if (auth.type === "apiKey" && auth.headerName) {
      headers[auth.headerName] = this.credentials[auth.tokenField!];
    }
    return headers;
  }

  private interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
  }
}
```

## 8. Open Questions

None — configuration mapping approach chosen over code generation for security.
