import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { ShieldAlertIcon, ShieldCheckIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession } from '@/lib/auth/session'
import PoliceLoginForm from '@/views/police/PoliceLoginForm'

export const metadata: Metadata = {
  title: 'Police & Security Sign In — IGM 2026 Verification Portal'
}

export default async function PoliceLoginPage() {
  const session = await getSession()

  if (session) {
    if (session.role.key === 'police_user') {
      redirect('/police/dashboard')
    } else {
      redirect('/admin/dashboard')
    }
  }

  return (
    <div
      className='relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:px-6 lg:px-8'
      style={{
        backgroundColor: '#0c1a2e',
        backgroundImage:
          'radial-gradient(circle at 15% 20%, rgba(30, 58, 138, 0.4) 0%, transparent 50%),' +
          'radial-gradient(circle at 85% 80%, rgba(15, 23, 42, 0.8) 0%, transparent 50%)'
      }}
    >
      {/* Top Police Band Accent */}
      <div className='absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-blue-700 via-amber-400 to-red-600' />

      <Card className='z-10 w-full max-w-md rounded-2xl border-slate-700/80 bg-slate-900/90 text-slate-100 shadow-2xl backdrop-blur-md'>
        <CardHeader className='gap-3 px-8 text-center pb-4'>
          <div className='mx-auto flex size-16 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700 shadow-inner'>
            <ShieldCheckIcon className='size-9 text-blue-400' />
          </div>

          <div>
            <div className='inline-flex items-center gap-1.5 rounded-full bg-blue-950/80 border border-blue-800/60 px-3 py-1 text-xs font-semibold text-blue-300 mb-2'>
              <ShieldAlertIcon className='size-3.5 text-blue-400' />
              <span>Law Enforcement & Security Portal</span>
            </div>
            <CardTitle className='text-2xl font-bold tracking-tight text-white'>
              Police Verification Access
            </CardTitle>
            <CardDescription className='text-xs text-slate-400 mt-1'>
              International Gita Mahotsav 2026 · Kurukshetra Development Board
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className='px-8 pb-8 pt-2'>
          <div className='rounded-xl bg-slate-800/80 border border-slate-700 p-5'>
            <PoliceLoginForm />
          </div>

          <div className='mt-5 text-center text-xs text-slate-500'>
            Need administrative access instead?{' '}
            <a href='/admin/login' className='text-blue-400 hover:underline'>
              Admin Panel Sign In &rarr;
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
