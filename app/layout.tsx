import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Figtree, DM_Mono } from "next/font/google";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";

// Substituted fonts, per the design system's own notice: no binaries were supplied with the
// brand reference. Figtree is the closest match to its tight geometric grotesque; DM Mono
// covers tabular data. Swap both here when the licensed files arrive.
const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-dm-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Atlas",
  description: "Personal finance, tracked to the rupiah.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Atlas",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      // The SVG is listed first so browsers that support it get the crisp mark.
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    // iOS wants exactly 180x180 and will downscale anything else badly.
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f4ed",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// Blocking inline script: applies the privacy class before first paint so masked amounts
// never flash their real value on reload.
const NO_FLASH_PRIVACY = `try{if(localStorage.getItem("ft_hide_amounts")==="1")document.documentElement.classList.add("amounts-hidden")}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${figtree.variable} ${dmMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_PRIVACY }} />
      </head>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
