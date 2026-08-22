import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PermanentLink — Fast Permanent URLs for Dynamic Destinations",
  description: "Permanent public URLs that redirect to destinations you can update anytime with zero latency.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
