import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;

  if (!session) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|_next/static|_next/image|favicon.ico|logo-bch.png).*)",
  ],
};
