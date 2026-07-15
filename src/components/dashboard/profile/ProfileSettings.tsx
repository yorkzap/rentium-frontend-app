// ProfileSettings.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { DJANGO_API_URL } from "@/lib/config";
import PhoneInput from "@/components/form/PhoneInput";
import { Field, TextInput } from "@/components/form/Fields";
import { PageHeader } from "@/components/ui/page";

/**
 * Account settings. Deliberately small.
 *
 * What's gone from the old version: three tabs of toggles that did nothing.
 * "Notification preferences" had six switches with no backend, no model, and no
 * endpoint; "Security" had a password form that posted nowhere. They looked
 * finished and were entirely decorative, which is worse than absent — a user
 * flips a switch, believes they've turned off SMS reminders, and then keeps
 * getting them.
 *
 * When notification preferences are real, they come back. Until then this page
 * only contains things that work.
 */

export default function ProfileSettings() {
  const { user, token } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setName(user?.name ?? "");
    setPhone((user as { phone?: string })?.phone ?? "");
  }, [user]);

  const save = async () => {
    if (!token) return;
    setSaving(true);
    setError(undefined);
    try {
      const res = await fetch(`${DJANGO_API_URL}/users/me/`, {
        method: "PATCH",
        headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const body = await res.json();
      if (!res.ok) {
        // The backend validates phones with libphonenumber, so a bad number comes
        // back as a real, specific message ("check the area code") rather than a
        // generic 400. Show it against the field.
        setError(body.phone?.[0]);
        throw new Error(body.detail ?? body.name?.[0] ?? "Couldn't save.");
      }
      toast.success("Saved.");
    } catch (e) {
      if (!error) toast.error(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  const initials = (user?.name || user?.email || "?")
    .split(/[\s@.]+/).filter(Boolean).slice(0, 2)
    .map((s) => s[0]?.toUpperCase()).join("");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Your account" description="Your name and how we reach you." />

      <section className="card p-6">
        <div className="mb-6 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--brand))] text-lg font-semibold text-white">
            {initials}
          </span>
          <div>
            <p className="font-medium">{user?.name || user?.email}</p>
            <p className="text-sm text-[hsl(var(--ink-4))]">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <Field label="Full name" hint="This appears on the leases you send out.">
            <TextInput value={name} onChange={setName} placeholder="Raj Singh" />
          </Field>

          <PhoneInput value={phone} onChange={setPhone} label="Phone" error={error} />

          <Field
            label="Email"
            hint="Changing your email needs re-verification — talk to us if you need to."
          >
            <input value={user?.email ?? ""} disabled
                   className="field cursor-not-allowed bg-[hsl(var(--surface-sunken))] text-[hsl(var(--ink-4))]" />
          </Field>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-6 flex items-center gap-2 rounded-lg bg-[hsl(var(--brand))] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--brand-hover))] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </section>

      <Link
        href="/dashboard/settings"
        className="card mt-6 flex items-center gap-3 p-5 transition-colors hover:border-[hsl(var(--brand))]"
      >
        <Globe className="h-5 w-5 text-[hsl(var(--ink-4))]" />
        <div className="flex-1">
          <p className="font-medium">Public page</p>
          <p className="text-sm text-[hsl(var(--ink-4))]">
            Your listings, your page address, and who can see your properties.
          </p>
        </div>
      </Link>
    </div>
  );
}