import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "PulseID Analytics — National public-health overview",
  description:
    "Aggregate, region-level case and visit data across every hospital on PulseID. Counts only — never individual patient records.",
  manifest: "/site.webmanifest",
  applicationName: "PulseID Analytics",
  appleWebApp: { title: "PulseID Analytics", statusBarStyle: "default", capable: true },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0E7C7B",
  // Matches frontend: caps double-tap-zoom so it reads as an app, keeps
  // pinch-zoom for accessibility, and clears notches on full-bleed screens.
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body bg-paper text-ink antialiased">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
