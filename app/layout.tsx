import type { Metadata, Viewport } from "next";
import { Exo_2, Inter } from "next/font/google";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

// Brand typography: Exo 2 (modern, technical, confident) for display; Inter for body.
const display = Exo_2({
  subsets: ["latin"],
  variable: "--font-exo2",
  weight: ["500", "600", "700"],
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Atlas",
  description: "Atlas — a fast, mobile-first personal finance tracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Atlas",
  },
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1210",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${sans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('ft_hide_amounts')==='1')document.documentElement.classList.add('amounts-hidden')}catch(e){}`,
          }}
        />
        <div className="bg-atmosphere" aria-hidden />
        <div className="bg-grain" aria-hidden />
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
