import type { Metadata, Viewport } from "next";
import '@fontsource-variable/fraunces';
import '@fontsource-variable/manrope';
import '@fontsource/yatra-one';
import '@fontsource/tiro-devanagari-hindi';
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const SITE_URL = process.env.SITE_URL || "https://biharse.org";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BiharSe — Order Fresh & Authentic Thekua From Bihar",
    template: "%s | BiharSe",
  },
  description:
    "Order fresh & authentic Thekua, Namkeen and Chhath Prasad hampers from Bihar. 100% homemade, no preservatives, hygienically packed, delivered across India in 5–8 days. बिहार की परंपरा और स्वाद, अब आपके घर तक।",
  keywords: [
    "homemade thekua online", "Bihar traditional sweets", "Chhath puja prasad",
    "Gur thekua", "Chini thekua", "Bihari namkeen", "thekua online India", "बिहारसे",
  ],
  authors: [{ name: "BiharSe" }],
  icons: { icon: "/brand/mandala.png", apple: "/brand/mandala.png" },
  openGraph: {
    title: "BiharSe — Fresh & Authentic Thekua From Bihar",
    description: "Each packet carries love, purity, and Bihar's heritage in every bite. Order now — 100% homemade, delivered across India.",
    url: SITE_URL,
    siteName: "BiharSe",
    images: [{ url: "/img/og-image.png", width: 1200, height: 630, alt: "BiharSe — fresh thekua from Bihar, ghat at sunrise" }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BiharSe — Fresh & Authentic Thekua From Bihar",
    description: "100% homemade thekua, namkeen & Chhath prasad hampers. Delivered across India.",
    images: ["/img/og-image.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL, languages: { "en-IN": SITE_URL, "hi-IN": `${SITE_URL}/?lang=hi` } },
};

export const viewport: Viewport = {
  themeColor: "#D80018",
  width: "device-width",
  initialScale: 1,
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "BiharSe",
  alternateName: "बिहारसे",
  url: SITE_URL,
  logo: `${SITE_URL}/brand/mandala.png`,
  email: "support@biharse.org",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Block H, House 158, Mangol Puri",
    addressLocality: "New Delhi",
    postalCode: "110083",
    addressCountry: "IN",
  },
  sameAs: [],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="/" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </head>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
