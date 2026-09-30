import type { ReactNode } from 'react'

import { Inter, Noto_Sans_Devanagari } from 'next/font/google'

import FloatingChatbot from '@/components/public/FloatingChatbot'
import FloatingContactButtons from '@/components/public/FloatingContactButtons'
import { LanguageProvider } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'], variable: '--font-public-inter' })
const notoSansDevanagari = Noto_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-public-devanagari' })

/**
 * Public site layout — visually and structurally independent of the admin
 * shell. Does not reuse Sidebar/Header/Footer from src/components/layout
 * (those are the admin panel's operational chrome); the public site has its
 * own header/footer matching the approved landing-page design (see
 * .ai/landing-page-design/index.html) — see src/components/public/*.
 */
const PublicLayout = ({ children }: { children: ReactNode }) => {
  return (
    <LanguageProvider>
      <div className={cn('kdb-public w-full min-w-0 flex-1', inter.variable, notoSansDevanagari.variable)}>
        {children}
        <FloatingContactButtons />
        <FloatingChatbot />
      </div>
    </LanguageProvider>
  )
}

export default PublicLayout
