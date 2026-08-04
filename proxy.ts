// Next 16 renamed `middleware.ts` to `proxy.ts` and the exported function to `proxy()`.
// Same NextRequest/NextResponse API, same config.matcher, same project-root location.

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    if (authed) return NextResponse.redirect(new URL("/add", req.url));
    return NextResponse.next();
  }

  if (!authed) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|manifest.webmanifest|sw.js|icons/|offline.html|robots.txt).*)",
  ],
};
