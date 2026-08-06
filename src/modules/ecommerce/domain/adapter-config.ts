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

export interface ResponseMapping {
  dataPath: string;
  fieldMap: Record<string, string>;
}

export interface LookupConfig {
  /** Dot/bracket path to the array to search, e.g. "price_rules" or "data". */
  dataPath: string;
  /** Field on each item to compare against the variable. */
  field: string;
  /** Variable name whose value must match the field. */
  againstVariable: string;
  /** Map fields from the matched item into variables for later steps. */
  variableMap: Record<string, string>;
  /** If true, a missing match is not an error and the remaining steps are skipped. */
  optional?: boolean;
}

export interface EndpointStep {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: Record<string, unknown>;
  /** Maps response fields (or matched lookup item fields) to variables. */
  variableMap?: Record<string, string>;
  /** Select a specific item from an array before extracting variables. */
  lookup?: LookupConfig;
}

export interface EndpointMapping {
  /** Required for single-step endpoints. Optional when `steps` is provided. */
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** Required for single-step endpoints. Optional when `steps` is provided. */
  path?: string;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  body?: Record<string, unknown>;
  responseMapping: ResponseMapping;
  /** Multi-step execution: used for two-phase writes like Shopify coupons. */
  steps?: EndpointStep[];
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
    fetchDiscounts: EndpointMapping;
    createCoupon: EndpointMapping;
    disableCoupon: EndpointMapping;
    fetchStoreInfo: EndpointMapping;
  };
  pagination?: PaginationConfig;
}
