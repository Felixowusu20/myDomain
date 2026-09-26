import Link from "next/link";
import { ThemeBrand } from "@/components/theme-brand";

export function MarketingFooter() {
  return (
    <footer className="nm-footer">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-4">
        <div>
          <ThemeBrand />
          <p className="nm-text-muted mt-4 max-w-xs text-sm leading-6">
            Buy a domain here, then connect it to any host.
          </p>
        </div>
        <div>
          <p className="nm-text-faint text-xs font-bold uppercase tracking-[0.16em]">Product</p>
          <div className="nm-text-muted mt-4 grid gap-2.5 text-sm">
            <Link className="nm-link" href="/search">
              Find a domain
            </Link>
            <Link className="nm-link" href="/#partners">
              Products
            </Link>
            <Link className="nm-link" href="/#connect">
              Connect hosting
            </Link>
            <Link className="nm-link" href="/docs">
              SMS &amp; OTP
            </Link>
            <Link className="nm-link" href="/register">
              Create account
            </Link>
          </div>
        </div>
        <div>
          <p className="nm-text-faint text-xs font-bold uppercase tracking-[0.16em]">Account</p>
          <div className="nm-text-muted mt-4 grid gap-2.5 text-sm">
            <Link className="nm-link" href="/login">
              Customer login
            </Link>
            <Link className="nm-link" href="/admin/login">
              Admin login
            </Link>
            <Link className="nm-link" href="/support">
              Support
            </Link>
            <Link className="nm-link" href="/cart">
              Cart
            </Link>
          </div>
        </div>
        <div>
          <p className="nm-text-faint text-xs font-bold uppercase tracking-[0.16em]">Registrar</p>
          <p className="nm-text-muted mt-4 text-sm leading-6">
            Registrations run through name.com. Homepage images and partner cards are managed in Admin → CMS.
          </p>
        </div>
      </div>
      <div className="nm-text-faint border-t py-5 text-center text-xs" style={{ borderColor: "var(--nm-border)" }}>
        © {new Date().getFullYear()} myDomain. All rights reserved.
      </div>
    </footer>
  );
}
