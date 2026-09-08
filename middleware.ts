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

  let expected: string;
  try {
    expected = "Basic " + btoa(`${user}:${pass}`);
  } catch {
    // btoa() throws if ADMIN_USER/ADMIN_PASSWORD contain any non-Latin1
    // character (a curly quote, an em dash, an emoji - anything pasted in
    // rather than typed). Left unguarded, this crashes the edge function on
    // every single request, taking /admin down for everyone including
    // whoever has the right credentials - same fallback as the "env var
    // missing entirely" case above, since both mean auth can't be evaluated.
    return new NextResponse("Admin access not configured.", { status: 503 });
  }
  if (req.headers.get("authorization") === expected) {
    return NextResponse.next();
  }

  // Only failed attempts count toward the limit, so normal use (the browser
  // resending valid cached credentials on every request) never gets
  // throttled - only actual password guessing does.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  try {
    if (await isRateLimited(`admin-auth:${ip}`, 10, 15 * 60 * 1000)) {
      return new NextResponse("Too many failed attempts. Try again later.", { status: 429 });
    }
  } catch (err) {
    // isRateLimited hits Postgres - a missing DATABASE_URL in this runtime's
    // env scope, or a Neon connectivity hiccup, throws here. Fail open on
    // the rate-limit check only (not on auth itself, which is checked
    // above and unaffected) so a rate-limit-store outage can't crash the
    // whole login prompt for everyone.
    console.error("admin rate-limit check failed, failing open:", err);
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Rebel Admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
