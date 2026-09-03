import { Nav } from "@/components/Nav";

// Every dashboard page reads live data behind the analyst session and talks
// to the backend at request time — never statically prerenderable, and
// forcing that explicitly avoids the build trying (and failing, since env
// vars like ANALYTICS_SERVICE_KEY are runtime-only secrets) to prerender
// these pages with no request context.
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      <main className="max-w-6xl mx-auto px-6 md:px-10 py-10">{children}</main>
    </div>
  );
}
