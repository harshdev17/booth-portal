import type { ReactNode } from 'react'

import { Card, CardContent, CardTitle } from '@/components/ui/card'

type ModulePendingProps = {
  title: string
  icon: ReactNode

  /** One sentence describing what this module will do once built. */
  description: string
}

/**
 * Client-facing "coming soon" shell for an admin route that is real
 * navigation (permission-gated, inside the admin shell) but not built yet.
 * Deliberately not a Next.js 404 — the route exists and is reachable by
 * anyone with the permission, it just says plainly that it's on the way
 * instead of showing broken/fake data. Kept free of internal implementation
 * detail (schema names, phase numbers, internal doc references) — this is
 * shown to the client, not to the development team.
 */
const ModulePending = ({ title, icon, description }: ModulePendingProps) => {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>{title}</h1>
        <p className='text-sm text-muted-foreground'>{description}</p>
      </div>

      <Card className='border-dashed shadow-none'>
        <CardContent className='mx-auto flex max-w-xl flex-col items-center gap-2 py-10 text-center'>
          <div className='mb-2 flex size-14 items-center justify-center rounded-full bg-[#fffaf0] text-[#0c2847]'>
            {icon}
          </div>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Coming Soon</CardTitle>
          <p className='text-sm text-muted-foreground'>This feature is being set up and will be available soon.</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default ModulePending
