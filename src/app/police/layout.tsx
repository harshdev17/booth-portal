import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldCheckIcon, LogOutIcon, ArrowLeftIcon, UserCheckIcon } from 'lucide-react'

import { getSession } from '@/lib/auth/session'
import { logoutAction } from '@/app/server/auth-actions'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'Police Portal — IGM 2026 Security & Allotment Verification'
}

export default async function PoliceLayout({ children }: { children: ReactNode }) {
  const session = await getSession()

  if (!session) {
    redirect('/police/login')
  }

  // Police portal is accessible by police_user, admin, and super_admin
  const allowedRoles = ['police_user', 'admin', 'super_admin']
  if (!allowedRoles.includes(session.role.key)) {
    redirect('/admin/dashboard')
  }

  return (
    <div className='min-h-screen bg-slate-50 flex flex-col font-sans'>
      {/* Top Police Band */}
      <div className='h-1.5 w-full bg-gradient-to-r from-blue-700 via-amber-400 to-red-600' />

      {/* Police Portal Header */}
      <header className='sticky top-0 z-40 bg-[#0c1a2e] text-white border-b border-slate-800 shadow-md'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='size-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400'>
              <ShieldCheckIcon className='size-6' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <span className='font-bold text-base sm:text-lg tracking-tight text-white'>
                  Police & Security Portal
                </span>
                <span className='rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 border border-blue-400/30 uppercase'>
                  IGM 2026
                </span>
              </div>
              <p className='text-[11px] text-slate-400 hidden sm:block'>
                Kurukshetra Development Board · On-Ground Booth Verification & Security
              </p>
            </div>
          </div>

          <div className='flex items-center gap-3'>
            <div className='text-right hidden sm:block'>
              <p className='text-xs font-semibold text-slate-200'>{session.fullName}</p>
              <p className='text-[10px] text-slate-400'>{session.role.name}</p>
            </div>

            {session.role.key !== 'police_user' && (
              <Link
                href='/admin/dashboard'
                className='text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition'
              >
                <ArrowLeftIcon className='size-3.5' /> Admin Panel
              </Link>
            )}

            <form action={logoutAction}>
              <button
                type='submit'
                className='text-xs bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition'
                title='Sign Out'
              >
                <LogOutIcon className='size-3.5' /> Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className='flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {children}
      </main>

      <footer className='border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500'>
        &copy; {new Date().getFullYear()} Kurukshetra Development Board (KDB) · Police & Security Verification Unit
      </footer>
      <Toaster />
    </div>
  )
}
