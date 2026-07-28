/**
 * Middleware-only entrypoint.
 *
 * Importing the full `@/modules/auth` barrel pulls server actions and their
 * Node-only dependencies into the Next.js dev middleware bundle. This
 * re-export surfaces just the `auth` middleware function for use in
 * `src/middleware.ts`.
 */
export { auth } from "./infrastructure/auth";
