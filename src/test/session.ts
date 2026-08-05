import { encode } from "@auth/core/jwt";
import { env } from "@/shared/config";

const SESSION_COOKIE_NAME = "authjs.session-token";

function getSecret(): string {
  if (!env.NEXTAUTH_SECRET) {
    throw new Error("NEXTAUTH_SECRET is required to create a test session");
  }
  return env.NEXTAUTH_SECRET;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isSuperAdmin: boolean;
  organizationId: string | null;
  storeId: string | null;
  tokenVersion: number;
}

export interface AuthenticatedRequest {
  headers: Headers;
  cookie: string;
}

export async function actingAs(user: SessionUser): Promise<AuthenticatedRequest> {
  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      organizationId: user.organizationId,
      storeId: user.storeId,
      tokenVersion: user.tokenVersion,
    },
    secret: getSecret(),
    salt: SESSION_COOKIE_NAME,
  });

  const cookie = `${SESSION_COOKIE_NAME}=${token}`;
  return {
    cookie,
    headers: new Headers({ cookie }),
  };
}

export function requestWithSession(
  url: string,
  init: RequestInit = {},
  session: AuthenticatedRequest,
): Request {
  const headers = new Headers(init.headers);
  headers.set("cookie", session.cookie);
  return new Request(url, { ...init, headers });
}
