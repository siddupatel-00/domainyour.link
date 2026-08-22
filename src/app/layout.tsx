import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PermanentLink — One link. Always yours.",
  description: "Create a single, permanent link for your profiles and websites. Update the destination anytime, your link never changes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900 antialiased selection:bg-black selection:text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
