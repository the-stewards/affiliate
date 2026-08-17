import { NextRequest, NextResponse } from "next/server";

// Gates /admin behind HTTP Basic Auth. Simple on purpose - this is a
// one-or-two-person internal tool, not a multi-user system, so a shared
// username/password is enough without building out real auth.
export function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;

  if (!user || !pass) {
    return new NextResponse("Admin access not configured.", { status: 503 });
  }

  const expected = "Basic " + btoa(`${user}:${pass}`);
  if (req.headers.get("authorization") !== expected) {
    return new NextResponse("Authentication required.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Rebel Admin"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
