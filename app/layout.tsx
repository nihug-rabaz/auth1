import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'IDF Authentication API',
  description: 'IDF Authentication Service - API for user verification and SMS authentication',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  )
}

