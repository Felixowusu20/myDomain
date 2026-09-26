"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { BusyLabel } from "@/components/spinner";

export function AddHostingButton({ slug, hostingId }: { slug: string; hostingId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  async function add() {
    setLoading(true);
    const response = await fetch("/api/hosting/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planSlug: slug, hostingId }),
    });
    setLoading(false);
    if (response.status === 401) {
      router.push("/login?next=/hosting");
      return;
    }
    if (response.ok) {
      setAdded(true);
      router.refresh();
    }
  }

  if (added) {
    return (
      <button className="btn btn-ghost w-full" onClick={() => router.push("/cart")} type="button">
        <Check className="h-4 w-4 text-[var(--success)]" />
        Added, view cart
      </button>
    );
  }

  return (
    <button className="btn btn-hot w-full" onClick={add} disabled={loading}>
      <BusyLabel busy={loading} busyText="Adding">
        <ShoppingCart className="h-4 w-4" />
        Add to cart
      </BusyLabel>
    </button>
  );
}
