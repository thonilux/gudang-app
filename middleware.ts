import { NextResponse, type NextRequest } from "next/server";

import { AUTH_SESSION_COOKIE } from "@/lib/auth-constants";

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const hasCookie = Boolean(request.cookies.get(AUTH_SESSION_COOKIE)?.value);
  if (hasCookie) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
