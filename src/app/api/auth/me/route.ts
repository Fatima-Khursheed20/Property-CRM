import { getSession } from "@/lib/session";
import { jsonOk } from "@/lib/api-response";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ user: null }, { status: 200 });
  }
  return jsonOk({
    user: {
      id: session.sub,
      email: session.email,
      name: session.name,
      role: session.role,
    },
  });
}
