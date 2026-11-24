'use client'

import { useEffect, useRef } from 'react'

import { Input } from '@/components/ui/input'

/**
 * A text input inside a GET-form filter bar that submits the form on its
 * own, debounced, as the admin types — no separate "Filter" button needed
 * (matches AutoSubmitSelect's category/status dropdowns right next to it on
 * /admin/payments). Enter still submits immediately via the form's native
 * behavior; this only adds the debounced auto-submit on top.
 */
const AutoSubmitSearchInput = (props: React.ComponentProps<typeof Input>) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <Input
      {...props}
      onChange={e => {
        props.onChange?.(e)

        if (timeoutRef.current) clearTimeout(timeoutRef.current)

        const form = e.currentTarget.form

        timeoutRef.current = setTimeout(() => {
          form?.requestSubmit()
        }, 500)
      }}
    />
  )
}

export default AutoSubmitSearchInput
