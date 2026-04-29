import Link from "next/link";
import { redirect } from "next/navigation";
import { RealtimeBridge } from "@/components/RealtimeBridge";
import { LogoutButton } from "@/components/LogoutButton";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    redirect("/agent/dashboard");
  }

  return (
    <RealtimeBridge>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
            <div className="flex items-center gap-8">
              <span className="text-lg font-semibold text-emerald-400">
                Property CRM
              </span>
              <nav className="flex flex-wrap gap-4 text-sm">
                <Link
                  href="/admin/dashboard"
                  className="text-slate-300 hover:text-white"
                >
                  Dashboard
                </Link>
                <Link
                  href="/admin/leads"
                  className="text-slate-300 hover:text-white"
                >
                  Leads
                </Link>
                <Link
                  href="/admin/analytics"
                  className="text-slate-300 hover:text-white"
                >
                  Analytics
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
                Admin
              </span>
              <LogoutButton />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </div>
    </RealtimeBridge>
  );
}
