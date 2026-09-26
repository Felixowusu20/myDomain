"use client";

import { useRouter } from "next/navigation";

export function HostingAdminActions({ id }: { id: string }) {
  const router = useRouter();
  async function setStatus(status: "RUNNING" | "SUSPENDED" | "TERMINATED") {
    await fetch("/api/admin/hosting/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    router.refresh();
  }
  return (
    <div className="flex gap-2 text-xs font-semibold">
      <button onClick={() => setStatus("SUSPENDED")}>Suspend</button>
      <button onClick={() => setStatus("RUNNING")}>Unsuspend</button>
      <button onClick={() => setStatus("TERMINATED")}>Terminate</button>
    </div>
  );
}
