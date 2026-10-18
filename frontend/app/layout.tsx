import type { Metadata } from "next"
import "./globals.css"
import Navbar from "@/components/Navbar"

export const metadata: Metadata = {
  title: "KEYSTONE — Graph-Native Software Vulnerability Remediation Agent",
  description: "Eliminating alert fatigue by uncovering true dependency leverage and what-if simulation proofs on FalkorDB.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-slate-100 antialiased font-sans flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  )
}
