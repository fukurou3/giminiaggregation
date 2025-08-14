import type { Metadata } from "next";
import "./globals.css";
import { Layout } from "@/components/Layout";
import { Inter } from "next/font/google";
import { env } from '@/lib/env';

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AI活用創作フォーラム",
  description: "AIで作られた素晴らしいアイデアを発見・共有できるプラットフォーム",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <script
          src={`https://www.google.com/recaptcha/api.js?render=${env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
          async
          defer
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
