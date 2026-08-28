import type { Metadata } from "next";
import { Kanit, Sarabun } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["thai", "latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "WIN-AIBCH | กิจการนักเรียน โรงเรียนบาเจาะ",
    template: "%s | WIN-AIBCH",
  },
  description:
    "ระบบบันทึกการกระทำผิดระเบียบของนักเรียน โรงเรียนบาเจาะ — ฝ่ายกิจการนักเรียน",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${kanit.variable} ${sarabun.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
