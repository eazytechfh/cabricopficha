import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Ficha de Venda - CABRICOP',
  description: 'Formulário de preenchimento de ficha de venda - CABRICOP - Especialistas em Defesas de Trânsito',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/favicon-car-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-car-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon-car-32.png',
    apple: { url: '/favicon-car-180.png', sizes: '180x180', type: 'image/png' },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
