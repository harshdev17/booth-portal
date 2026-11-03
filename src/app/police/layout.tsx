import type { ReactNode } from 'react'
import type { Metadata } from 'next'

import { Suspense } from 'react'

import { redirect } from 'next/navigation'

import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import { SidebarInset } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { getSession } from '@/lib/auth/session'
import { getCurrentUserPermissions } from '@/lib/rbac/authorize'

export const metadata: Metadata = {
  title: 'Police Portal — IGM 2026 Security & Allotment Verification'
}

/**
 * Deliberately the exact same sidebar/header shell as (admin)/layout.tsx
 * (Sidebar, Header, SidebarInset, Footer — not a separate dark-navy
 * "security portal" chrome) — per explicit request (2026-11-03: "ui login,
 * table sab kuch admin jesa hi rahega, bas data aur access ka difference
 * hai"). What a police_user actually sees differs only through
 * navConfig.tsx's permission gating (they only have police:view/
 * document:view, so only the "Verification" nav group renders for them)
 * and through this app's existing RBAC checks on every page/action — never
 * through a visually distinct UI.
 *
 * /police/login lives in a separate (police-auth) route group precisely so
 * it is NEVER wrapped by this layout — if it were, the redirect below
 * would target the login page itself while logged out, a self-loop
 * (confirmed live, 2026-11-03).
 */
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

  const permissions = await getCurrentUserPermissions()

  return (
    <div className='admin-shell flex h-full w-full min-w-0'>
      <Suspense>
        <Sidebar
          permissions={permissions ? Array.from(permissions) : []}
          categoryCounts={[]}
          excludeGroupLabels={session.role.key === 'police_user' ? ['Overview'] : []}
          hrefOverrides={session.role.key === 'police_user' ? { '/admin/inventory': '/police/inventory' } : {}}
        />
      </Suspense>
      <SidebarInset className='flex flex-1 flex-col min-w-0 overflow-x-hidden'>
        <Header user={{ fullName: session.fullName, email: session.email, roleName: session.role.name }} />
        <main className='mx-auto w-full max-w-360 flex-1 px-4 py-6 sm:px-6 min-w-0 overflow-x-hidden'>{children}</main>
        <Toaster />
        <Footer />
      </SidebarInset>
    </div>
  )
}
