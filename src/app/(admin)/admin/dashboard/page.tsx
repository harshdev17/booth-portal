import type { Metadata } from 'next'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession } from '@/lib/auth/session'

export const metadata: Metadata = {
  title: 'Dashboard — KDB Admin Portal'
}

/**
 * Placeholder dashboard. Real KPIs (applications, payments, inventory,
 * allotment counts) land in Phase 6/7+ once the underlying data modules
 * exist — see .ai/ADMIN_TRANSFORMATION_PLAN.md Section 12. This page's job
 * for Phase 5 is only to prove the authenticated admin shell renders
 * correctly end-to-end.
 */
const DashboardPage = async () => {
  const session = await getSession()

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-semibold'>Dashboard</h1>
        <p className='text-muted-foreground'>Welcome back, {session?.fullName}.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Signed in as {session?.role.name}</CardTitle>
          <CardDescription>
            Application, payment, inventory, and allotment KPIs will appear here once those modules are built (see
            the approved Admin Transformation Plan, Phases 6 onward).
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

export default DashboardPage
