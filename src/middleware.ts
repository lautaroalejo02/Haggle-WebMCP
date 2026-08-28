import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/server/session";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const contentType = request.headers.get("content-type") ?? "";
    if (!isSameOrigin(request, origin)) {
      return NextResponse.json(
        {
          ok: false,
          summary: "Cross-site marketplace mutations are not allowed.",
          error: { code: "ORIGIN_MISMATCH", message: "Refresh Haggle and try again.", retryable: false },
          possibleNextActions: [],
        },
        { status: 403 },
      );
    }
    if (!contentType.toLowerCase().startsWith("application/json")) {
      return NextResponse.json(
        {
          ok: false,
          summary: "Marketplace mutations require JSON requests.",
          error: { code: "CONTENT_TYPE_REQUIRED", message: "Send this request as JSON.", retryable: false },
          possibleNextActions: [],
        },
        { status: 415 },
      );
    }
  }

  const currentSession = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (currentSession && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(currentSession)) {
    return NextResponse.next();
  }

  const sessionId = crypto.randomUUID();
  request.cookies.set(SESSION_COOKIE_NAME, sessionId);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

function isSameOrigin(request: NextRequest, origin: string | null) {
  if (!origin) return false;
  if (origin === request.nextUrl.origin) return true;
  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = request.headers.get("host");
    const allowedHosts = new Set([forwardedHost, requestHost].filter((value): value is string => Boolean(value)));
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const expectedProtocol = forwardedProtocol ? `${forwardedProtocol}:` : request.nextUrl.protocol;
    return allowedHosts.has(originUrl.host) && originUrl.protocol === expectedProtocol;
  } catch {
    return false;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
