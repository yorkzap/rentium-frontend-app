// InquiryForm.tsx
"use client";

import { useState } from "react";
import { sendInquiry } from "@/lib/publicApi";

export default function InquiryForm({
  propertySlug,
  placeName,
}: {
  propertySlug: string;
  placeName: string;
}) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    move_in_target: "",
    website: "", // honeypot — a real person never sees this
  });

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await sendInquiry({ property_slug: propertySlug, ...form });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send your message.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg bg-teal-50 p-4 text-sm text-teal-900">
        <p className="font-medium">Sent.</p>
        <p className="mt-1">
          The landlord has your message and will reply to you at{" "}
          <span className="font-medium">{form.email}</span>.
        </p>
      </div>
    );
  }

  const input =
    "mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none " +
    "transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900">
          Message the landlord
        </h3>
        <p className="mt-0.5 text-xs text-neutral-500">
          Goes straight to them. They reply to you by email — no account needed.
        </p>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-neutral-700">Your name</span>
        <input required value={form.name} onChange={set("name")} className={input} />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-neutral-700">Email</span>
        <input
          required
          type="email"
          value={form.email}
          onChange={set("email")}
          className={input}
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-neutral-700">
          Phone <span className="font-normal text-neutral-400">(optional)</span>
        </span>
        <input type="tel" value={form.phone} onChange={set("phone")} className={input} />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-neutral-700">
          Hoping to move in{" "}
          <span className="font-normal text-neutral-400">(optional)</span>
        </span>
        <input
          type="date"
          value={form.move_in_target}
          onChange={set("move_in_target")}
          className={input}
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-neutral-700">Message</span>
        <textarea
          required
          rows={4}
          minLength={10}
          value={form.message}
          onChange={set("message")}
          placeholder={`Hi — I'm interested in the ${placeName.toLowerCase()}. A bit about me: `}
          className={`${input} resize-none`}
        />
      </label>

      {/* Honeypot. Hidden from people, irresistible to bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={form.website}
        onChange={set("website")}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}