import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resetDatabase } from "@/test/reset";
import { PrismaVerificationRequestRepository } from "./verification-request.repository";
import { generateVerificationToken, hashVerificationToken } from "../domain/verification-token";

describe("PrismaVerificationRequestRepository", () => {
  const repository = new PrismaVerificationRequestRepository();

  beforeAll(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await resetDatabase();
  });

  it("saves and finds a verification request by token hash", async () => {
    const token = generateVerificationToken();
    const tokenHash = await hashVerificationToken(token);
    const saved = await repository.save({
      userId: null,
      channel: "email",
      purpose: "signup",
      target: "test@example.com",
      tokenHash,
      salt: null,
      attempts: 0,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      consumedAt: null,
    });

    const found = await repository.findByTokenHash(tokenHash);
    expect(found?.id).toBe(saved.id);
    expect(found?.target).toBe("test@example.com");
  });

  it("marks a request as consumed", async () => {
    const token = generateVerificationToken();
    const tokenHash = await hashVerificationToken(token);
    const saved = await repository.save({
      userId: null,
      channel: "email",
      purpose: "signup",
      target: "consume@example.com",
      tokenHash,
      salt: null,
      attempts: 0,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      consumedAt: null,
    });

    await repository.consume(saved.id);
    const found = await repository.findByTokenHash(tokenHash);
    expect(found?.consumedAt).not.toBeNull();
  });

  it("counts recent non-consumed requests by target", async () => {
    const target = "recent@example.com";
    for (let i = 0; i < 3; i++) {
      const token = generateVerificationToken();
      const tokenHash = await hashVerificationToken(token);
      await repository.save({
        userId: null,
        channel: "email",
        purpose: "signup",
        target,
        tokenHash,
        salt: null,
        attempts: 0,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        consumedAt: null,
      });
    }

    const since = new Date(Date.now() - 60 * 60 * 1000);
    const count = await repository.countRecentByTarget(target, "signup", since);
    expect(count).toBe(3);
  });
});
