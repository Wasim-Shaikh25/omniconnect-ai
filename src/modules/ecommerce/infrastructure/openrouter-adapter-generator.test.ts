import { describe, it, expect, vi } from "vitest";
import { makeOpenRouterAdapterGenerator, AdapterConfigGenerationError } from "./openrouter-adapter-generator";
import type { AIProvider } from "@/modules/ai";

function fakeAiProvider(response: string): AIProvider {
  return {
    complete: vi.fn(async (): Promise<string> => response),
  };
}

const validMapping = {
  platformName: "MockCommerce",
  baseUrl: "https://{{shopDomain}}/api/v1",
  authPattern: { type: "bearer" as const, tokenField: "accessToken" },
  credentialSchema: {
    fields: [
      { key: "shopDomain", label: "Shop domain", type: "url" as const, required: true },
      { key: "accessToken", label: "Access token", type: "password" as const, required: true },
    ],
  },
  endpoints: {
    getProducts: {
      method: "GET" as const,
      path: "/products",
      responseMapping: {
        dataPath: "products",
        fieldMap: {
          externalId: "id",
          title: "title",
          description: "description",
          price: "price",
          currency: "currency",
          inventory: "stock",
          imageUrl: "image_url",
        },
      },
    },
    getOrders: {
      method: "GET" as const,
      path: "/orders",
      responseMapping: { dataPath: "orders", fieldMap: { externalId: "id", total: "total", currency: "currency", createdAt: "created_at" } },
    },
    getCustomers: {
      method: "GET" as const,
      path: "/customers",
      responseMapping: { dataPath: "customers", fieldMap: { externalId: "id", name: "name", email: "email" } },
    },
    fetchDiscounts: {
      method: "GET" as const,
      path: "/discounts",
      responseMapping: { dataPath: "discounts", fieldMap: { code: "code", discountPct: "value", status: "status" } },
    },
    createCoupon: {
      method: "POST" as const,
      path: "/coupons",
      body: { code: "{{code}}", value: "{{discountPct}}" },
      responseMapping: { dataPath: "coupon", fieldMap: { code: "code", discountPct: "value", expiresAt: "expires_at" } },
    },
    disableCoupon: {
      method: "POST" as const,
      path: "/coupons/{{code}}/disable",
      body: {},
      responseMapping: { dataPath: "", fieldMap: {} },
    },
    fetchStoreInfo: {
      method: "GET" as const,
      path: "/shop",
      responseMapping: { dataPath: "shop", fieldMap: { name: "name", domain: "domain", currency: "currency" } },
    },
  },
};

describe("makeOpenRouterAdapterGenerator", () => {
  it("parses and validates a valid JSON response from the AI provider", async () => {
    const ai = fakeAiProvider(JSON.stringify(validMapping));
    const generator = makeOpenRouterAdapterGenerator({ aiProvider: ai, model: "openai/gpt-4o-mini" });

    const result = await generator.generate({
      platformName: "MockCommerce",
      apiDocs: "GET /api/v1/products returns id, title, price.",
      userId: "user-1",
    });

    expect(result.platformName).toBe("MockCommerce");
    expect(result.endpoints.getProducts.method).toBe("GET");
    expect(ai.complete).toHaveBeenCalled();
  });

  it("extracts JSON from a markdown-fenced response", async () => {
    const ai = fakeAiProvider(`\`\`\`json\n${JSON.stringify(validMapping)}\n\`\`\``);
    const generator = makeOpenRouterAdapterGenerator({ aiProvider: ai, model: "openai/gpt-4o-mini" });

    const result = await generator.generate({
      platformName: "MockCommerce",
      apiDocs: "docs",
      userId: "user-1",
    });

    expect(result.platformName).toBe("MockCommerce");
  });

  it("throws AdapterConfigGenerationError when the AI response is invalid JSON", async () => {
    const ai = fakeAiProvider("not-json");
    const generator = makeOpenRouterAdapterGenerator({ aiProvider: ai, model: "openai/gpt-4o-mini" });

    await expect(
      generator.generate({ platformName: "Bad", apiDocs: "docs", userId: "user-1" }),
    ).rejects.toThrow(AdapterConfigGenerationError);
  });

  it("throws AdapterConfigGenerationError when the JSON fails schema validation", async () => {
    const ai = fakeAiProvider(JSON.stringify({ platformName: "Bad" }));
    const generator = makeOpenRouterAdapterGenerator({ aiProvider: ai, model: "openai/gpt-4o-mini" });

    await expect(
      generator.generate({ platformName: "Bad", apiDocs: "docs", userId: "user-1" }),
    ).rejects.toThrow(AdapterConfigGenerationError);
  });
});
