"use client";

import { useRouter } from "next/navigation";

export function ServerStatusForm({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  async function setStatus(next: string) {
    await fetch(`/api/admin/servers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    router.refresh();
  }
  return (
    <div className="flex flex-wrap gap-2">
      {["RUNNING", "WARNING", "OFFLINE", "MAINTENANCE"].map((item) => (
        <button
          key={item}
          className={`btn ${item === status ? "btn-primary" : "btn-ghost"}`}
          onClick={() => setStatus(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
