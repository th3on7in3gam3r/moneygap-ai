import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import { SmartConsentHost } from "@/components/privacy/smart-consent-host";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";
import { getPulseEmbedConfig, PULSE_COLLECT_ENDPOINT } from "@/lib/analytics/pulse";
import {
  SITE_DEFAULT_DESCRIPTION,
  SITE_DEFAULT_TITLE,
  getSiteOrigin,
  jsonLdScript,
  organizationJsonLd,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = getSiteOrigin();

export const metadata: Metadata = {
  title: {
    default: SITE_DEFAULT_TITLE,
    template: "%s · MoneyGap AI",
  },
  description: SITE_DEFAULT_DESCRIPTION,
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  applicationName: "MoneyGap AI",
  manifest: "/manifest.webmanifest",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0e0c" },
  ],
  appleWebApp: {
    capable: true,
    title: "MoneyGap AI",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: SITE_DEFAULT_TITLE,
    description: SITE_DEFAULT_DESCRIPTION,
    url: "/",
    type: "website",
    siteName: "MoneyGap AI",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_DEFAULT_TITLE,
    description: SITE_DEFAULT_DESCRIPTION,
  },
};

const jsonLd = [
  organizationJsonLd(),
  websiteJsonLd(),
  softwareApplicationJsonLd(),
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pulse = await getPulseEmbedConfig();

  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body
        className={`${spaceGrotesk.variable} ${dmSans.variable} ${geistMono.variable} min-h-full bg-bg font-sans text-fg antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
        />
        <ClerkProvider>
          <ThemeProvider>
            {children}
            <SmartConsentHost />
            <PwaRegister />
          </ThemeProvider>
        </ClerkProvider>
        <Script
          src={pulse.src}
          strategy="afterInteractive"
          data-site={pulse.site}
          data-endpoint={PULSE_COLLECT_ENDPOINT}
          {...(pulse.dataKey ? { "data-key": pulse.dataKey } : {})}
          defer
        />
      </body>
    </html>
  );
}
