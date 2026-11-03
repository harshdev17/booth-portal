import type { ReactNode } from 'react'

// Deliberately a separate route group from src/app/police/layout.tsx — that
// layout wraps every route under /police (including, before this fix,
// /police/login itself) with "no session -> redirect('/police/login')".
// Applied to the login page, that redirect target is the login page
// itself: visiting /police/login while logged out hit the same layout's
// own check and bounced right back to /police/login — a self-redirect
// loop, worse right after a fresh login (redirect('/police/dashboard')
// lands back in the protected layout, which can momentarily see no
// session yet and send the browser to /police/login, which then
// self-loops the same way). Mirrors the existing (admin-auth) route group,
// which keeps /admin/login out of (admin)/layout.tsx's session check for
// the identical reason.
const PoliceAuthLayout = ({ children }: { children: ReactNode }) => {
  return <div className='h-full w-full'>{children}</div>
}

export default PoliceAuthLayout
