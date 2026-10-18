import Image from 'next/image'
import { Loader2Icon } from 'lucide-react'

/**
 * Global Next.js Loading component for App Router.
 * Automatically triggered by Next.js during route navigation and server rendering.
 */
export default function Loading() {
  return (
    <div
      role='status'
      aria-live='polite'
      className='fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#faf8f5]/85 backdrop-blur-xs transition-opacity duration-300'
    >
      <div className='flex flex-col items-center gap-4 p-6'>
        {/* Logo Container with Golden Spin Ring */}
        <div className='relative flex size-20 items-center justify-center rounded-2xl border border-[#f1e5cf] bg-white p-3.5 shadow-lg shadow-orange-950/5'>
          <Image
            src='/images/public/logo.webp'
            alt='Kurukshetra Development Board'
            width={64}
            height={64}
            className='size-13 object-contain animate-pulse'
            priority
          />
          <div className='absolute -inset-1.5 rounded-2xl border-2 border-[#d97706]/30 border-t-[#ea580c] animate-spin' />
        </div>

        {/* Text Details */}
        <div className='text-center'>
          <p className='text-base font-extrabold tracking-tight text-[#0c2847]'>
            अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026
          </p>
          <p className='mt-1.5 flex items-center justify-center gap-1.5 text-xs font-bold text-[#b45309]'>
            <Loader2Icon className='size-3.5 animate-spin text-[#ea580c]' />
            <span>लोड हो रहा है... / Loading...</span>
          </p>
        </div>
      </div>
    </div>
  )
}
