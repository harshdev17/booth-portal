// React Imports
import type { ReactNode } from 'react'

// Component Imports
import { SidebarProvider } from './ui/sidebar'
import { TooltipProvider } from './ui/tooltip'

type Props = {
  children: ReactNode
  sidebarDefaultOpen?: boolean
}

// next-themes' ThemeProvider was removed entirely (not just configured off)
// — this portal has no dark theme anywhere (admin and public both ship
// light-mode CSS only), and next-themes unconditionally renders a raw
// <script> tag on every render with no prop to disable it (confirmed by
// reading its source), which is what was tripping React 19/Next 16's
// "script tag in a React component" console error (reported live, twice —
// an earlier attempt to just disable system-theme detection via props did
// not stop the script, since it isn't conditional on those props at all).
// sonner.tsx's Toaster now hardcodes theme='light' directly instead of
// reading next-themes' useTheme(), so nothing in the app still needs this
// provider.
const Providers = ({ children, sidebarDefaultOpen }: Props) => {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={sidebarDefaultOpen}>{children}</SidebarProvider>
    </TooltipProvider>
  )
}

export default Providers
