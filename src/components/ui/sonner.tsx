'use client'

import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from 'lucide-react'

// Hardcoded 'light' rather than reading next-themes' useTheme() — this
// portal has no dark theme anywhere (admin and public both ship light-mode
// CSS only), and next-themes unconditionally renders a raw <script> tag on
// every render with no prop to disable it (confirmed by reading its
// source), which is what was tripping React 19/Next 16's "script tag in a
// React component" console error (reported live, twice). Removing the
// next-themes dependency entirely removes the script, not just works
// around it.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme='light'
      className='toaster group'
      icons={{
        success: <CircleCheckIcon className='size-4' />,
        info: <InfoIcon className='size-4' />,
        warning: <TriangleAlertIcon className='size-4' />,
        error: <OctagonXIcon className='size-4' />,
        loading: <Loader2Icon className='size-4 animate-spin' />
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)'
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast'
        }
      }}
      {...props}
    />
  )
}

export { Toaster }
