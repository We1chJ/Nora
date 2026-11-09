import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nora – Practice Phone",
  description: "Try Nora, a friendly helper that guides you through tasks on your phone.",
  // Lets Chrome follow the phone's own text-size setting where it supports this tag.
  other: { "text-scale": "scale" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f7fa",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
