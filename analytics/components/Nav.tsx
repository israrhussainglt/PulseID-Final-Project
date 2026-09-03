"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomTabBar } from "@/components/BottomTabBar";
import { GridIcon, MapPinIcon, TrendIcon, ShieldIcon, MoreIcon } from "@/components/TabIcons";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/regions", label: "Regions" },
  { href: "/dashboard/map", label: "Map" },
  { href: "/dashboard/trends", label: "Trends" },
  { href: "/dashboard/benchmark", label: "Benchmark" },
  { href: "/dashboard/alerts", label: "Alerts" },
  { href: "/dashboard/query", label: "Ask" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/dashboard/resources", label: "Resources" },
  { href: "/dashboard/quality", label: "Data quality" },
];

// Admin-only links appended dynamically once we know the signed-in
// analyst's role — kept out of LINKS above so a viewer never even sees
// them rendered (defense in depth alongside the server-side checks in
// middleware.ts and each admin route handler).
const ADMIN_LINKS = [
  { href: "/dashboard/analysts", label: "Analysts" },
  { href: "/dashboard/audit", label: "Audit log" },
];

// The 4 links an analyst reaches for most, plus a 5th "More" slot for
// everything else. A 10-12 item horizontal-scroll strip works fine on a
// laptop but reads as "a website nav bar" on a phone — a capped bottom
// tab bar plus a drawer for the long tail is the same trade every mobile
// app with more sections than tabs makes (see frontend's doctor/patient
// headers for the same pattern).
const TAB_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: <GridIcon /> },
  { href: "/dashboard/regions", label: "Regions", icon: <MapPinIcon /> },
  { href: "/dashboard/trends", label: "Trends", icon: <TrendIcon /> },
  { href: "/dashboard/alerts", label: "Alerts", icon: <ShieldIcon /> },
];

type SessionInfo = { name: string; email: string; role: "admin" | "viewer" };

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setSession(data?.session ?? null))
      .catch(() => setSession(null));
  }, []);

  // Close the drawer automatically on navigation so tapping a link from it
  // doesn't leave it open behind the new page.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const links = session?.role === "admin" ? [...LINKS, ...ADMIN_LINKS] : LINKS;
  const moreLinks = links.filter((l) => !TAB_ITEMS.some((t) => t.href === l.href));
  const tabItems = [...TAB_ITEMS, { href: "__more__", label: "More", icon: <MoreIcon /> }];

  return (
    <header className="border-b border-line bg-white relative">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="eyebrow text-teal">PulseID</div>
            <div className="font-display text-lg -mt-0.5">Analytics</div>
          </div>
          <div className="flex items-center gap-4">
            {session && (
              <Link href="/dashboard/account" className="text-right hidden sm:block group">
                <div className="text-sm font-medium text-ink group-hover:underline">{session.name}</div>
                <div className="text-xs text-sage capitalize">{session.role}</div>
              </Link>
            )}
            <button onClick={logout} className="focus-ring hidden sm:inline text-sm font-medium text-sage hover:text-ink">
              Sign out
            </button>
          </div>
        </div>
        {/* Full link strip: desktop/tablet only. Phones get the bottom tab
            bar + drawer below instead — see TAB_ITEMS above. */}
        <nav className="hidden sm:flex items-center gap-1 overflow-x-auto -mx-1 px-1 pb-1">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`focus-ring shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-teal-light text-teal-dark" : "text-sage hover:bg-teal-light/60 hover:text-teal-dark"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile "More" drawer — everything not pinned to the bottom tab
          bar, plus account/sign-out, since those live in the hidden-on-
          mobile header row above. */}
      {moreOpen && (
        <div className="sm:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/30"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl border-t border-line safe-bottom safe-x max-h-[75vh] overflow-y-auto">
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <span className="font-display text-lg">More</span>
              <button onClick={() => setMoreOpen(false)} className="focus-ring p-2 -mr-2 text-sage" aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <nav className="px-2 pb-2 flex flex-col">
              {moreLinks.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`px-3 py-3 rounded-lg text-[15px] font-medium ${active ? "bg-teal-light text-teal-dark" : "text-ink"}`}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
            {session && (
              <div className="px-5 pt-2 pb-4 border-t border-line mt-1">
                <div className="text-sm font-medium text-ink">{session.name}</div>
                <div className="text-xs text-sage capitalize mb-3">{session.role}</div>
                <button onClick={logout} className="focus-ring text-sm font-semibold text-alert">
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomTabBar
        items={tabItems.map((t) =>
          t.href === "__more__" ? { ...t, onClick: () => setMoreOpen(true) } : t
        )}
      />
    </header>
  );
}
