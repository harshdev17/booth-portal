import Image from 'next/image'

// Util Imports
import { cn } from '@/lib/utils'

// Real KDB emblem (same file used across the public site, e.g.
// PublicHeader.tsx) — replaces the generic template snowflake placeholder
// (src/assets/svg/logo.tsx) that was shipped with the AdminCN starter
// template and never swapped for the actual client logo.
const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Image src='/images/public/logo.webp' alt='Kurukshetra Development Board' width={34} height={34} className='size-8.5 object-contain' />
      <div className='flex flex-col items-start leading-tight'>
        <span className='text-lg font-semibold text-nowrap'>IGM</span>
        <span className='text-xs font-light text-nowrap'>Admin Portal</span>
      </div>
    </div>
  )
}

export default Logo
