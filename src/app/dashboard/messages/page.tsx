// page.tsx

"use client";
// CommunicationHub was fully built — model, service, events, API, API client,
// React component — and never given a route or a nav entry. It has been
// unreachable, working, dead code this entire time.
import CommunicationHub from "@/components/dashboard/landlord/CommunicationHub";
export default function MessagesPage() {
  return <CommunicationHub />;
}