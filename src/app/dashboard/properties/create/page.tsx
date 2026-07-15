// page.tsx

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, Users } from "lucide-react";
import PropertyForm from "@/components/dashboard/landlord/PropertyForm";
import GroupForm from "@/components/dashboard/landlord/GroupForm";
import { PageHeader } from "@/components/ui/page";

export default function CreatePage() {
  const router = useRouter();
  const params = useSearchParams();
  const [type, setType] = useState<"property" | "group" | null>(
    params.get("type") === "group" ? "group" : null,
  );

  if (type === "property") return <PropertyForm />;
  if (type === "group") return <GroupForm />;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="What are you adding?"
        breadcrumbs={[{ label: "Properties", href: "/dashboard/properties" }, { label: "New" }]}
        actions={
          <button
            onClick={() => router.push("/dashboard/properties")}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-[hsl(var(--surface-sunken))]"
            style={{ borderColor: "hsl(var(--line))" }}
          >
            <ArrowLeft className="h-4 w-4" /> Cancel
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => setType("property")}
          className="card p-6 text-left transition-colors hover:border-[hsl(var(--brand))]"
        >
          <Building2 className="mb-3 h-7 w-7 text-[hsl(var(--brand))]" />
          <p className="font-semibold">A property</p>
          <p className="mt-1 text-sm text-[hsl(var(--ink-4))]">
            A complete unit — apartment, suite, house — or a single room in a shared
            home.
          </p>
        </button>

        <button
          onClick={() => setType("group")}
          className="card p-6 text-left transition-colors hover:border-[hsl(var(--brand))]"
        >
          <Users className="mb-3 h-7 w-7 text-[hsl(var(--brand))]" />
          <p className="font-semibold">A property group</p>
          <p className="mt-1 text-sm text-[hsl(var(--ink-4))]">
            The shared parts of one home: the kitchen, bathroom and living room that
            several rooms have in common. Make this first if you're renting out rooms.
          </p>
        </button>
      </div>
    </div>
  );
}