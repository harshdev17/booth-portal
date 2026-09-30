import type { ComponentType, SVGProps } from 'react'

import Link from 'next/link'

import { Card, CardContent } from '@/components/ui/card'

type KpiCardProps = {
  label: string
  value: string | number
  icon?: ComponentType<SVGProps<SVGSVGElement>>

  /** Tailwind text-color class applied to the value and icon only — e.g. 'text-amber-600'. */
  accentColor?: string
  hint?: string
  href?: string
  compact?: boolean
}

/**
 * Shared KPI/stat card used across the admin panel (Dashboard, Applications,
 * Payments, ...). Deliberately plain: a flat white card with the same
 * neutral border/shadow as every other admin card, a small monochrome icon
 * badge, and one accent color reserved for the number itself — no colored
 * left-border stripe, no gradient fill. The border-stripe/gradient look read
 * as generic-AI-dashboard styling (CLAUDE.md Section 7); this is the one
 * KPI card design meant to be reused everywhere rather than each page
 * inventing its own variant.
 */
const KpiCard = ({ label, value, icon: Icon, accentColor = 'text-[#0c2847]', hint, href, compact }: KpiCardProps) => {
  const content = (
    <Card className={`h-full shadow-xs transition hover:shadow-sm ${compact ? 'gap-0 py-3' : ''}`}>
      <CardContent className={`flex items-start justify-between gap-3 ${compact ? 'px-3' : 'pt-5'}`}>
        <div className='min-w-0'>
          <p className={`truncate font-bold text-muted-foreground uppercase ${compact ? 'text-[10px]' : 'text-xs tracking-wide'}`}>
            {label}
          </p>
          <p className={`font-black leading-tight ${accentColor} ${compact ? 'text-xl' : 'mt-1 text-2xl'}`}>{value}</p>
          {hint && !compact && <p className='mt-1 text-xs text-muted-foreground'>{hint}</p>}
        </div>
        {Icon && (
          <div
            className={`flex shrink-0 items-center justify-center rounded-full bg-slate-100 ${accentColor} ${
              compact ? 'size-7' : 'size-9'
            }`}
          >
            <Icon className={compact ? 'size-3.5' : 'size-4.5'} />
          </div>
        )}
      </CardContent>
    </Card>
  )

  return href ? (
    <Link href={href} title={hint}>
      {content}
    </Link>
  ) : (
    content
  )
}

export default KpiCard
