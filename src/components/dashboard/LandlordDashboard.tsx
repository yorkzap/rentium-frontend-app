// LandlordDashboard.tsx

// Reduced to a pass-through.
//
// This component used to render the entire app chrome — header, nav, user menu,
// notification bell — AND it was wrapped around the children of six different
// sub-layouts, each of which was itself already inside dashboard/layout.tsx's
// chrome. So every page below the root rendered two full navbars, one nested in
// the other.
//
// The shell now lives in exactly one place (app/dashboard/layout.tsx). This
// stays as a no-op only so the handful of imports still pointing at it don't
// break; delete it entirely once they're all gone.
"use client";

export default function LandlordDashboard({
  children,
}: {
  children?: React.ReactNode;
}) {
  return <>{children}</>;
}