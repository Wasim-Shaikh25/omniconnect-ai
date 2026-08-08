import type {
  ConnectorCoupon,
  ConnectorCustomer,
  ConnectorDiscount,
  ConnectorOrder,
  ConnectorProduct,
  EcommerceConnector,
  GenerateCouponInput,
  StoreInfo,
} from "../domain/connector";
import type {
  AdapterConfigMapping,
  EndpointMapping,
  EndpointStep,
} from "../domain/adapter-config";
import { ConnectorError } from "../domain/errors";
import { assertPublicHttpUrl } from "@/shared/security/outbound-url-guard";

export class ConfigInterpreterNotImplementedError extends Error {
  constructor(operation: string) {
    super(`ConfigInterpreter operation not yet implemented: ${operation}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function asString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (isString(value)) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const str = asString(value);
  if (!str) return null;
  const parsed = new Date(str);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export class ConfigInterpreter implements EcommerceConnector {
  readonly provider: string;

  constructor(
    private readonly config: AdapterConfigMapping,
    private readonly credentials: Record<string, string>,
  ) {
    if (!config.platformName || !config.baseUrl) {
      throw new Error("AdapterConfigMapping must include platformName and baseUrl");
    }
    this.provider = config.platformName;
  }

  async fetchStoreInfo(): Promise<StoreInfo> {
    const endpoint = this.config.endpoints.fetchStoreInfo;
    const data = await this.fetchAndParse(endpoint);
    const root = this.getValueByPath(data, endpoint.responseMapping.dataPath) ?? data;
    const mapped = this.mapFieldsWithVariables(root, endpoint.responseMapping.fieldMap, {});
    return {
      name: asString(mapped.name) ?? this.provider,
      domain: asString(mapped.domain) ?? null,
      currency: asString(mapped.currency) ?? null,
      provider: asString(mapped.provider) ?? this.provider,
    };
  }

  async getProducts(limit = 50): Promise<ConnectorProduct[]> {
    const endpoint = this.config.endpoints.getProducts;
    const params = this.buildQueryParams(endpoint, { [this.limitParam()]: String(limit) });
    const data = await this.fetchAndParse(endpoint, params);
    const items = this.extractItems(data, endpoint.responseMapping.dataPath, "getProducts");
    return items.map((item) =>
      this.toProduct(this.mapFieldsWithVariables(item, endpoint.responseMapping.fieldMap, {})),
    );
  }

  async getOrders(limit = 50): Promise<ConnectorOrder[]> {
    const endpoint = this.config.endpoints.getOrders;
    const params = this.buildQueryParams(endpoint, { [this.limitParam()]: String(limit) });
    const data = await this.fetchAndParse(endpoint, params);
    const items = this.extractItems(data, endpoint.responseMapping.dataPath, "getOrders");
    return items.map((item) =>
      this.toOrder(this.mapFieldsWithVariables(item, endpoint.responseMapping.fieldMap, {})),
    );
  }

  async getCustomers(limit = 50): Promise<ConnectorCustomer[]> {
    const endpoint = this.config.endpoints.getCustomers;
    const params = this.buildQueryParams(endpoint, { [this.limitParam()]: String(limit) });
    const data = await this.fetchAndParse(endpoint, params);
    const items = this.extractItems(data, endpoint.responseMapping.dataPath, "getCustomers");
    return items.map((item) =>
      this.toCustomer(this.mapFieldsWithVariables(item, endpoint.responseMapping.fieldMap, {})),
    );
  }

  async fetchDiscounts(): Promise<ConnectorDiscount[]> {
    const endpoint = this.config.endpoints.fetchDiscounts;
    const params = this.buildQueryParams(endpoint);
    const data = await this.fetchAndParse(endpoint, params);
    const items = this.extractItems(data, endpoint.responseMapping.dataPath, "fetchDiscounts");
    return items.map((item) =>
      this.toDiscount(this.mapFieldsWithVariables(item, endpoint.responseMapping.fieldMap, {})),
    );
  }

  async generateCoupon(input: GenerateCouponInput): Promise<ConnectorCoupon> {
    const endpoint = this.config.endpoints.createCoupon;
    const variables: Record<string, string | null> = {
      code: input.code,
      discountPct: String(input.discountPct),
      expiresAt: input.expiresAt?.toISOString() ?? null,
    };

    if (endpoint.steps && endpoint.steps.length > 0) {
      const result = await this.executeSteps(endpoint, variables);
      return this.toCoupon(result);
    }

    const body = this.buildBody(endpoint, variables);
    const data = await this.fetchAndParse(endpoint, undefined, body, variables);
    const root = this.getValueByPath(data, endpoint.responseMapping.dataPath) ?? data;
    return this.toCoupon(
      this.mapFieldsWithVariables(root, endpoint.responseMapping.fieldMap, variables),
    );
  }

  async disableCoupon(code: string): Promise<void> {
    const endpoint = this.config.endpoints.disableCoupon;
    const variables: Record<string, string | null> = { code };

    if (endpoint.steps && endpoint.steps.length > 0) {
      await this.executeSteps(endpoint, variables);
      return;
    }

    const body = this.buildBody(endpoint, variables);
    await this.fetchAndParse(endpoint, undefined, body, variables);
  }

  private limitParam(): string {
    return this.config.pagination?.limitParam ?? "limit";
  }

  private buildQueryParams(
    endpoint: Pick<EndpointMapping, "queryParams">,
    overrides: Record<string, string> = {},
    variables: Record<string, string | null> = {},
  ): Record<string, string> {
    const combined = this.mergeVariables(variables);
    const result: Record<string, string> = {};
    if (endpoint.queryParams) {
      for (const [key, value] of Object.entries(endpoint.queryParams)) {
        result[key] = this.interpolate(value, combined);
      }
    }
    for (const [key, value] of Object.entries(overrides)) {
      result[key] = value;
    }
    return result;
  }

  private buildBody(
    endpoint: Pick<EndpointMapping, "body">,
    variables: Record<string, string | null>,
  ): Record<string, unknown> | undefined {
    if (!endpoint.body) return undefined;
    return this.interpolateValues(endpoint.body, variables) as Record<string, unknown>;
  }

  private async executeSteps(
    endpoint: EndpointMapping,
    initialVariables: Record<string, string | null>,
  ): Promise<Record<string, unknown>> {
    let variables = { ...initialVariables };
    let lastResponse: unknown;

    for (const step of endpoint.steps ?? []) {
      const result = await this.executeStep(step, variables);
      if (result === undefined) {
        // Optional lookup did not match; abort remaining steps.
        return this.mapFieldsWithVariables(
          {},
          endpoint.responseMapping.fieldMap,
          variables,
        );
      }
      variables = { ...variables, ...result.variables };
      lastResponse = result.response;
    }

    const root =
      this.getValueByPath(lastResponse, endpoint.responseMapping.dataPath) ?? lastResponse ?? {};
    return this.mapFieldsWithVariables(root, endpoint.responseMapping.fieldMap, variables);
  }

  private async executeStep(
    step: EndpointStep,
    variables: Record<string, string | null>,
  ): Promise<{ variables: Record<string, string | null>; response: unknown } | undefined> {
    const params = this.buildQueryParams(step, {}, variables);
    const body = this.buildBody(step, variables);
    const response = await this.fetchJson(step.method, step.path, params, body, variables);

    if (step.lookup) {
      const items = this.extractItems(response, step.lookup.dataPath, "lookup");
      const expected = variables[step.lookup.againstVariable];
      const match = items.find((item) => {
        const value = this.getValueByPath(item, step.lookup!.field);
        return asString(value) === expected;
      });

      if (!match) {
        if (step.lookup.optional) {
          return undefined;
        }
        throw new ConnectorError(this.provider, "disableCoupon.lookup");
      }

      const extracted = this.extractVariables(match, step.lookup.variableMap, variables);
      if (step.variableMap) {
        const more = this.extractVariables(match, step.variableMap, variables);
        return { variables: { ...extracted, ...more }, response: match };
      }
      return { variables: extracted, response: match };
    }

    if (step.variableMap) {
      return {
        variables: this.extractVariables(response, step.variableMap, variables),
        response,
      };
    }

    return { variables: {}, response };
  }

  private async fetchAndParse(
    endpoint: EndpointMapping,
    params?: Record<string, string>,
    body?: Record<string, unknown>,
    variables: Record<string, string | null> = {},
  ): Promise<unknown> {
    if (!endpoint.method || !endpoint.path) {
      throw new ConnectorError(this.provider, "fetchAndParse.missingEndpoint");
    }
    return this.fetchJson(endpoint.method, endpoint.path, params, body, variables);
  }

  private async fetchJson(
    method: string,
    pathTemplate: string,
    params: Record<string, string> | undefined,
    body: Record<string, unknown> | undefined,
    variables: Record<string, string | null>,
  ): Promise<unknown> {
    const url = this.buildUrl(pathTemplate, params, variables);
    const headers = this.buildHeaders({}, variables);
    if (body !== undefined && ["POST", "PUT", "DELETE"].includes(method)) {
      headers["Content-Type"] = "application/json";
    }

    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      await assertPublicHttpUrl(url);
      response = await fetch(url, init);
    } catch {
      throw new ConnectorError(this.provider, method + pathTemplate);
    }

    if (!response.ok) {
      throw new ConnectorError(this.provider, method + pathTemplate);
    }

    try {
      return (await response.json()) as unknown;
    } catch {
      throw new ConnectorError(this.provider, method + pathTemplate);
    }
  }

  private buildUrl(
    pathTemplate: string,
    params: Record<string, string> | undefined,
    variables: Record<string, string | null> = {},
  ): string {
    const merged = this.mergeVariables(variables);
    const base = this.interpolate(this.config.baseUrl, merged).replace(/\/$/, "");
    const path = this.interpolate(pathTemplate, merged).replace(/^\//, "");
    let url = `${base}/${path}`;
    if (params && Object.keys(params).length > 0) {
      const separator = url.includes("?") ? "&" : "?";
      const search = new URLSearchParams(params).toString();
      url += `${separator}${search}`;
    }
    return url;
  }

  private buildHeaders(
    endpointHeaders: Record<string, string> | undefined,
    variables: Record<string, string | null> = {},
  ): Record<string, string> {
    const merged = this.mergeVariables(variables);
    const headers: Record<string, string> = {};
    if (endpointHeaders) {
      for (const [key, value] of Object.entries(endpointHeaders)) {
        headers[key] = this.interpolate(value, merged);
      }
    }
    const auth = this.config.authPattern;
    if (auth.type === "bearer") {
      const field = auth.tokenField ?? "accessToken";
      const token = this.credentials[field];
      if (token) headers["Authorization"] = `Bearer ${token}`;
    } else if (auth.type === "basic") {
      const user = this.credentials["consumerKey"] ?? this.credentials["username"] ?? "";
      const pass = this.credentials["consumerSecret"] ?? this.credentials["password"] ?? "";
      if (user || pass) {
        headers["Authorization"] = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
      }
    } else if (auth.type === "apiKey" && auth.headerName) {
      const field = auth.tokenField ?? "accessToken";
      const token = this.credentials[field];
      if (token) headers[auth.headerName] = token;
    }
    return headers;
  }

  private mergeVariables(variables: Record<string, string | null>): Record<string, string | null> {
    return { ...this.credentials, ...variables };
  }

  private interpolate(template: string, variables: Record<string, string | null>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = variables[key];
      return value === undefined || value === null ? "" : value;
    });
  }

  private interpolateValues(
    value: unknown,
    variables: Record<string, string | null>,
  ): unknown {
    if (isString(value)) {
      return this.interpolate(value, this.mergeVariables(variables));
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.interpolateValues(item, variables));
    }
    if (isRecord(value)) {
      const next: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        next[key] = this.interpolateValues(val, variables);
      }
      return next;
    }
    return value;
  }

  private extractItems(data: unknown, dataPath: string, operation: string): unknown[] {
    const value = dataPath ? this.getValueByPath(data, dataPath) : data;
    if (Array.isArray(value)) return value;
    if (isRecord(value)) return [value];
    throw new ConnectorError(this.provider, operation);
  }

  private extractVariables(
    item: unknown,
    variableMap: Record<string, string>,
    variables: Record<string, string | null>,
  ): Record<string, string | null> {
    const result: Record<string, string | null> = {};
    for (const [outputKey, sourcePath] of Object.entries(variableMap)) {
      if (sourcePath.startsWith("var:")) {
        const variableName = sourcePath.slice(4);
        result[outputKey] = variables[variableName] ?? null;
        continue;
      }
      const value = this.getValueByPath(item, sourcePath);
      result[outputKey] = value === undefined || value === null ? null : String(value);
    }
    return result;
  }

  private mapFieldsWithVariables(
    item: unknown,
    fieldMap: Record<string, string>,
    variables: Record<string, string | null>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (!isRecord(item) && !Array.isArray(item)) return result;
    for (const [outputKey, sourcePath] of Object.entries(fieldMap)) {
      if (sourcePath.startsWith("var:")) {
        const variableName = sourcePath.slice(4);
        const variableValue = variables[variableName];
        result[outputKey] = variableValue === undefined ? null : variableValue;
      } else {
        result[outputKey] = this.getValueByPath(item, sourcePath);
      }
    }
    return result;
  }

  private getValueByPath(obj: unknown, path: string): unknown {
    if (!path) return obj;
    const tokens = path.match(/[^.[\]]+/g) ?? [];
    let current: unknown = obj;
    for (const token of tokens) {
      if (current === null || current === undefined) return undefined;
      const index = Number(token);
      if (Array.isArray(current) && Number.isInteger(index) && !Number.isNaN(index)) {
        current = current[index];
      } else if (isRecord(current)) {
        current = current[token];
      } else {
        return undefined;
      }
    }
    return current;
  }

  private toProduct(mapped: Record<string, unknown>): ConnectorProduct {
    return {
      externalId: asString(mapped.externalId) ?? "",
      title: asString(mapped.title) ?? "",
      description: asString(mapped.description) ?? null,
      price: toNumber(mapped.price),
      currency: asString(mapped.currency) ?? null,
      inventory: toNumber(mapped.inventory),
      imageUrl: asString(mapped.imageUrl) ?? null,
    };
  }

  private toOrder(mapped: Record<string, unknown>): ConnectorOrder {
    return {
      externalId: asString(mapped.externalId) ?? "",
      total: toNumber(mapped.total) ?? 0,
      currency: asString(mapped.currency) ?? null,
      createdAt: toDate(mapped.createdAt) ?? new Date(),
      customerRef: asString(mapped.customerRef) ?? null,
      customerEmail: asString(mapped.customerEmail) ?? null,
      couponCode: asString(mapped.couponCode) ?? null,
      cartToken: asString(mapped.cartToken) ?? null,
    };
  }

  private toCustomer(mapped: Record<string, unknown>): ConnectorCustomer {
    return {
      externalId: asString(mapped.externalId) ?? "",
      name: asString(mapped.name) ?? null,
      email: asString(mapped.email) ?? null,
    };
  }

  private toDiscount(mapped: Record<string, unknown>): ConnectorDiscount {
    return {
      code: asString(mapped.code) ?? "",
      discountPct: toNumber(mapped.discountPct) ?? 0,
      status: asString(mapped.status) ?? "",
    };
  }

  private toCoupon(mapped: Record<string, unknown>): ConnectorCoupon {
    return {
      code: asString(mapped.code) ?? "",
      discountPct: toNumber(mapped.discountPct) ?? 0,
      expiresAt: toDate(mapped.expiresAt) ?? null,
    };
  }
}
