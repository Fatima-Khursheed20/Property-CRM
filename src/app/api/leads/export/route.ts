import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { connectDB } from "@/lib/mongodb";
import Lead from "@/models/Lead";
import { getSession } from "@/lib/session";
import { requireAdmin } from "@/lib/api-response";

export async function GET() {
  const session = await getSession();
  const auth = requireAdmin(session);
  if (auth instanceof NextResponse) return auth;

  await connectDB();

  const rows = await Lead.find({})
    .populate("assignedTo", "name email")
    .sort({ createdAt: -1 })
    .lean();

  const sheetRows = rows.map((r) => ({
    Name: r.name,
    Email: r.email,
    Phone: r.phone,
    Interest: r.propertyInterest,
    BudgetPKR: r.budget,
    Status: r.status,
    Priority: r.priority,
    Score: r.score,
    Agent: (r.assignedTo as { name?: string } | null)?.name ?? "",
    Source: r.source,
    Created: r.createdAt
      ? new Date(r.createdAt).toISOString()
      : "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheetRows);
  XLSX.utils.book_append_sheet(wb, ws, "Leads");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="leads-export.xlsx"',
    },
  });
}
