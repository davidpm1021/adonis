import type { Metadata } from "next";
import { jetbrainsMono, ibmPlexSans } from "@/lib/fonts";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "ADONIS — Rebuild the Machine",
  description: "Personalized health and fitness tracking with adaptive AI intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${jetbrainsMono.variable} ${ibmPlexSans.variable} antialiased`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
