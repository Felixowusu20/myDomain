"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, ShoppingCart, X } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";

const links = [
  { href: "/search", label: "Domains" },
  { href: "/#sms", label: "SMS & OTP" },
  { href: "/#partners", label: "Products" },
  { href: "/#connect", label: "Connect" },
];

export function MarketingHeader({ cartCount = 0 }: { cartCount?: number }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { theme } = useTheme();
  const brandLight = theme === "dark";

  function isActive(href: string) {
    if (href.startsWith("/#")) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="nm-header">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/" aria-label="myDomain home">
          <Brand light={brandLight} />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              className={`nm-link ${isActive(link.href) ? "is-active" : ""}`}
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <ThemeToggle compact />
          <Link href="/domains" className="nm-link text-sm font-semibold">
            My Domains
          </Link>
          <Link
            href="/cart"
            className="relative grid h-10 w-10 place-items-center rounded-full border text-[var(--nm-fg)]"
            style={{ borderColor: "var(--nm-border)" }}
          >
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 ? <span className="nm-cart-badge">{cartCount}</span> : null}
          </Link>
          <Link href="/login" className="nm-link text-sm font-semibold">
            Sign in
          </Link>
          <Link href="/register" className="btn btn-lime px-4 py-2">
            Get started
          </Link>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle compact />
          <button
            className="grid h-10 w-10 place-items-center rounded-xl border text-[var(--nm-fg)]"
            style={{ borderColor: "var(--nm-border)" }}
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            type="button"
            data-no-loader
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="space-y-1 border-t px-5 py-4 text-sm font-semibold md:hidden" style={{ borderColor: "var(--nm-border)" }}>
          {links.map((link) => (
            <Link
              className={`nm-link block rounded-lg px-2 py-2 ${isActive(link.href) ? "is-active" : ""}`}
              href={link.href}
              key={link.href}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link className="nm-link block rounded-lg px-2 py-2" href="/login">
            Sign in
          </Link>
          <Link className="btn btn-lime mt-2 w-full" href="/register">
            Get started
          </Link>
        </div>
      ) : null}
    </header>
  );
}
