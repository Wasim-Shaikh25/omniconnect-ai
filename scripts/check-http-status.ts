/**
 * CI-runnable HTTP status assertions for REQ-0068 M7.
 *
 * Assumes the app is already running at APP_URL / BASE_URL and that the
 * database is reachable. Creates isolated tenant fixtures, signs sessions,
 * fetches the three probes, and asserts both status codes and the absence of
 * data leakage in 404 bodies.
 */

import { randomUUID } from "node:crypto";
import { prisma } from "@/shared/database";
import { createTenant } from "@/test/fixtures";
import { actingAs } from "@/test/session";

const BASE = process.env.BASE_URL ?? process.env.APP_URL ?? "http://127.0.0.1:3000";
const TIMEOUT_MS = Number(process.env.CHECK_TIMEOUT_MS ?? "30000");

interface Probe {
  label: string;
  method: string;
  path: string;
  cookie?: string;
  expected: number;
  allow?: number[];
}

async function waitForServer(): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < TIMEOUT_MS) {
    try {
      const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(2000) });
      if (res.status === 200) return;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${BASE} did not become healthy within ${TIMEOUT_MS}ms`);
}

async function request(probe: Probe): Promise<{ status: number; location: string | null; body: string }> {
  const res = await fetch(`${BASE}${probe.path}`, {
    method: probe.method,
    headers: probe.cookie ? { cookie: probe.cookie } : {},
    redirect: "manual",
  });
  const body = await res.text();
  return {
    status: res.status,
    location: res.headers.get("location"),
    body,
  };
}

function assertStatus(label: string, status: number, expected: number, allow: number[] = []): void {
  const allowed = [expected, ...allow];
  if (!allowed.includes(status)) {
    throw new Error(`${label}: expected ${expected}, got ${status}`);
  }
}

async function main(): Promise<void> {
  let tenantA: Awaited<ReturnType<typeof createTenant>> | undefined;
  let tenantB: Awaited<ReturnType<typeof createTenant>> | undefined;

  try {
    await waitForServer();

    // Isolated fixtures use UUIDs so the script can be re-run without a full reset.
    tenantA = await createTenant("m7-a");
    tenantB = await createTenant("m7-b");

    const ownerA = tenantA.owner;
    const ownerASession = await actingAs({
      id: ownerA.id,
      email: ownerA.email,
      name: ownerA.name,
      role: ownerA.role,
      isSuperAdmin: ownerA.isSuperAdmin,
      organizationId: ownerA.organizationId,
      storeId: ownerA.storeId,
      tokenVersion: ownerA.tokenVersion,
    });

    // 1. /stores/{other-tenant-id} as tenant A -> 404, no store name leak.
    const otherStore = await request({
      label: "/stores/{other-tenant-id}",
      method: "GET",
      path: `/stores/${tenantB.store.id}`,
      cookie: ownerASession.cookie,
      expected: 404,
    });
    assertStatus("other-tenant store", otherStore.status, 404);
    if (otherStore.body.includes(tenantB.store.name) || otherStore.body.includes(tenantB.organization.name)) {
      throw new Error("other-tenant store 404 body leaks tenant B data");
    }

    // 2. /stores/does-not-exist -> 404, no leak.
    const missingStore = await request({
      label: "/stores/does-not-exist",
      method: "GET",
      path: `/stores/does-not-exist-${randomUUID()}`,
      cookie: ownerASession.cookie,
      expected: 404,
    });
    assertStatus("missing store", missingStore.status, 404);
    if (missingStore.body.includes(tenantA.store.name) || missingStore.body.includes(tenantA.organization.name)) {
      throw new Error("missing store 404 body leaks tenant A data");
    }

    // 3. /admin/organizations as non-super-admin -> 307 to /dashboard.
    const adminRedirect = await request({
      label: "/admin/organizations (non-admin)",
      method: "GET",
      path: "/admin/organizations",
      cookie: ownerASession.cookie,
      expected: 307,
    });
    assertStatus("admin organizations non-admin", adminRedirect.status, 307);
    const location = adminRedirect.location ?? "";
    if (!location.includes("/dashboard")) {
      throw new Error(`expected redirect to /dashboard, got ${location}`);
    }

    console.log("check-http-status: all probes passed");
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    if (tenantA && tenantB) {
      // Best-effort cleanup so the script can be re-run locally without clutter.
      await prisma.$transaction([
        prisma.store.deleteMany({ where: { id: { in: [tenantA.store.id, tenantB.store.id] } } }),
        prisma.user.deleteMany({ where: { id: { in: [tenantA.owner.id, tenantA.staff.id, tenantB.owner.id, tenantB.staff.id] } } }),
        prisma.organization.deleteMany({ where: { id: { in: [tenantA.organization.id, tenantB.organization.id] } } }),
      ]).catch(() => {
        // ignore cleanup errors
      });
    }
  }
}

main();
