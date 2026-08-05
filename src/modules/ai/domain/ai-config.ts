export interface EnabledSkills {
  createCoupon: boolean;
  sendMessage: boolean;
  generateDashboard: boolean;
  accessOrderData: boolean;
  triggerCampaigns: boolean;
}

export interface SalesRules {
  maxDiscountPct: number;
  maxUses: number;
  dailyBudget: number;
  autoSend: boolean;
}

export interface ChannelSetting {
  enabled: boolean;
  tone: string;
  businessHoursStart: string | null; // HH:MM
  businessHoursEnd: string | null;
}

export interface ChannelSettings {
  instagram: ChannelSetting;
  facebook: ChannelSetting;
  whatsapp: ChannelSetting;
}

export interface EscalationRules {
  onComplaint: boolean;
  onRefundRequest: boolean;
  onLowConfidence: boolean;
  notifyEmail: string | null;
  notifyPush: boolean;
}

export interface ModelOverrides {
  reply?: string;
  content?: string;
  dashboard?: string;
  inspector?: string;
  analysis?: string;
}

export const defaultEnabledSkills: EnabledSkills = {
  createCoupon: true,
  sendMessage: true,
  generateDashboard: true,
  accessOrderData: true,
  triggerCampaigns: false,
};

export const defaultSalesRules: SalesRules = {
  maxDiscountPct: 20,
  maxUses: 100,
  dailyBudget: 100,
  autoSend: false,
};

export const defaultChannelSetting: ChannelSetting = {
  enabled: true,
  tone: "friendly and concise",
  businessHoursStart: null,
  businessHoursEnd: null,
};

export const defaultChannelSettings: ChannelSettings = {
  instagram: defaultChannelSetting,
  facebook: defaultChannelSetting,
  whatsapp: defaultChannelSetting,
};

export const defaultEscalationRules: EscalationRules = {
  onComplaint: true,
  onRefundRequest: true,
  onLowConfidence: true,
  notifyEmail: null,
  notifyPush: true,
};

export const defaultModelOverrides: ModelOverrides = {};

export function parseEnabledSkills(value: unknown): EnabledSkills {
  if (!value || typeof value !== "object") return { ...defaultEnabledSkills };
  const v = value as Partial<EnabledSkills>;
  return {
    createCoupon: Boolean(v.createCoupon ?? defaultEnabledSkills.createCoupon),
    sendMessage: Boolean(v.sendMessage ?? defaultEnabledSkills.sendMessage),
    generateDashboard: Boolean(v.generateDashboard ?? defaultEnabledSkills.generateDashboard),
    accessOrderData: Boolean(v.accessOrderData ?? defaultEnabledSkills.accessOrderData),
    triggerCampaigns: Boolean(v.triggerCampaigns ?? defaultEnabledSkills.triggerCampaigns),
  };
}

export function parseSalesRules(value: unknown): SalesRules {
  if (!value || typeof value !== "object") return { ...defaultSalesRules };
  const v = value as Partial<SalesRules>;
  return {
    maxDiscountPct: clampInt(v.maxDiscountPct, 0, 100, defaultSalesRules.maxDiscountPct),
    maxUses: clampInt(v.maxUses, 1, 10000, defaultSalesRules.maxUses),
    dailyBudget: clampInt(v.dailyBudget, 0, 100000, defaultSalesRules.dailyBudget),
    autoSend: Boolean(v.autoSend ?? defaultSalesRules.autoSend),
  };
}

export function parseChannelSetting(value: unknown): ChannelSetting {
  if (!value || typeof value !== "object") return { ...defaultChannelSetting };
  const v = value as Partial<ChannelSetting>;
  return {
    enabled: Boolean(v.enabled ?? defaultChannelSetting.enabled),
    tone: String(v.tone ?? defaultChannelSetting.tone),
    businessHoursStart: isTime(v.businessHoursStart) ? v.businessHoursStart : null,
    businessHoursEnd: isTime(v.businessHoursEnd) ? v.businessHoursEnd : null,
  };
}

export function parseChannelSettings(value: unknown): ChannelSettings {
  if (!value || typeof value !== "object") return { ...defaultChannelSettings };
  const v = value as Partial<Record<keyof ChannelSettings, unknown>>;
  return {
    instagram: parseChannelSetting(v.instagram),
    facebook: parseChannelSetting(v.facebook),
    whatsapp: parseChannelSetting(v.whatsapp),
  };
}

export function parseEscalationRules(value: unknown): EscalationRules {
  if (!value || typeof value !== "object") return { ...defaultEscalationRules };
  const v = value as Partial<EscalationRules>;
  return {
    onComplaint: Boolean(v.onComplaint ?? defaultEscalationRules.onComplaint),
    onRefundRequest: Boolean(v.onRefundRequest ?? defaultEscalationRules.onRefundRequest),
    onLowConfidence: Boolean(v.onLowConfidence ?? defaultEscalationRules.onLowConfidence),
    notifyEmail: isStringOrNull(v.notifyEmail),
    notifyPush: Boolean(v.notifyPush ?? defaultEscalationRules.notifyPush),
  };
}

export function parseModelOverrides(value: unknown): ModelOverrides {
  if (!value || typeof value !== "object") return {};
  const v = value as Partial<ModelOverrides>;
  const out: ModelOverrides = {};
  if (v.reply) out.reply = String(v.reply);
  if (v.content) out.content = String(v.content);
  if (v.dashboard) out.dashboard = String(v.dashboard);
  if (v.inspector) out.inspector = String(v.inspector);
  if (v.analysis) out.analysis = String(v.analysis);
  return out;
}

function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function isTime(value: unknown): value is string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

function isStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
