import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "健康测评",
  description: "获取你的专属健康评估报告",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
