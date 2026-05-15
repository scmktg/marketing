import Link from "next/link";
import { requireUser } from "@/lib/auth/require";
import { logout } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";

// All admin pages live under this layout. Auth-gated at the top.
// Marketing team and managers share the layout; manager-only screens
// gate themselves with requireManager() (see lib/auth/require.ts).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-beachie-sand bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link href={"/dashboard" as never} className="text-lg font-semibold text-beachie-deep">
              The Beachie Midweek Engine
            </Link>
            <nav className="hidden gap-6 text-sm text-beachie-deep/80 md:flex">
              <Link href={"/dashboard" as never} className="hover:text-beachie-deep">Dashboard</Link>
              <Link href={"/proposals" as never} className="hover:text-beachie-deep">Proposals</Link>
              <Link href={"/partners" as never} className="hover:text-beachie-deep">Partners</Link>
              <Link href={"/knowledge" as never} className="hover:text-beachie-deep">Knowledge</Link>
              <Link href={"/learnings" as never} className="hover:text-beachie-deep">Learnings</Link>
              {user.role === "manager" ? (
                <>
                  <Link href={"/audit" as never} className="hover:text-beachie-deep">Audit</Link>
                  <Link href={"/settings" as never} className="hover:text-beachie-deep">Settings</Link>
                </>
              ) : null}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-beachie-deep/70">
              {user.email}{" "}
              <span className="ml-1 rounded bg-beachie-sand px-1.5 py-0.5 text-xs">
                {user.role}
              </span>
            </span>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
