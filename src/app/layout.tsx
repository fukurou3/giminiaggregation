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
  title: "AI-Canvas研究所 -AIでアプリのユーザー投稿型フォーラム",
  description: "AIのCanvas機能で作られた素晴らしいアイデアを発見・共有できるプラットフォーム",
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
