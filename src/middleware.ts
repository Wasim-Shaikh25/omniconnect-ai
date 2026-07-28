import { NextResponse } from "next/server";
import { auth } from "@/modules/auth/middleware";
import { buildCSP, generateNonce } from "@/shared/security/csp";

export default auth((request) => {
  const nonce = generateNonce();
  const csp = buildCSP(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", csp);

  return response;
});

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)"],
};
