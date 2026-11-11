'use client'

import { useState, type ReactNode } from 'react'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'

export type ApplicationTabOrderItem = { value: string; label: string }

/**
 * Wraps the application detail page's <Tabs> as a controlled component
 * (value/onValueChange) purely so a Previous/Next pair at the bottom can
 * step between tab panels in order — TabsList/TabsContent themselves stay
 * exactly as the server page already renders them, passed through as
 * children (they don't need to be client components just because this
 * wrapper is; only the active-tab state does).
 */
const ApplicationTabsNav = ({
  tabOrder,
  defaultValue,
  children
}: {
  tabOrder: ApplicationTabOrderItem[]
  defaultValue: string
  children: ReactNode
}) => {
  const [value, setValue] = useState(defaultValue)
  const index = tabOrder.findIndex(t => t.value === value)
  const prevTab = index > 0 ? tabOrder[index - 1] : null
  const nextTab = index >= 0 && index < tabOrder.length - 1 ? tabOrder[index + 1] : null

  return (
    <Tabs value={value} onValueChange={next => setValue(String(next))}>
      {children}

      <div className='mt-4 flex items-center justify-between border-t pt-4'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={!prevTab}
          onClick={() => prevTab && setValue(prevTab.value)}
          className='text-xs font-bold'
        >
          <ChevronLeftIcon className='size-3.5' />
          {prevTab ? prevTab.label : 'Previous'}
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={!nextTab}
          onClick={() => nextTab && setValue(nextTab.value)}
          className='text-xs font-bold'
        >
          {nextTab ? nextTab.label : 'Next'}
          <ChevronRightIcon className='size-3.5' />
        </Button>
      </div>
    </Tabs>
  )
}

export default ApplicationTabsNav
