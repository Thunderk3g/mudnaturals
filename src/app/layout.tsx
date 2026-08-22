import type { Metadata } from "next";
import { EB_Garamond, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CartProvider } from "@/components/cart/cart-provider";
import { copy } from "@/content/copy";

// Self-hosted at build time by next/font — no external font requests at runtime.
const display = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const spec = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-spec",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${copy.brand.name} — ${copy.brand.tagline}`,
    template: `%s — ${copy.brand.name}`,
  },
  description: copy.brand.description,
  openGraph: {
    type: "website",
    siteName: copy.brand.name,
    title: `${copy.brand.name} — ${copy.brand.tagline}`,
    description: copy.brand.description,
    url: siteUrl,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${spec.variable}`}>
      <body className="min-h-screen bg-paper text-ink antialiased">
        <a href="#main" className="skip-link">
          {copy.a11y.skipToContent}
        </a>
        <CartProvider>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
