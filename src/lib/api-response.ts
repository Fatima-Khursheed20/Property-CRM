import { NextResponse } from "next/server";
import type { JwtPayload } from "@/lib/jwt";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function requireAuth(user: JwtPayload | null): JwtPayload | NextResponse {
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

export function requireAdmin(user: JwtPayload | null): JwtPayload | NextResponse {
  const u = requireAuth(user);
  if (u instanceof NextResponse) return u;
  if (u.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return u;
}
