'use client'

// Next Imports
import { Fragment, useEffect, useState } from 'react'

import { usePathname } from 'next/navigation'

// Component Imports
import ProfileDropdown from '@/components/shared/ProfileDropdown'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

type HeaderUser = { fullName: string; email: string; roleName: string }

const Header = ({ user }: { user: HeaderUser }) => {
  const pathname = usePathname()
  const [applicationNumber, setApplicationNumber] = useState<string | null>(null)

  const segments = pathname.split('/').filter(Boolean)

  useEffect(() => {
    const applicationToken = /^\/admin\/applications\/([^/]+)$/.exec(pathname)?.[1]

    if (!applicationToken) {
      setApplicationNumber(null)
      return
    }

    let cancelled = false

    fetch(`/api/admin/applications/${encodeURIComponent(applicationToken)}/breadcrumb`)
      .then(response => (response.ok ? response.json() : null))
      .then((data: { applicationNumber?: string } | null) => {
        if (!cancelled) setApplicationNumber(data?.applicationNumber ?? null)
      })
      .catch(() => {
        if (!cancelled) setApplicationNumber(null)
      })

    return () => {
      cancelled = true
    }
  }, [pathname])

  return (
    <header className='bg-card sticky top-0 z-50 border-b'>
      <div className='mx-auto flex max-w-360 items-center justify-between gap-6 px-4 py-2 sm:px-6'>
        <div className='flex items-center gap-4'>
          <SidebarTrigger className='[&_svg]:size-5!' />
          <Separator orientation='vertical' className='hidden h-4! data-vertical:self-center sm:block' />
          <Breadcrumb className='hidden sm:block'>
            <BreadcrumbList>
              {segments.map((segment, index) => {
                const isLast = index === segments.length - 1
                const label = isLast && applicationNumber ? applicationNumber : segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                const href = '/' + segments.slice(0, index + 1).join('/')

                return (
                  <Fragment key={href}>
                    <BreadcrumbItem>
                      {isLast ? <BreadcrumbPage>{label}</BreadcrumbPage> : <BreadcrumbLink>{label}</BreadcrumbLink>}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator />}
                  </Fragment>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className='flex items-center gap-1.5'>
          <ProfileDropdown user={user} />
        </div>
      </div>
    </header>
  )
}

export default Header
