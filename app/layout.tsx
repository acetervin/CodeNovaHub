import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

// The rounded geometric sans of the reference design.
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CodeNova projects",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ececec",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-dvh bg-bg font-sans text-ink">{children}</body>
    </html>
  );
}
