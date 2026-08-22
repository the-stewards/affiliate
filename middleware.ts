import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rateLimit";

// Gates /admin behind HTTP Basic Auth. Simple on purpose - this is a
// one-or-two-person internal tool, not a multi-user system, so a shared
// username/password is enough without building out real auth.
export async function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;

  if (!user || !pass) {
    return new NextResponse("Admin access not configured.", { status: 503 });
  }

  const expected = "Basic " + btoa(`${user}:${pass}`);
  if (req.headers.get("authorization") === expected) {
    return NextResponse.next();
  }

  // Only failed attempts count toward the limit, so normal use (the browser
  // resending valid cached credentials on every request) never gets
  // throttled - only actual password guessing does.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await isRateLimited(`admin-auth:${ip}`, 10, 15 * 60 * 1000)) {
    return new NextResponse("Too many failed attempts. Try again later.", { status: 429 });
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Rebel Admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
