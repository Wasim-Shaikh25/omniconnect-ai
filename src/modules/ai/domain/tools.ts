/**
 * Provider-agnostic function-calling tool definitions for the AI assistant.
 *
 * This file lives in the pure domain layer and intentionally does not import
 * infrastructure types. Adapters in `infrastructure/` map `AIToolDefinition`
 * to vendor-specific schemas such as OpenRouter's tool format.
 */

export interface AIToolParameter {
  type: string;
  description?: string;
  enum?: string[];
  items?: { type: string };
  required?: boolean;
}

export interface AIToolFunction {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, AIToolParameter>;
    required?: string[];
  };
}

export interface AIToolDefinition {
  type: "function";
  function: AIToolFunction;
}

export interface AIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export const AI_TOOLS: AIToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "createCoupon",
      description:
        "Create a custom discount coupon for a customer. Respects max discount and daily budget guardrails.",
      parameters: {
        type: "object",
        properties: {
          discountType: {
            type: "string",
            enum: ["percentage", "fixed"],
            description: "Whether the discount is a percentage or fixed amount.",
          },
          amount: {
            type: "number",
            description: "Discount value. Percentage is 0-100. Fixed is in smallest currency unit.",
          },
          code: {
            type: "string",
            description: "Optional coupon code. If omitted, one will be generated.",
          },
          expiresInHours: {
            type: "number",
            description: "Number of hours until the coupon expires.",
          },
          maxUses: {
            type: "number",
            description: "Maximum number of times the coupon can be used.",
          },
          productIds: {
            type: "array",
            items: { type: "string" },
            description: "Optional list of product IDs the coupon applies to.",
          },
        },
        required: ["discountType", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "injectCoupon",
      description:
        "Push an existing coupon to the connected e-commerce platform and generate a shareable checkout link.",
      parameters: {
        type: "object",
        properties: {
          couponId: {
            type: "string",
            description: "ID of the coupon to inject.",
          },
        },
        required: ["couponId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "sendMessage",
      description:
        "Send a message to a customer on a supported channel. Respects the autoSend guardrail; may return a draft for approval.",
      parameters: {
        type: "object",
        properties: {
          recipientId: {
            type: "string",
            description: "External customer/follower ID or conversation ID.",
          },
          channel: {
            type: "string",
            enum: ["instagram", "facebook", "whatsapp"],
            description: "Channel to send the message on.",
          },
          text: {
            type: "string",
            description: "Message text to send.",
          },
        },
        required: ["recipientId", "channel", "text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "queryAnalytics",
      description:
        "Run a natural-language analytics query and get structured business metrics. Examples: 'sales this week', 'top products last month'.",
      parameters: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "Natural-language question about business metrics.",
          },
        },
        required: ["question"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generateDashboard",
      description:
        "Generate a dashboard JSON schema for a requested topic. The returned schema is rendered by the DynamicDashboard component.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description: "Topic for the dashboard, e.g. 'sales performance' or 'competitor comparison'.",
          },
        },
        required: ["topic"],
      },
    },
  },
];

export type AIToolName = "createCoupon" | "injectCoupon" | "sendMessage" | "queryAnalytics" | "generateDashboard";
