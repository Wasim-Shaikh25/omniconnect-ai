import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "@/shared/database";
import { resetDatabase } from "@/test/reset";
import { prismaDataExportBuilder } from "./data-export";

describe("prismaDataExportBuilder", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
  });

  it("includes the user's phone number in the GDPR export and omits the password hash", async () => {
    const user = await prisma.user.create({
      data: {
        email: "export-test@example.com",
        name: "Export Test",
        phone: "+447700900123",
        passwordHash: "hashed",
      },
    });

    const exported = await prismaDataExportBuilder.build(user.id);
    expect(exported.user.phone).toBe("+447700900123");
    expect(exported.user.passwordHash).toBeUndefined();
  });
});
