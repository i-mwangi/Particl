import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Particl - AI-Powered LaTeX Document Generation",
  description: "Generate, compile, and fix LaTeX documents using AI. Describe what you need in plain English. Auto-correction included.",
  keywords: ["LaTeX", "document generation", "AI writing", "PDF compilation", "academic papers", "research papers", "resume builder"],
  authors: [{ name: "Particl" }],
  openGraph: {
    title: "Particl - AI-Powered LaTeX Document Generation",
    description: "Generate, compile, and fix LaTeX documents using AI. No LaTeX knowledge required.",
    type: "website",
    locale: "en_US",
    siteName: "Particl",
  },
  twitter: {
    card: "summary_large_image",
    title: "Particl - AI-Powered LaTeX Document Generation",
    description: "Generate, compile, and fix LaTeX documents using AI. No LaTeX knowledge required.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
