import { cookies } from "next/headers";
import { verifyJwt, type JwtPayload } from "@/lib/jwt";

const COOKIE = "crm_token";

export async function getSession(): Promise<JwtPayload | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifyJwt(token);
}

export const authCookieName = COOKIE;
