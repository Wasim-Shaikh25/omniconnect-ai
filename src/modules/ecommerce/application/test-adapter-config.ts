import type { EcommerceConnector } from "../domain/connector";
import type { AdapterConfigMapping } from "../domain/adapter-config";
import type { DynamicConnectorFactory } from "./ports";

export interface TestAdapterConfigInput {
  projectId: string;
  config: AdapterConfigMapping;
  credentials: Record<string, string>;
}

export interface TestAdapterConfigSuccess {
  valid: true;
  storeName: string;
  productCount: number;
}

export interface TestAdapterConfigFailure {
  valid: false;
  error: string;
}

export type TestAdapterConfigResult =
  | TestAdapterConfigSuccess
  | TestAdapterConfigFailure;

export function makeTestAdapterConfig(deps: {
  buildConnector: DynamicConnectorFactory["build"];
}): (input: TestAdapterConfigInput) => Promise<TestAdapterConfigResult> {
  return async function testAdapterConfig(
    input: TestAdapterConfigInput,
  ): Promise<TestAdapterConfigResult> {
    let connector: EcommerceConnector;
    try {
      connector = deps.buildConnector(input.config, input.credentials);
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Invalid connector configuration",
      };
    }

    try {
      const storeInfo = await connector.fetchStoreInfo();
      const products = await connector.getProducts(1);
      return {
        valid: true,
        storeName: storeInfo.name,
        productCount: products.length,
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Connection test failed",
      };
    }
  };
}
