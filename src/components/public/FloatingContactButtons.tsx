'use client'

import { PhoneIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

// Same placeholder helpline number used everywhere else on the public site
// (ContactBannerSection.tsx, PublicFooter.tsx) — [TBC – Business
// Confirmation Required], see .ai/OPEN_QUESTIONS.md.
const HELPLINE_NUMBER = '+919876543210'
const WHATSAPP_NUMBER = '919876543210'

/**
 * Fixed bottom-left "Call" and "WhatsApp" buttons, present on every public
 * page. Each pulses gently (a soft expanding ring, not a distracting
 * flashing animation) to draw attention without looking gimmicky —
 * `animation-delay` staggers them so they don't pulse in sync.
 */
const FloatingContactButtons = () => {
  const { lang } = useLanguage()

  return (
    <div className='fixed bottom-5 left-4 z-40 flex flex-col gap-3 sm:bottom-6 sm:left-6 print:hidden'>
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}`}
        target='_blank'
        rel='noopener noreferrer'
        aria-label={lang === 'hi' ? 'व्हाट्सएप पर संपर्क करें' : 'Contact us on WhatsApp'}
        className='group relative flex size-13 items-center justify-center rounded-full bg-[#25d366] text-white shadow-lg transition hover:scale-105 active:scale-95'
      >
        <span className='absolute inset-0 -z-10 animate-ping rounded-full bg-[#25d366] opacity-60 [animation-duration:2.2s]' />
        <svg viewBox='0 0 24 24' fill='currentColor' className='size-7'>
          <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z' />
          <path d='M12.001 2C6.478 2 2 6.478 2 12c0 1.995.586 3.854 1.594 5.414L2 22l4.71-1.564A9.953 9.953 0 0012 22c5.523 0 10-4.478 10-10S17.523 2 12.001 2zm0 18.18a8.146 8.146 0 01-4.166-1.14l-.299-.177-3.11.966.988-3.074-.194-.31A8.15 8.15 0 013.82 12c0-4.512 3.669-8.18 8.18-8.18 4.512 0 8.181 3.669 8.181 8.18 0 4.512-3.669 8.18-8.18 8.18z' />
        </svg>
      </a>

      <a
        href={`tel:${HELPLINE_NUMBER}`}
        aria-label={lang === 'hi' ? 'कॉल करें' : 'Call us'}
        className='group relative flex size-13 items-center justify-center rounded-full bg-[#0c2847] text-white shadow-lg transition hover:scale-105 active:scale-95'
      >
        <span className='absolute inset-0 -z-10 animate-ping rounded-full bg-[#0c2847] opacity-60 [animation-delay:1.1s] [animation-duration:2.2s]' />
        <PhoneIcon className='size-6 fill-current' />
      </a>
    </div>
  )
}

export default FloatingContactButtons
