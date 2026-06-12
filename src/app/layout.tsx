import type { Metadata } from "next";
import { Syne, Outfit } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pluggedin.co"),
  title: {
    default: "PluggedIn | Premium Workspace Essentials & Creator Gear",
    template: "%s | PluggedIn",
  },
  description: "Elevate your creative setup with PluggedIn's premium creator gear. From tactile mechanical keyboards and smart desktop chargers to broadcast-quality microphones and studio monitors, we craft space-saving, premium essentials to power your productivity.",
  keywords: [
    "creator gear",
    "workspace essentials",
    "mechanical keyboards",
    "desk setup accessories",
    "pluggedin",
    "desk setup",
    "studio microphone",
    "monitor lightbar",
    "premium tech accessories"
  ],
  authors: [{ name: "PluggedIn Team", url: "https://pluggedin.co" }],
  creator: "PluggedIn",
  publisher: "PluggedIn",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "PluggedIn | Premium Workspace Essentials & Creator Gear",
    description: "Elevate your creative setup with PluggedIn's premium workspace essentials and creator gear. Crafted for maximum performance and minimalist aesthetics.",
    url: "https://pluggedin.co",
    siteName: "PluggedIn",
    images: [
      {
        url: "/logo.png",
        width: 971,
        height: 343,
        alt: "PluggedIn Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PluggedIn | Premium Workspace Essentials & Creator Gear",
    description: "Elevate your creative setup with PluggedIn's premium workspace essentials and creator gear.",
    images: ["/logo.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white font-outfit text-zinc-900">
        {children}
      </body>
    </html>
  );
}
