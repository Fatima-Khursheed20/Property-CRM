import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { getSession } from "@/lib/session";
import { jsonOk, requireAdmin } from "@/lib/api-response";

export async function GET() {
  const session = await getSession();
  const auth = requireAdmin(session);
  if (auth instanceof NextResponse) return auth;

  await connectDB();
  const agents = await User.find({ role: "agent" })
    .select("name email _id")
    .sort({ name: 1 })
    .lean();

  return jsonOk({ agents });
}
