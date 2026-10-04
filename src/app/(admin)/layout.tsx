// React Imports
import { Suspense } from 'react'
import type { ReactNode } from 'react'

import { redirect } from 'next/navigation'

// Component Imports
import Footer from '@/components/layout/Footer'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import { SidebarInset } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'

// Auth Import
import { getSession } from '@/lib/auth/session'
import { query } from '@/lib/db/client'
import { getCurrentUserPermissions } from '@/lib/rbac/authorize'

/**
 * Server-side session check, in addition to middleware.ts. Defense in depth:
 * middleware protects the route at the edge, this protects the render even
 * if middleware config ever changes/drifts. Never rely on client-side
 * checks alone for this (see CLAUDE.md Section 15).
 */
const AdminLayout = async ({ children }: Readonly<{ children: ReactNode }>) => {
  const session = await getSession()

  if (!session) redirect('/admin/login')

  const permissions = await getCurrentUserPermissions()

  // Only fetched when the sidebar's "All Applications" item would actually
  // render for this role — feeds the per-category submenu/counts (see
  // Sidebar.tsx's injectCategoryDropdown). Read-only aggregate counts, no
  // applicant data, so no extra permission check beyond application:view.
  const categoryCounts = permissions?.has('application:view')
    ? await query<Array<{ name: string; slug: string; count: number }>>(
        `SELECT c.name, c.slug, COUNT(a.id) AS count
         FROM categories c
         LEFT JOIN applications a ON a.category_id = c.id AND a.status != 'draft'
         WHERE c.status != 'archived'
         GROUP BY c.id, c.name, c.slug, c.display_order
         ORDER BY c.display_order ASC`
      )
    : []

  return (
    <div className='admin-shell flex h-full w-full min-w-0'>
      <Suspense>
        <Sidebar permissions={permissions ? Array.from(permissions) : []} categoryCounts={categoryCounts} />
      </Suspense>
      <SidebarInset className='flex flex-1 flex-col'>
        <Header user={{ fullName: session.fullName, email: session.email, roleName: session.role.name }} />
        <main className='mx-auto size-full max-w-360 flex-1 px-4 py-6 sm:px-6'>{children}</main>
        <Toaster />
        <Footer />
      </SidebarInset>
    </div>
  )
}

export default AdminLayout
