import Link from "next/link";
import { PulseMark } from "@/components/PulseMark";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <PulseMark className="w-28 h-6 mb-8" />
      <h1 className="font-display text-3xl mb-2">Nothing found here</h1>
      <p className="text-sage max-w-sm mb-6">
        This dashboard, report or region doesn&apos;t exist — or you don&apos;t have an active
        session to view it.
      </p>
      <Link href="/dashboard" className="text-teal-dark font-semibold hover:underline">
        ← Back to the dashboard
      </Link>
    </main>
  );
}
