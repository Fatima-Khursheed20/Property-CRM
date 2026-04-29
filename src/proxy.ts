/**
 * Edge auth / RBAC for `/admin/*` and `/agent/*`.
 *
 * Next.js 16 names this boundary **proxy** (see docs); it replaces the older
 * `middleware.ts` convention — same responsibilities as Express-style middleware.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("crm_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    const raw = payload.role;
    const role = typeof raw === "string" ? raw : "";

    if (pathname.startsWith("/admin")) {
      if (role !== "admin") {
        return NextResponse.redirect(new URL("/agent/dashboard", request.url));
      }
    }

    if (pathname.startsWith("/agent")) {
      if (role !== "agent" && role !== "admin") {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/admin/:path*", "/agent/:path*"],
};
