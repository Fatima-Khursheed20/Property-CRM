import { NextResponse } from "next/server";
import { authCookieName } from "@/lib/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(authCookieName, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
