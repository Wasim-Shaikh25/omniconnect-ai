/**
 * Server-only analytics module barrel.
 *
 * Exports wired repositories and services. Client code should use `@/modules/analytics`.
 */
export { PrismaTrackedAccountRepository } from "./infrastructure/tracked-account.repository";
