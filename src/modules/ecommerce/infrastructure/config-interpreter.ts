import type { EcommerceConnector } from "../domain/connector";
import type { AdapterConfigMapping } from "../domain/adapter-config";

export class ConfigInterpreterNotImplementedError extends Error {
  constructor(operation: string) {
    super(`ConfigInterpreter operation not yet implemented: ${operation}`);
  }
}

/**
 * Safe HTTP executor that implements `EcommerceConnector` from a generated
 * `AdapterConfigMapping`. No AI-generated code is evaluated; only the JSON
 * mapping is interpreted.
 *
 * This is a scaffold: the interpreter validates the mapping at construction
 * and rejects each operation until the HTTP execution layer is wired.
 */
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

  fetchStoreInfo(): Promise<never> {
    return Promise.reject(new ConfigInterpreterNotImplementedError("fetchStoreInfo"));
  }

  getProducts(): Promise<never> {
    return Promise.reject(new ConfigInterpreterNotImplementedError("getProducts"));
  }

  getOrders(): Promise<never> {
    return Promise.reject(new ConfigInterpreterNotImplementedError("getOrders"));
  }

  getCustomers(): Promise<never> {
    return Promise.reject(new ConfigInterpreterNotImplementedError("getCustomers"));
  }

  fetchDiscounts(): Promise<never> {
    return Promise.reject(new ConfigInterpreterNotImplementedError("fetchDiscounts"));
  }

  generateCoupon(): Promise<never> {
    return Promise.reject(new ConfigInterpreterNotImplementedError("generateCoupon"));
  }

  disableCoupon(): Promise<never> {
    return Promise.reject(new ConfigInterpreterNotImplementedError("disableCoupon"));
  }
}
