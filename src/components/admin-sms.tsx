"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BusyLabel } from "@/components/spinner";
import { API_KEY_SCOPES } from "@/lib/security/api-scopes";

export function SmsProjectForm({
  customers,
}: {
  customers: { id: string; name: string; email: string }[];
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/sms/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, name }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not create the project.");
        return;
      }
      setName("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3 p-5">
      <h2 className="font-bold text-[var(--navy)]">New project</h2>
      <label className="field">
        <span>Customer</span>
        <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} required>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} · {customer.email}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Project name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} />
      </label>
      {error ? <p className="text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
      <button className="btn btn-primary" disabled={busy || !customers.length} type="submit">
        <BusyLabel busy={busy} busyText="Creating...">
          Create project
        </BusyLabel>
      </button>
    </form>
  );
}

export function SmsKeyForm({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([...API_KEY_SCOPES]);
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (projects.some((project) => project.id === projectId)) return;
    setProjectId(projects[0]?.id ?? "");
  }, [projects, projectId]);

  function toggle(scope: string) {
    setScopes((current) => (current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSecret("");
    const chosenProject = projectId || projects[0]?.id || "";
    if (!chosenProject) {
      setError("Choose a project before creating a key.");
      setBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/admin/sms/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: chosenProject, name: name.trim(), scopes }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not create the key.");
        return;
      }
      setSecret(data.key.secret);
      setName("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3 p-5">
      <h2 className="font-bold text-[var(--navy)]">Create API key</h2>
      <p className="text-sm text-[var(--muted)]">The secret is shown once. Store it before leaving this page.</p>
      <label className="field">
        <span>Project</span>
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)} required>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Key name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={80} />
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-[var(--muted)]">Scopes</legend>
        {API_KEY_SCOPES.map((scope) => (
          <label key={scope} className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={scopes.includes(scope)} onChange={() => toggle(scope)} />
            {scope}
          </label>
        ))}
      </fieldset>
      {error ? <p className="text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
      {secret ? (
        <p className="break-all rounded-xl border border-[var(--line)] bg-[var(--field-bg)] p-3 font-mono text-sm">
          {secret}
        </p>
      ) : null}
      <button className="btn btn-primary" disabled={busy || !projects.length || !scopes.length} type="submit">
        <BusyLabel busy={busy} busyText="Creating...">
          Create key
        </BusyLabel>
      </button>
    </form>
  );
}

export function SmsKeyActions({ id }: { id: string }) {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action: "revoke" | "rotate") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/sms/api-keys/${id}?action=${action}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not update the key.");
        return;
      }
      if (action === "rotate") setSecret(data.key?.secret ?? "");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => void run("rotate")}>
          Rotate
        </button>
        <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => void run("revoke")}>
          Revoke
        </button>
      </div>
      {secret ? <p className="break-all font-mono text-xs">{secret}</p> : null}
      {error ? <p className="text-xs font-semibold text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}

export function SmsSenderForm({ projects }: { projects: { id: string; name: string }[] }) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/sms/sender-ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, value }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not save the sender ID.");
        return;
      }
      setValue("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3 p-5">
      <h2 className="font-bold text-[var(--navy)]">Add sender ID</h2>
      <p className="text-sm text-[var(--muted)]">
        This stores the label MyDomain will send. It does not register the sender with a mobile network.
      </p>
      <label className="field">
        <span>Project</span>
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)} required>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Sender ID</span>
        <input value={value} onChange={(event) => setValue(event.target.value)} required maxLength={11} placeholder="MyDomain" />
      </label>
      {error ? <p className="text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
      <button className="btn btn-primary" disabled={busy || !projects.length} type="submit">
        <BusyLabel busy={busy} busyText="Saving...">
          Save sender
        </BusyLabel>
      </button>
    </form>
  );
}

export function SmsSenderDisable({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function disable() {
    setBusy(true);
    try {
      await fetch(`/api/admin/sms/sender-ids?id=${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => void disable()}>
      Disable
    </button>
  );
}
