import type { AIConfigurationRecord } from "./ports";

export interface SystemPromptContext {
  brandName: string;
  storeUrl?: string | null;
  productCount?: number;
  topProducts?: Array<{ title: string }>;
}

export function buildSystemPrompt(
  config: AIConfigurationRecord,
  context: SystemPromptContext,
): string {
  const variables: Record<string, string> = {
    "{{ai_name}}": config.aiName ?? "AI Assistant",
    "{{brand_name}}": context.brandName,
    "{{product_count}}": String(context.productCount ?? 0),
    "{{top_products}}": context.topProducts?.map((p) => p.title).join(", ") ?? "",
    "{{store_url}}": context.storeUrl ?? "",
  };

  let prompt = config.systemPrompt;
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replaceAll(key, value);
  }

  const sections: string[] = [prompt];

  sections.push(`\nBrand voice: ${config.brandVoice ?? config.tone ?? "friendly and concise"}`);
  sections.push(`Language: ${config.language}`);

  if (config.enabledSkills.createCoupon) {
    sections.push(
      `\nYou can create coupons. Rules: ` +
        `max ${config.salesRules.maxDiscountPct}% discount, ` +
        `max ${config.salesRules.maxUses} uses, ` +
        `daily budget $${config.salesRules.dailyBudget}. ` +
        (config.salesRules.autoSend
          ? "Auto-send enabled — create and share coupons automatically."
          : "Suggest only — wait for owner approval before creating a coupon."),
    );
  } else {
    sections.push("\nYou cannot create coupons. If the customer asks for one, escalate to a human.");
  }

  if (!config.enabledSkills.sendMessage) {
    sections.push("\nOutbound messaging is disabled. Do not send DMs or comments on behalf of the brand.");
  }
  if (!config.enabledSkills.generateDashboard) {
    sections.push("\nDashboard generation is disabled. Decline analytics requests and suggest a human.");
  }
  if (!config.enabledSkills.accessOrderData) {
    sections.push("\nOrder data access is disabled. Do not look up orders or refunds; escalate.");
  }
  if (config.enabledSkills.triggerCampaigns) {
    sections.push("\nYou can trigger pre-approved campaigns when the customer opts in.");
  }

  const channelLines = Object.entries(config.channelSettings)
    .filter(([, setting]) => setting.enabled)
    .map(([channel, setting]) => {
      const hours =
        setting.businessHoursStart && setting.businessHoursEnd
          ? ` (business hours ${setting.businessHoursStart}–${setting.businessHoursEnd})`
          : "";
      return `- ${channel}: tone="${setting.tone}"${hours}`;
    });
  if (channelLines.length) {
    sections.push(`\nChannel settings:\n${channelLines.join("\n")}`);
  }

  const escalation = [
    config.escalationRules.onComplaint && "on complaint",
    config.escalationRules.onRefundRequest && "on refund request",
    config.escalationRules.onLowConfidence && "on low confidence",
  ]
    .filter(Boolean)
    .join(", ");
  if (escalation) {
    sections.push(`\nEscalate to a human when: ${escalation}.`);
  }
  if (config.escalationRules.notifyEmail) {
    sections.push(`Notify ${config.escalationRules.notifyEmail} on escalation.`);
  }

  if (config.knowledgeBase?.trim()) {
    sections.push(`\nKnowledge base:\n${config.knowledgeBase.trim()}`);
  }

  if (config.productKnowledge?.trim()) {
    sections.push(`\nProduct catalog:\n${config.productKnowledge.trim()}`);
  }

  if (config.welcomeStrategy?.trim()) {
    sections.push(`\nWelcome strategy:\n${config.welcomeStrategy}`);
  }
  if (config.couponStrategy?.trim()) {
    sections.push(`\nCoupon strategy:\n${config.couponStrategy}`);
  }
  if (config.salesStrategy?.trim()) {
    sections.push(`\nSales strategy:\n${config.salesStrategy}`);
  }

  return sections.join("\n").trim();
}
