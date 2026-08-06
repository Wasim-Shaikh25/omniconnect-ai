import type { Result } from "@/shared/kernel";
import type { GenerateCouponInput } from "@/modules/ecommerce";
import type { CreateAttributionLink } from "@/modules/attribution";
import type { MetaService } from "@/modules/meta";
import type { AIConfigurationRecord } from "./ports";
import type { AIToolName } from "../domain/tools";

export interface ToolContext {
  projectId: string;
  userId: string;
  config: AIConfigurationRecord;
}

export interface ToolCall {
  id: string;
  name: AIToolName;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface ToolExecutorDependencies {
  generateCoupon: (input: GenerateCouponInput) => Promise<Result<unknown, unknown>>;
  getCouponById: (projectId: string, id: string) => Promise<unknown | null>;
  getTodaySpend: (projectId: string) => Promise<number>;
  createAttributionLink: CreateAttributionLink;
  sendMessage: MetaService["sendMessage"];
  queryAnalytics: (input: { question: string; projectId: string }) => Promise<unknown>;
}

export interface ToolExecutor {
  execute(tool: ToolCall, context: ToolContext): Promise<ToolResult>;
}

export function makeToolExecutor(deps: ToolExecutorDependencies): ToolExecutor {
  return {
    async execute(tool, context) {
      const { projectId, config } = context;

      if (!isAllowedSkill(tool.name, config)) {
        return { ok: false, error: `Skill '${tool.name}' is disabled in AI settings.` };
      }

      try {
        switch (tool.name) {
          case "createCoupon":
            return await executeCreateCoupon(tool.arguments, projectId, config, deps);
          case "injectCoupon":
            return await executeInjectCoupon(tool.arguments, projectId, deps);
          case "sendMessage":
            return await executeSendMessage(tool.arguments, projectId, config, deps);
          case "queryAnalytics":
            return await executeQueryAnalytics(tool.arguments, projectId, deps);
          case "generateDashboard":
            return await executeGenerateDashboard(tool.arguments, projectId, deps);
          default:
            return { ok: false, error: `Unknown tool '${tool.name}'.` };
        }
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : `Tool '${tool.name}' failed.`,
        };
      }
    },
  };
}

function isAllowedSkill(name: AIToolName, config: AIConfigurationRecord): boolean {
  const skills = config.enabledSkills;
  switch (name) {
    case "createCoupon":
      return skills.createCoupon;
    case "injectCoupon":
      return skills.createCoupon;
    case "sendMessage":
      return skills.sendMessage;
    case "queryAnalytics":
    case "generateDashboard":
      return skills.generateDashboard;
    default:
      return false;
  }
}

async function executeCreateCoupon(
  args: Record<string, unknown>,
  projectId: string,
  config: AIConfigurationRecord,
  deps: ToolExecutorDependencies,
): Promise<ToolResult> {
  const discountType = typeof args.discountType === "string" ? args.discountType : "percentage";
  if (discountType !== "percentage") {
    return { ok: false, error: "Fixed discount coupons are not supported yet." };
  }

  const rawAmount = typeof args.amount === "number" ? args.amount : Number(args.amount);
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    return { ok: false, error: "Invalid discount amount." };
  }

  const amount = Math.floor(rawAmount);
  if (amount > config.salesRules.maxDiscountPct) {
    return {
      ok: false,
      error: `Discount exceeds the configured maximum of ${config.salesRules.maxDiscountPct}%.`,
    };
  }

  const todaySpend = await deps.getTodaySpend(projectId);
  if (todaySpend + amount > config.salesRules.dailyBudget) {
    return {
      ok: false,
      error: `Daily coupon budget (${config.salesRules.dailyBudget}) would be exceeded.`,
    };
  }

  const expiresInHours = typeof args.expiresInHours === "number" ? args.expiresInHours : undefined;
  const expiresAt =
    expiresInHours && Number.isFinite(expiresInHours) && expiresInHours > 0
      ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
      : undefined;

  const code =
    typeof args.code === "string" && args.code.length > 0
      ? args.code.toUpperCase()
      : generateCouponCode();

  const result = await deps.generateCoupon({
    projectId,
    code,
    discountPct: amount,
    expiresAt,
    pushToProvider: true,
  });

  if (!result.ok) {
    return { ok: false, error: "Failed to create coupon." };
  }
  return { ok: true, data: { coupon: result.value } };
}

async function executeInjectCoupon(
  args: Record<string, unknown>,
  projectId: string,
  deps: ToolExecutorDependencies,
): Promise<ToolResult> {
  const couponId = typeof args.couponId === "string" ? args.couponId : "";
  if (!couponId) {
    return { ok: false, error: "Missing couponId." };
  }

  const coupon = await deps.getCouponById(projectId, couponId);
  if (!coupon) {
    return { ok: false, error: "Coupon not found." };
  }

  const link = await deps.createAttributionLink({
    projectId,
    couponId,
    utmSource: "ai-assistant",
  });

  return { ok: true, data: { checkoutUrl: link.fullUrl } };
}

async function executeSendMessage(
  args: Record<string, unknown>,
  projectId: string,
  config: AIConfigurationRecord,
  deps: ToolExecutorDependencies,
): Promise<ToolResult> {
  const recipientId = typeof args.recipientId === "string" ? args.recipientId : "";
  const channel = typeof args.channel === "string" ? args.channel : "";
  const text = typeof args.text === "string" ? args.text : "";

  if (!recipientId || !channel || !text) {
    return { ok: false, error: "recipientId, channel, and text are required." };
  }

  const channelKey = channel.toLowerCase();
  const channelSetting = config.channelSettings[channelKey as keyof typeof config.channelSettings];
  if (!channelSetting?.enabled) {
    return { ok: false, error: `Channel '${channel}' is disabled in AI settings.` };
  }

  if (!config.salesRules.autoSend) {
    return {
      ok: true,
      data: { draft: text, sent: false, reason: "autoSend is disabled; approval required." },
    };
  }

  await deps.sendMessage({ projectId, recipientId, text });
  return { ok: true, data: { sent: true, recipientId, channel, text } };
}

async function executeQueryAnalytics(
  args: Record<string, unknown>,
  projectId: string,
  deps: ToolExecutorDependencies,
): Promise<ToolResult> {
  const question = typeof args.question === "string" ? args.question : "";
  if (!question) {
    return { ok: false, error: "Missing question." };
  }

  const result = await deps.queryAnalytics({ question, projectId });
  return { ok: true, data: result };
}

async function executeGenerateDashboard(
  args: Record<string, unknown>,
  projectId: string,
  deps: ToolExecutorDependencies,
): Promise<ToolResult> {
  const topic = typeof args.topic === "string" ? args.topic : "";
  if (!topic) {
    return { ok: false, error: "Missing topic." };
  }

  const result = await deps.queryAnalytics({ question: topic, projectId });
  return { ok: true, data: result };
}

function generateCouponCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "AI";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${code}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}
