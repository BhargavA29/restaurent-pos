import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Every page except /login needs a valid session cookie.
// Pages and actions still call requireOwner(), so this is a fast first gate, not the only one.
export async function proxy(request: NextRequest) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/bill/") ||
    pathname.startsWith("/b/") ||
    pathname === "/icon" ||
    pathname === "/apple-icon"
  ) {
    return NextResponse.next();
  }
  if (pathname === "/login") {
    return session
      ? NextResponse.redirect(new URL("/live", request.url))
      : NextResponse.next();
  }
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
