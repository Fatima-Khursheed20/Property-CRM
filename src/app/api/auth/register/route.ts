import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword } from "@/lib/password";
import { signJwt } from "@/lib/jwt";
import { registerSchema } from "@/lib/validators/auth";
import { authCookieName } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rl = rateLimit({
    key: `register:${ip}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  await connectDB();

  const exists = await User.findOne({ email: parsed.data.email });
  if (exists) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await User.create({
    email: parsed.data.email,
    name: parsed.data.name,
    passwordHash,
    role: "agent",
  });

  const token = await signJwt({
    sub: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role as "admin" | "agent",
  });

  const res = NextResponse.json({
    ok: true,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
  res.cookies.set(authCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
