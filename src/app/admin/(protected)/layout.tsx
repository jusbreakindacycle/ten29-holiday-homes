import { redirect } from "next/navigation";
import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { getAdminUser } from "@/lib/supabase/get-admin-user";
import { SignOutButton } from "@/components/features/admin/SignOutButton";

const ADMIN_NAV = [
  { label: "Dashboard", href: "/admin" },
  { label: "Inquiries", href: "/admin/inquiries" },
  { label: "Owner Preview", href: "/admin/owner-preview" },
  { label: "Claim Registry", href: "/admin/claims" },
];

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  // Primary enforcement is src/proxy.ts (NextResponse.redirect at the proxy
  // layer, matcher: /admin/:path*). This is a defense-in-depth second check —
  // see the comment in proxy.ts for why the primary check isn't done here.
  const user = await getAdminUser();
  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-sand">
      <header className="border-b border-border bg-forest text-ivory">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Wordmark dark />
          <nav aria-label="Admin" className="flex flex-wrap gap-5 text-sm font-medium">
            {ADMIN_NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-ivory/85 hover:text-ivory">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4 text-sm text-ivory/70">
            <span>{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
