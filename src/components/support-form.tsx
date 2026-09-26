"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BusyLabel } from "@/components/spinner";

export function SupportForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message }),
    });
    setLoading(false);
    setSubject("");
    setMessage("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <label className="field">
        <span>Subject</span>
        <input value={subject} onChange={(event) => setSubject(event.target.value)} required />
      </label>
      <label className="field">
        <span>Message</span>
        <textarea rows={4} value={message} onChange={(event) => setMessage(event.target.value)} required />
      </label>
      <button className="btn btn-primary" disabled={loading}>
        <BusyLabel busy={loading}>Send</BusyLabel>
      </button>
    </form>
  );
}
