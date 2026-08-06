/**
 * Dynamic e-commerce adapter configuration mapping.
 *
 * AI generates a JSON description of any REST e-commerce API; `ConfigInterpreter`
 * executes it without generating or running arbitrary code. This keeps the
 * `EcommerceConnector` contract stable while removing the need for provider-specific
 * connector implementations.
 *
 * Pure domain: no Prisma, fetch, or env access here.
 */

export type AuthType = "bearer" | "basic" | "apiKey" | "oauth2";

export interface CredentialField {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  required: boolean;
  placeholder?: string;
}

export interface EndpointMapping {
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

export interface PaginationConfig {
  type: "cursor" | "offset" | "link-header";
  cursorField?: string;
  limitParam?: string;
  maxPerPage?: number;
}

export interface AdapterConfigMapping {
  platformName: string;
  baseUrl: string;
  authPattern: {
    type: AuthType;
    headerName?: string;
    tokenField?: string;
  };
  credentialSchema: {
    fields: CredentialField[];
  };
  endpoints: {
    getProducts: EndpointMapping;
    getOrders: EndpointMapping;
    getCustomers: EndpointMapping;
    createCoupon: EndpointMapping;
    disableCoupon: EndpointMapping;
    fetchStoreInfo: EndpointMapping;
  };
  pagination?: PaginationConfig;
}
