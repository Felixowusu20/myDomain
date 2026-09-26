"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/sms", label: "Overview" },
  { href: "/sms/keys", label: "API keys" },
  { href: "/sms/messages", label: "Messages" },
  { href: "/sms/senders", label: "Sender IDs" },
  { href: "/sms/docs", label: "Docs" },
];

export function DeveloperNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2">
      {links.map((link) => {
        const active = link.href === "/sms" ? pathname === "/sms" : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link key={link.href} href={link.href} className={`btn ${active ? "btn-primary" : "btn-ghost"}`}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
