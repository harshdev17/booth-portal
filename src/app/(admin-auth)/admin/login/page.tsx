import type { Metadata } from 'next'

import { redirect } from 'next/navigation'

import { getSession } from '@/lib/auth/session'
import AdminLogin from '@/views/admin/auth/login'

export const metadata: Metadata = {
  title: 'Admin Sign In — KDB Admin Portal'
}

const LoginPage = async () => {
  const session = await getSession()

  // Already authenticated — don't show the login form again.
  if (session) redirect('/admin/dashboard')

  return <AdminLogin />
}

export default LoginPage
