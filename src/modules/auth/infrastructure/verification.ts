"use server";

import { prisma } from "@/shared/database";

const PURPOSE_TTL_MS: Record<string, number> = {
  mfa: 10 * 60 * 1000,
  reset: 60 * 60 * 1000,
};

function makeIdentifier(purpose: string, email: string): string {
  return `${purpose}:${email.toLowerCase()}`;
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export interface VerificationResult {
  ok: boolean;
  code?: string;
}

export async function createVerificationCode(
  email: string,
  purpose: string,
): Promise<VerificationResult> {
  const identifier = makeIdentifier(purpose, email);
  const code = generateCode();
  const expires = new Date(Date.now() + (PURPOSE_TTL_MS[purpose] ?? PURPOSE_TTL_MS.mfa));

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: { identifier, token: code, expires },
    }),
  ]);

  return { ok: true, code };
}

export async function consumeVerificationCode(
  email: string,
  purpose: string,
  code: string,
): Promise<boolean> {
  const identifier = makeIdentifier(purpose, email);
  const rows = await prisma.verificationToken.findMany({
    where: { identifier, token: code },
  });
  if (rows.length === 0) return false;
  const match = rows[0];
  if (new Date() > match.expires) {
    await prisma.verificationToken.deleteMany({ where: { identifier, token: code } });
    return false;
  }
  await prisma.verificationToken.deleteMany({ where: { identifier, token: code } });
  return true;
}
