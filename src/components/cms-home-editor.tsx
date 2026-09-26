"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { BusyLabel } from "@/components/spinner";

type HomeStat = { value: string; label: string };

type Home = {
  id: string;
  eyebrow: string;
  headline: string;
  headlineAccent: string;
  subcopy: string;
  searchPlaceholder: string;
  heroImageUrl: string;
  heroImagePublicId: string;
  heroCaption: string;
  heroCaptionHref: string;
  partnersTitle: string;
  partnersSubcopy: string;
};

type Partner = {
  id: string;
  tag: string;
  title: string;
  description: string;
  imageUrl: string;
  imagePublicId: string;
  href: string;
  comingSoon: boolean;
  active: boolean;
  sortOrder: number;
};

async function uploadImage(file: File, kind: "hero" | "partner") {
  const form = new FormData();
  form.set("file", file);
  form.set("kind", kind);
  const response = await fetch("/api/admin/cms/upload", { method: "POST", body: form });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Upload failed");
  return data as { url: string; publicId: string };
}

export function CmsHomeEditor({
  home: initialHome,
  stats: initialStats,
  partners: initialPartners,
}: {
  home: Home;
  stats: HomeStat[];
  partners: Partner[];
}) {
  const router = useRouter();
  const [home, setHome] = useState(initialHome);
  const [stats, setStats] = useState(initialStats);
  const [partners, setPartners] = useState(initialPartners);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState({
    tag: "Coming soon",
    title: "",
    description: "",
    imageUrl: "",
    imagePublicId: "",
  });

  async function saveHome() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/admin/cms/home", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...home, stats }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(data.error ?? "Could not save homepage.");
      return;
    }
    setMessage("Homepage saved.");
    router.refresh();
  }

  async function savePartner(card: Partner) {
    setMessage("");
    const response = await fetch("/api/admin/cms/partners", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Could not save partner card.");
      return;
    }
    setPartners((current) => current.map((item) => (item.id === card.id ? data.card : item)));
    setMessage(`Saved ${card.title}.`);
    router.refresh();
  }

  async function addPartner() {
    if (!draft.title || !draft.description || !draft.imageUrl) {
      setMessage("Title, description, and image are required.");
      return;
    }
    const response = await fetch("/api/admin/cms/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, comingSoon: true, active: true, sortOrder: partners.length + 1 }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Could not add partner.");
      return;
    }
    setPartners((current) => [...current, data.card]);
    setDraft({ tag: "Coming soon", title: "", description: "", imageUrl: "", imagePublicId: "" });
    setMessage("Partner card added.");
    router.refresh();
  }

  async function removePartner(id: string) {
    const response = await fetch(`/api/admin/cms/partners?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Could not delete partner.");
      return;
    }
    setPartners((current) => current.filter((item) => item.id !== id));
    setMessage("Partner removed.");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {message ? <p className="text-sm font-semibold text-[var(--success)]">{message}</p> : null}

      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-extrabold text-[var(--navy)]">Hero</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {(
            [
              ["eyebrow", "Eyebrow"],
              ["headline", "Headline"],
              ["headlineAccent", "Accent mark"],
              ["searchPlaceholder", "Search placeholder"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="field">
              <span>{label}</span>
              <input
                value={home[key]}
                onChange={(event) => setHome({ ...home, [key]: event.target.value })}
              />
            </label>
          ))}
        </div>
        <label className="field">
          <span>Subcopy</span>
          <textarea rows={3} value={home.subcopy} onChange={(event) => setHome({ ...home, subcopy: event.target.value })} />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="field">
            <span>Partners section title</span>
            <input
              value={home.partnersTitle}
              onChange={(event) => setHome({ ...home, partnersTitle: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Hero caption (optional)</span>
            <input
              value={home.heroCaption}
              onChange={(event) => setHome({ ...home, heroCaption: event.target.value })}
            />
          </label>
        </div>
        <label className="field">
          <span>Partners subcopy (optional)</span>
          <textarea
            rows={2}
            value={home.partnersSubcopy}
            onChange={(event) => setHome({ ...home, partnersSubcopy: event.target.value })}
          />
        </label>
        <div className="grid gap-4 md:grid-cols-[180px_1fr]">
          <div className="relative h-36 overflow-hidden rounded-2xl bg-[#111]">
            {home.heroImageUrl ? (
              <Image src={home.heroImageUrl} alt="" fill className="object-cover" sizes="180px" />
            ) : null}
          </div>
          <div className="space-y-3">
            <label className="field">
              <span>Hero image URL</span>
              <input
                value={home.heroImageUrl}
                onChange={(event) => setHome({ ...home, heroImageUrl: event.target.value })}
              />
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  const uploaded = await uploadImage(file, "hero");
                  setHome((current) => ({
                    ...current,
                    heroImageUrl: uploaded.url,
                    heroImagePublicId: uploaded.publicId,
                  }));
                  setMessage("Hero image uploaded.");
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : "Upload failed");
                }
              }}
            />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold">Stats</p>
          {stats.map((stat, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-2">
              <input
                className="rounded-xl border border-[var(--line)] px-3 py-2"
                value={stat.value}
                onChange={(event) =>
                  setStats((current) =>
                    current.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)),
                  )
                }
              />
              <input
                className="rounded-xl border border-[var(--line)] px-3 py-2"
                value={stat.label}
                onChange={(event) =>
                  setStats((current) =>
                    current.map((item, i) => (i === index ? { ...item, label: event.target.value } : item)),
                  )
                }
              />
            </div>
          ))}
        </div>
        <button className="btn btn-hot" type="button" disabled={saving} onClick={() => void saveHome()}>
          <BusyLabel busy={saving}>Save homepage</BusyLabel>
        </button>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-extrabold text-[var(--navy)]">Partner cards</h2>
        {partners.map((card) => (
          <div key={card.id} className="card grid gap-4 p-5 md:grid-cols-[140px_1fr]">
            <div className="relative h-36 overflow-hidden rounded-2xl bg-[#111]">
              <Image src={card.imageUrl} alt="" fill className="object-cover" sizes="140px" />
            </div>
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="rounded-xl border border-[var(--line)] px-3 py-2"
                  value={card.tag}
                  onChange={(event) =>
                    setPartners((current) =>
                      current.map((item) => (item.id === card.id ? { ...item, tag: event.target.value } : item)),
                    )
                  }
                />
                <input
                  className="rounded-xl border border-[var(--line)] px-3 py-2"
                  value={card.title}
                  onChange={(event) =>
                    setPartners((current) =>
                      current.map((item) => (item.id === card.id ? { ...item, title: event.target.value } : item)),
                    )
                  }
                />
              </div>
              <textarea
                className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
                rows={2}
                value={card.description}
                onChange={(event) =>
                  setPartners((current) =>
                    current.map((item) =>
                      item.id === card.id ? { ...item, description: event.target.value } : item,
                    ),
                  )
                }
              />
              <input
                className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
                value={card.imageUrl}
                onChange={(event) =>
                  setPartners((current) =>
                    current.map((item) => (item.id === card.id ? { ...item, imageUrl: event.target.value } : item)),
                  )
                }
              />
              <div className="flex flex-wrap gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      const uploaded = await uploadImage(file, "partner");
                      setPartners((current) =>
                        current.map((item) =>
                          item.id === card.id
                            ? { ...item, imageUrl: uploaded.url, imagePublicId: uploaded.publicId }
                            : item,
                        ),
                      );
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : "Upload failed");
                    }
                  }}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={card.comingSoon}
                    onChange={(event) =>
                      setPartners((current) =>
                        current.map((item) =>
                          item.id === card.id ? { ...item, comingSoon: event.target.checked } : item,
                        ),
                      )
                    }
                  />
                  Coming soon
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={card.active}
                    onChange={(event) =>
                      setPartners((current) =>
                        current.map((item) =>
                          item.id === card.id ? { ...item, active: event.target.checked } : item,
                        ),
                      )
                    }
                  />
                  Active
                </label>
                <button className="btn btn-dark" type="button" onClick={() => void savePartner(card)}>
                  Save card
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => void removePartner(card.id)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="card space-y-3 p-5">
          <h3 className="font-bold">Add partner card</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="rounded-xl border border-[var(--line)] px-3 py-2"
              placeholder="Tag"
              value={draft.tag}
              onChange={(event) => setDraft({ ...draft, tag: event.target.value })}
            />
            <input
              className="rounded-xl border border-[var(--line)] px-3 py-2"
              placeholder="Title"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </div>
          <textarea
            className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
            rows={2}
            placeholder="Description"
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          />
          <input
            className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
            placeholder="Image URL"
            value={draft.imageUrl}
            onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })}
          />
          <input
            type="file"
            accept="image/*"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                const uploaded = await uploadImage(file, "partner");
                setDraft((current) => ({
                  ...current,
                  imageUrl: uploaded.url,
                  imagePublicId: uploaded.publicId,
                }));
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Upload failed");
              }
            }}
          />
          <button className="btn btn-hot" type="button" onClick={() => void addPartner()}>
            Add card
          </button>
        </div>
      </section>
    </div>
  );
}
