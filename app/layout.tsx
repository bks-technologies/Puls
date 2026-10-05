import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Poller } from "@/components/shell/poller";
import { Sidebar } from "@/components/shell/sidebar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://puls.bkstechnologies.de"),
  title: { default: "Puls · API- & Webhook-Monitor", template: "%s · Puls" },
  description:
    "Überwacht APIs und Webhooks in Echtzeit: Status, Latenz, Vorfälle und Benachrichtigungen. Eine Demo von BKS Technologies.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0d1525" },
    { media: "(prefers-color-scheme: dark)", color: "#070c16" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        <Poller />
        <div className="flex min-h-dvh flex-col lg:flex-row">
          <Sidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
