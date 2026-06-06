import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";

const display = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
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
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0e14",
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
