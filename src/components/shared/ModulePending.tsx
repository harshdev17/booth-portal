import type { ReactNode } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type ModulePendingProps = {
  title: string
  icon: ReactNode

  /** One sentence describing what this module will do once built. */
  description: string

  /** Which implementation phase this belongs to, per .ai/ADMIN_TRANSFORMATION_PLAN.md Section 21. */
  phase: string

  /** Business rules or schema work this module is genuinely blocked on — never invented, only what's documented. */
  blockedBy: string[]
}

/**
 * Honest "not built yet" shell for an admin route that is real navigation
 * (permission-gated, inside the admin shell) but has no backing database
 * schema or confirmed business rules yet. Deliberately not a Next.js 404 —
 * the route exists and is reachable by anyone with the permission, it just
 * says plainly what's missing instead of showing broken/fake data.
 */
const ModulePending = ({ title, icon, description, phase, blockedBy }: ModulePendingProps) => {
  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>{title}</h1>
        <p className='text-sm text-muted-foreground'>{description}</p>
      </div>

      <Card className='border-dashed shadow-none'>
        <CardHeader className='items-center text-center pb-2'>
          <div className='mx-auto mb-2 flex size-14 items-center justify-center rounded-full bg-[#fffaf0] text-[#0c2847]'>
            {icon}
          </div>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Not built yet — {phase}</CardTitle>
        </CardHeader>
        <CardContent className='mx-auto max-w-xl text-center'>
          <p className='text-sm text-muted-foreground'>
            This module needs the following before it can be implemented for real, per{' '}
            <code className='rounded bg-muted px-1 py-0.5 text-xs'>.ai/OPEN_QUESTIONS.md</code>:
          </p>
          <ul className='mt-3 space-y-1.5 text-left text-sm'>
            {blockedBy.map(item => (
              <li key={item} className='flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2'>
                <span className='mt-0.5 text-amber-600'>▸</span>
                <span className='text-slate-700'>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default ModulePending
