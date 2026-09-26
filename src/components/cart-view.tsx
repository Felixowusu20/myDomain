"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreditCard, Globe, Server, Trash2 } from "lucide-react";
import { formatUsd } from "@/lib/utils";
import { CheckoutButton } from "@/components/checkout-button";
import { Spinner } from "@/components/spinner";

type Item = {
  id: string;
  type: string;
  description: string;
  amountCents: number;
};

export function CartView({ items, total }: { items: Item[]; total: number }) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);

  async function remove(id: string) {
    setRemoving(id);
    await fetch(`/api/cart/${id}`, { method: "DELETE" });
    setRemoving(null);
    router.refresh();
  }

  return (
    <div className="card overflow-hidden">
      <div className="divide-y divide-[var(--line)]">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="stat-icon">
                {item.type === "HOSTING" ? <Server className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
              </span>
              <div>
                <p className="font-bold">{item.description}</p>
                <p className="text-sm text-[var(--muted)]">{item.type === "HOSTING" ? "Hosting plan" : "Domain · 1 year"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-extrabold">{formatUsd(item.amountCents)}</p>
              <button
                className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] text-[var(--muted)] hover:text-[var(--danger)]"
                onClick={() => remove(item.id)}
                disabled={removing === item.id}
                type="button"
                aria-label="Remove from cart"
              >
                {removing === item.id ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--line)] bg-[#f8fbff] px-5 py-5">
        <div className="flex items-center justify-between text-lg font-extrabold">
          <span>Total</span>
          <span>{formatUsd(total)}</span>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">Mock checkout, no real card is charged.</p>
        <div className="mt-4">
          <CheckoutButton />
        </div>
      </div>
    </div>
  );
}

export function CartIconLabel() {
  return (
    <span className="inline-flex items-center gap-2">
      <CreditCard className="h-4 w-4" />
      Pay now
    </span>
  );
}
