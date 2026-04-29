import { SignJWT, jwtVerify } from "jose";

export type JwtPayload = {
  sub: string;
  email: string;
  role: "admin" | "agent";
  name: string;
};

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("JWT_SECRET must be set (min 16 chars) for authentication.");
  }
  return new TextEncoder().encode(s);
}

export async function signJwt(payload: JwtPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    const email = typeof payload.email === "string" ? payload.email : "";
    const role =
      payload.role === "admin" || payload.role === "agent"
        ? payload.role
        : null;
    const name = typeof payload.name === "string" ? payload.name : "";
    if (!sub || !email || !role) return null;
    return { sub, email, role, name };
  } catch {
    return null;
  }
}
