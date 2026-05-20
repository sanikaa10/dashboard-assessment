import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import Image from "next/image";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ArmorHQ Dashboard",
  description: "Caller ID reputation and dialer performance, at a glance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrainsMono.variable} dark`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <header className="border-b border-border bg-card px-4 py-3">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <Image src="/logo.png" alt="ArmorHQ" width={32} height={32} className="shrink-0" />
            <span className="font-semibold text-sm tracking-wide">ArmorHQ</span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
