"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RunJobsButton() {
  const router = useRouter();
  const [done, setDone] = useState(false);
  return (
    <button
      className="btn btn-dark"
      onClick={async () => {
        await fetch("/api/admin/health", { method: "POST" });
        setDone(true);
        router.refresh();
      }}
    >
      {done ? "Jobs ran" : "Run jobs now"}
    </button>
  );
}
