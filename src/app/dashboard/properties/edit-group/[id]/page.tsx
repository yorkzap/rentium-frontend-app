// page.tsx

"use client";

import { use } from "react";
import GroupForm from "@/components/dashboard/landlord/GroupForm";

export default function EditGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <GroupForm groupId={id} />;
}