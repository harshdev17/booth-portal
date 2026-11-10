import type { Metadata } from 'next'

import { redirect } from 'next/navigation'

import { getPostLoginRedirect } from '@/app/server/auth-actions'
import { getSession } from '@/lib/auth/session'
import AdminLogin from '@/views/admin/auth/login'

export const metadata: Metadata = {
  title: 'Admin Sign In — IGM Admin Portal'
}

const LoginPage = async () => {
  const session = await getSession()

  // Already authenticated — don't show the login form again. Redirect to
  // the first page this account can actually open, not hardcoded to
  // /admin/dashboard, since that's now gated by its own permission.
  if (session) redirect(await getPostLoginRedirect())

  return <AdminLogin />
}

export default LoginPage
