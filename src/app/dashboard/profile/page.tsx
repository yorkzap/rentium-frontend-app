// page.tsx
//
// Account settings merged into /dashboard/settings (Account & RAMA tab).
// This route survives as a redirect so old links and bookmarks keep working.

import { redirect } from 'next/navigation';

export default function ProfilePage() {
  redirect('/dashboard/settings');
}
