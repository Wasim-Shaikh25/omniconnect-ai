/**
 * Reports module — public barrel.
 *
 * This is the ONLY file other modules may import from `@/modules/reports`.
 * It exposes application services / ports and domain event types — never
 * domain entities, repositories, or infrastructure. See
 * docs/architecture/module-boundaries.md.
 *
 * Responsibility: AI-generated weekly/monthly marketing reports.
 * Public contract (to implement): ReportsService (generateReport); events: ReportGenerated.
 */
export const MODULE_NAME = "reports" as const;
