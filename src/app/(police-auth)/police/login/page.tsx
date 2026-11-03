import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'

import Logo from '@/components/shared/Logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession } from '@/lib/auth/session'
import PoliceLoginForm from '@/views/police/PoliceLoginForm'

export const metadata: Metadata = {
  title: 'Police Sign In — IGM Admin Portal'
}

/**
 * Deliberately the same card layout as the admin login
 * (views/admin/auth/login/index.tsx) — per explicit request (2026-11-03),
 * the police portal should look like the same system, not a visually
 * distinct "security portal" theme. Only the heading text and redirect
 * target differ.
 */
export default async function PoliceLoginPage() {
  const session = await getSession()

  if (session) {
    redirect(session.role.key === 'police_user' ? '/police/dashboard' : '/admin/dashboard')
  }

  return (
    <div
      className='relative flex h-auto min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-8'
      style={{
        backgroundColor: '#faf8f5',
        backgroundImage:
          'radial-gradient(circle at 12% 20%, rgba(12, 40, 71, 0.06) 0%, transparent 55%),' +
          'radial-gradient(circle at 88% 82%, rgba(216, 137, 29, 0.08) 0%, transparent 50%)'
      }}
    >
      <div className='absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#c88718] via-[#ffd56b] to-[#c88718]' />

      <Card className='z-1 w-full gap-6 rounded-2xl border-[#e2e8f0] py-6 shadow-xs sm:max-w-md'>
        <CardHeader className='gap-4 px-6 text-center'>
          <div className='flex justify-center'>
            <Logo className='gap-3' />
          </div>

          <Image
            src='/images/public/gita-mahotsav-gold-ornamental-divider.png'
            alt=''
            width={160}
            height={16}
            className='mx-auto h-auto w-32 object-contain opacity-80'
          />

          <div>
            <CardTitle className='mb-1.5 text-2xl font-bold text-[#0c2847]'>Police Sign In</CardTitle>
            <CardDescription className='text-sm'>
              Kurukshetra Development Board — Booth/Stall Allotment Portal
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className='px-6'>
          <PoliceLoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
