import type { Metadata } from "next";
import { EB_Garamond, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CartProvider } from "@/components/cart/cart-provider";
import { getSeo, mediaSrc } from "@/server/cms";
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

/**
 * Title and description are settings, so an operator can change what the site
 * is called in search results without a deploy. The read is cached under the
 * `cms` tag and shared with the header and footer, which both run on every
 * page — one round trip covers all three.
 */
export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo();
  const ogImage = mediaSrc(seo.og_media_id);

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: seo.default_title,
      template: `%s — ${seo.default_title}`,
    },
    description: seo.default_description,
    openGraph: {
      type: "website",
      siteName: seo.default_title,
      title: seo.default_title,
      description: seo.default_description,
      url: siteUrl,
      images: ogImage ? [ogImage] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

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
