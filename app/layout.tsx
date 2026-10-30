import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "PanelForge AI — Create worlds. Frame legends.", description: "An AI-powered story and manhwa creation studio. Start with The God Beneath My Shadow." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }