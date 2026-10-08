'use client'

import Image from 'next/image'

import { MailIcon, PhoneIcon } from 'lucide-react'

import { useContactSettings } from '@/context/ContactSettingsContext'
import { useLanguage } from '@/context/LanguageContext'

/**
 * Shown to every visitor instead of the public site while
 * COMING_SOON_MODE is on (src/proxy.ts redirects every non-admin,
 * non-API route here) — a standalone page, not wrapped in
 * PublicHeader/PublicFooter, since their nav links would just bounce
 * back to this same page. Still rendered inside (public)/layout.tsx, so
 * language + contact-settings context, the language-preference modal,
 * and the floating call/WhatsApp buttons all work normally here.
 */
const ComingSoonView = () => {
  const { lang, setLang } = useLanguage()
  const { phone, email } = useContactSettings()

  return (
    <div className='relative flex min-h-screen flex-col items-center justify-center bg-[#fdf8ef] px-4 py-16 text-center sm:px-6'>
      <div className='absolute top-6 right-6 flex items-center gap-1.5 text-sm font-bold' role='group' aria-label='Language switcher'>
        <button
          type='button'
          onClick={() => setLang('hi')}
          aria-pressed={lang === 'hi'}
          className={lang === 'hi' ? 'text-[var(--kdb-primary)] underline underline-offset-4' : 'text-[var(--kdb-muted)]'}
        >
          हिंदी
        </button>
        <span className='text-[var(--kdb-border)]'>|</span>
        <button
          type='button'
          onClick={() => setLang('en')}
          aria-pressed={lang === 'en'}
          className={lang === 'en' ? 'text-[var(--kdb-primary)] underline underline-offset-4' : 'text-[var(--kdb-muted)]'}
        >
          English
        </button>
      </div>

      <Image src='/images/public/logo.webp' alt='Kurukshetra Development Board' width={96} height={96} priority />

      <div className='mt-6 mb-3 flex items-center justify-center gap-2' aria-hidden='true'>
        <span className='h-px w-10 bg-[#c88718]/40' />
        <span className='size-1.5 rotate-45 bg-[#c88718]' />
        <span className='h-px w-10 bg-[#c88718]/40' />
      </div>

      <p className='mb-2 text-xs font-extrabold tracking-widest text-[#c88718] uppercase'>
        {lang === 'hi' ? 'कुरुक्षेत्र विकास बोर्ड' : 'Kurukshetra Development Board'}
      </p>
      <h1 className='mb-4 text-3xl font-extrabold text-[var(--kdb-primary)] sm:text-4xl'>
        {lang === 'hi' ? 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026' : 'International Gita Jayanti Mahotsav 2026'}
      </h1>

      <h2 className='mb-4 text-2xl font-black text-[#c88718] sm:text-3xl'>{lang === 'hi' ? 'जल्द आ रहा है' : 'Coming Soon'}</h2>

      <p className='max-w-xl text-sm leading-relaxed text-[var(--kdb-muted)] sm:text-base'>
        {lang === 'hi'
          ? 'बूथ/स्टॉल आवेदन पोर्टल अभी तैयार किया जा रहा है और शीघ्र ही उपलब्ध होगा। कृपया कुछ समय बाद पुनः देखें।'
          : 'The booth/stall application portal is being prepared and will be available shortly. Please check back soon.'}
      </p>

      {(phone || email) && (
        <div className='mt-10 flex flex-col items-center gap-2 text-sm text-[var(--kdb-text)] sm:flex-row sm:gap-6'>
          {phone && (
            <a href={`tel:${phone}`} className='flex items-center gap-1.5 font-semibold hover:text-[var(--kdb-primary)]'>
              <PhoneIcon className='size-4 text-[#c88718]' />
              {phone}
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className='flex items-center gap-1.5 font-semibold hover:text-[var(--kdb-primary)]'>
              <MailIcon className='size-4 text-[#c88718]' />
              {email}
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default ComingSoonView
