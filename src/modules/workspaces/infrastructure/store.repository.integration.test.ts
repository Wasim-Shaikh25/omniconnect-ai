import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/shared/database";
import { PrismaStoreRepository } from "./store.repository";
import { StoreNameExistsError } from "../domain/errors";

const repository = new PrismaStoreRepository();

describe("PrismaStoreRepository.create name uniqueness", () => {
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        name: "Store Repository Test User",
        email: `store-repo-${Date.now()}@example.com`,
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.project.deleteMany({ where: { userId } });
    await prisma.workspace.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it("allows the first project with a name", async () => {
    const store = await repository.create({
      userId,
      name: "Unique Store",
      provider: "SHOPIFY",
      domain: null,
    });
    expect(store.name).toBe("Unique Store");
  });

  it("throws StoreNameExistsError when a duplicate name is created", async () => {
    await expect(
      repository.create({
        userId,
        name: "Unique Store",
        provider: "SHOPIFY",
        domain: null,
      }),
    ).rejects.toBeInstanceOf(StoreNameExistsError);
  });
});
