/** Application roles. Mirrors the Prisma `Role` enum but kept framework-free here. */
export const ROLES = ["USER", "SUPER_ADMIN"] as const;

export type Role = (typeof ROLES)[number];

/** Role hierarchy: a higher rank satisfies any requirement at or below it. */
const RANK: Record<Role, number> = {
  USER: 1,
  SUPER_ADMIN: 2,
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** True when `actual` meets or exceeds the `required` role. */
export function roleSatisfies(actual: Role, required: Role): boolean {
  return RANK[actual] >= RANK[required];
}
