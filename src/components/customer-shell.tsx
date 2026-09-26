"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CreditCard,
  Github,
  Globe,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  MessageSquare,
  Network,
  Search,
  Server,
  Settings,
  ShoppingBag,
  ShoppingCart,
  X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/search", label: "Find a domain", icon: Search },
  { href: "/domains", label: "Domains", icon: Globe },
  { href: "/dns", label: "DNS", icon: Network },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/sites", label: "Sites · Soon", icon: Github },
  { href: "/hosting", label: "Hosting · Soon", icon: Server },
  { href: "/sms", label: "SMS & OTP", icon: MessageSquare },
  { href: "/support", label: "Support", icon: LifeBuoy },
  { href: "/account", label: "Account", icon: Settings },
];

export function CustomerShell({
  name,
  email,
  cartCount,
  children,
}: {
  name: string;
  email?: string;
  cartCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const surface = "bg-[var(--card)]";
  const border = "border-[var(--line)]";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {links.map((link) => {
        const active =
          link.href === "/search"
            ? pathname === "/search"
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className={`nav-item ${active ? "active" : ""}`}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <aside className={`fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r ${border} ${surface} lg:flex`}>
        <div className="px-5 py-5">
          <Link href="/dashboard">
            <Brand />
          </Link>
        </div>
        {nav}
        <div className={`border-t ${border} px-5 py-4`}>
          <p className="truncate text-sm font-bold">{name}</p>
          {email ? <p className="truncate text-xs text-[var(--muted)]">{email}</p> : null}
          <button onClick={logout} className="mt-3 flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-label="Close menu" data-no-loader type="button" />
          <div className={`relative flex h-full w-72 flex-col ${surface}`}>
            <div className="flex items-center justify-between px-5 py-4">
              <Brand />
              <button className={`grid h-9 w-9 place-items-center rounded-xl border ${border}`} onClick={() => setOpen(false)} data-no-loader type="button">
                <X className="h-4 w-4" />
              </button>
            </div>
            {nav}
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="app-topbar">
          <div className="flex items-center gap-3">
            <button
              className={`grid h-10 w-10 place-items-center rounded-xl border ${border} ${surface} lg:hidden`}
              onClick={() => setOpen(true)}
              type="button"
              aria-label="Open menu"
              data-no-loader
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/search" className={`hidden items-center gap-2 rounded-xl border ${border} ${surface} px-3 py-2 text-sm text-[var(--muted)] sm:flex`}>
              <Search className="h-4 w-4" />
              Search a domain
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle className="app-theme-toggle" compact />
            <Link href="/cart" className={`relative grid h-10 w-10 place-items-center rounded-xl border ${border} ${surface}`} aria-label="Cart">
              <ShoppingCart className="h-5 w-5 text-[var(--navy)]" />
              {cartCount > 0 ? <span className="cart-badge">{cartCount}</span> : null}
            </Link>
            <Link href="/cart" className="btn btn-hot hidden sm:inline-flex">
              <ShoppingCart className="h-4 w-4" />
              Cart{cartCount ? ` (${cartCount})` : ""}
            </Link>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
