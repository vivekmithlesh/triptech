import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/sonner";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "Roamio — Travel the world with an AI in your pocket",
    template: "%s · Roamio",
  },
  description:
    "AI travel companion: plan smart day-by-day trips on a map, learn the history of any place, and ask an AI guide grounded in verified data.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="min-h-screen antialiased">
        <QueryProvider>{children}</QueryProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
