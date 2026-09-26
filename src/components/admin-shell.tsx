"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  CreditCard,
  BookOpen,
  FileText,
  Globe,
  Hash,
  Image as ImageIcon,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  Plug,
  Receipt,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tags,
  Users,
  KeyRound,
  X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

function linkActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/sms") {
    return pathname === "/admin/sms" || pathname.startsWith("/admin/sms/messages");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

const groups = [
  {
    label: "Overview",
    links: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Customers",
    links: [
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
      { href: "/admin/invoices", label: "Invoices", icon: Receipt },
    ],
  },
  {
    label: "Products",
    links: [
      { href: "/admin/domains", label: "Domains", icon: Globe },
      { href: "/admin/hosting", label: "Hosting", icon: Server },
      { href: "/admin/pricing", label: "Pricing", icon: Tags },
      { href: "/admin/renewals", label: "Renewals", icon: RefreshCw },
      { href: "/admin/cms", label: "Homepage CMS", icon: ImageIcon },
      { href: "/admin/docs", label: "SMS & OTP docs", icon: BookOpen },
    ],
  },
  {
    label: "Operations",
    links: [
      { href: "/admin/servers", label: "Servers", icon: Activity },
      { href: "/admin/providers", label: "Providers", icon: Plug },
      { href: "/admin/support", label: "Support", icon: LifeBuoy },
      { href: "/admin/sms", label: "SMS", icon: MessageSquare },
      { href: "/admin/sms/otp", label: "OTP", icon: ShieldCheck },
      { href: "/admin/sms/api-keys", label: "API keys", icon: KeyRound },
      { href: "/admin/sms/sender-ids", label: "Sender IDs", icon: Hash },
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/audit-logs", label: "Audit logs", icon: FileText },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const brandLight = true;

  if (pathname === "/admin/login") return <>{children}</>;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const title =
    groups.flatMap((group) => group.links).find((link) => linkActive(pathname, link.href))?.label ?? "Admin";

  const nav = (
    <nav className="flex-1 space-y-5 overflow-auto px-3 pb-4">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">{group.label}</p>
          <div className="space-y-1">
            {group.links.map((link) => {
              const active = linkActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`admin-nav-item ${active ? "active" : ""}`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col bg-[var(--sidebar)] text-white lg:flex">
        <div className="px-5 py-5">
          <Link href="/admin">
            <Brand light={brandLight} />
          </Link>
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">Admin console</p>
        </div>
        {nav}
        <div className="border-t border-white/10 px-5 py-4">
          <button onClick={logout} className="flex items-center gap-2 text-sm font-semibold text-white/70">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-label="Close menu" data-no-loader type="button" />
          <div className="relative flex h-full w-72 flex-col bg-[var(--sidebar)] text-white">
            <div className="flex items-center justify-between px-5 py-4">
              <Brand light={brandLight} />
              <button className="grid h-9 w-9 place-items-center rounded-xl border border-white/15" onClick={() => setOpen(false)} data-no-loader type="button">
                <X className="h-4 w-4" />
              </button>
            </div>
            {nav}
          </div>
        </div>
      ) : null}

      <div className="lg:pl-[260px]">
        <header className="app-topbar">
          <div className="flex items-center gap-3">
            <button
              className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line)] bg-[var(--card)] lg:hidden"
              onClick={() => setOpen(true)}
              type="button"
              aria-label="Open menu"
              data-no-loader
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Admin</p>
              <p className="font-extrabold text-[var(--navy)]">{title}</p>
            </div>
          </div>
          <ThemeToggle className="app-theme-toggle" compact />
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
