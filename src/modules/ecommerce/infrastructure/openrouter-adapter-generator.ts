import type { AIProvider, AIMessage, AICompletionConfig } from "@/modules/ai";
import type { AdapterConfigMapping } from "../domain/adapter-config";
import { validateAdapterConfigMapping } from "./adapter-config-schema";

export class AdapterConfigGenerationError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
  }
}

export interface OpenRouterAdapterGeneratorDeps {
  aiProvider: Pick<AIProvider, "complete">;
  model: string;
}

const SYSTEM_PROMPT = `You are an e-commerce API mapping engineer.

Your task is to read the provided API documentation for an e-commerce platform and produce a single JSON object that conforms to the AdapterConfigMapping schema below. The JSON will be used by a safe interpreter (no code execution) to call the platform's REST endpoints. Do not output any explanation, only the JSON object.

Schema:

{
  "platformName": "string",
  "baseUrl": "string (URL template, e.g. https://{{shopDomain}}/admin/api/2024-01)",
  "authPattern": {
    "type": "bearer | basic | apiKey",
    "headerName": "optional string for apiKey",
    "tokenField": "optional credential key name (default accessToken)"
  },
  "credentialSchema": {
    "fields": [
      { "key": "string", "label": "string", "type": "text | password | url", "required": boolean, "placeholder": "optional" }
    ]
  },
  "endpoints": {
    "getProducts": { "method": "GET", "path": "string", "headers": {}, "queryParams": {}, "body": {}, "responseMapping": { "dataPath": "string (dot/bracket path to array of results, e.g. products or data)", "fieldMap": { "externalId": "id", "title": "title", "description": "body_html", "price": "variants.0.price", "currency": "currency", "inventory": "variants.0.inventory_quantity", "imageUrl": "image.src" } } },
    "getOrders": { "method": "GET", "path": "string", "responseMapping": { "dataPath": "string", "fieldMap": { "externalId": "id", "total": "total_price", "currency": "currency", "createdAt": "created_at", "customerRef": "customer.id", "customerEmail": "email", "couponCode": "discount_codes.0.code", "cartToken": "token" } } },
    "getCustomers": { "method": "GET", "path": "string", "responseMapping": { "dataPath": "string", "fieldMap": { "externalId": "id", "name": "first_name last_name joined with space", "email": "email" } } },
    "fetchDiscounts": { "method": "GET", "path": "string", "responseMapping": { "dataPath": "string", "fieldMap": { "code": "code", "discountPct": "value", "status": "status" } } },
    "createCoupon": { "method": "POST", "path": "string", "body": { "price_rule": { "title": "{{code}}", "value_type": "percentage", "value": "{{discountPct}}", "starts_at": "{{expiresAt}}" } }, "responseMapping": { "dataPath": "string", "fieldMap": { "code": "code", "discountPct": "value", "expiresAt": "expires_at" } } },
    "disableCoupon": { "method": "POST | PUT | DELETE", "path": "string", "body": {}, "responseMapping": { "dataPath": "", "fieldMap": {} } },
    "fetchStoreInfo": { "method": "GET", "path": "string", "responseMapping": { "dataPath": "string", "fieldMap": { "name": "name", "domain": "domain", "currency": "currency", "provider": "myshopify" } } }
  },
  "pagination": {
    "type": "cursor | offset | link-header",
    "cursorField": "optional",
    "limitParam": "optional, e.g. limit",
    "maxPerPage": 250
  }
}

Rules:
- Use GET for list/fetch operations and POST/PUT for writes.
- baseUrl must be a valid URL template and may include {{shopDomain}}.
- path may include {{code}} for coupon codes.
- responseMapping.dataPath may be empty ("" or "data") to target the root object/array.
- Use dot paths and bracket indices for fieldMap values, e.g. variants[0].price, variants.0.price, image.src, customer.email.
- For fields that combine two source values (like "first_name last_name"), do not do that; pick the closest single field or use a dot path.
- Do not invent endpoints not in the docs. If an endpoint is not documented, still include the mapping key with empty/placeholder values based on common REST conventions.
- Output ONLY valid JSON. No markdown fences, no explanation.`;

function extractJsonBlock(text: string): string {
  const trimmed = text.trim();
  const codeBlock = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  if (codeBlock && codeBlock[1]) return codeBlock[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

export function makeOpenRouterAdapterGenerator(
  deps: OpenRouterAdapterGeneratorDeps,
): {
  generate(input: {
    platformName: string;
    apiDocs: string;
    userId: string;
    projectId?: string | null;
  }): Promise<AdapterConfigMapping>;
} {
  return {
    async generate(input) {
      const messages: AIMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Platform: ${input.platformName}\n\nAPI documentation:\n${input.apiDocs}`,
        },
      ];

      const config: AICompletionConfig = {
        model: deps.model,
        operation: "adapter-config-generation",
        metadata: {
          userId: input.userId,
          projectId: input.projectId ?? null,
        },
      };

      let raw: string;
      try {
        raw = await deps.aiProvider.complete(messages, config);
      } catch (error) {
        throw new AdapterConfigGenerationError(
          "AI adapter generation request failed",
          error,
        );
      }

      const jsonText = extractJsonBlock(raw);
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch (error) {
        throw new AdapterConfigGenerationError(
          "AI adapter generation returned invalid JSON",
          error,
        );
      }

      try {
        return validateAdapterConfigMapping(parsed);
      } catch (error) {
        throw new AdapterConfigGenerationError(
          "Generated adapter config failed schema validation",
          error,
        );
      }
    },
  };
}
