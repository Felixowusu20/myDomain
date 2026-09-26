"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreditCard } from "lucide-react";
import { BusyLabel } from "@/components/spinner";

export function CheckoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await response.json();
    if (!response.ok) {
      setLoading(false);
      setError(data.error ?? "We couldn't complete your payment. Please try again.");
      return;
    }
    const domain = data.registeredDomains?.[0];
    router.push(
      domain
        ? `/checkout/success?domain=${encodeURIComponent(domain.name)}&id=${domain.id}`
        : "/orders",
    );
    router.refresh();
  }

  return (
    <div>
      <button className="btn btn-hot w-full" onClick={pay} disabled={loading}>
        <BusyLabel busy={loading} busyText="Processing payment">
          <CreditCard className="h-4 w-4" />
          Continue to payment
        </BusyLabel>
      </button>
      {error ? <p className="mt-3 text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
