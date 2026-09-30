import type { Metadata } from 'next'

import { redirect } from 'next/navigation'

import { UserIcon } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getSession } from '@/lib/auth/session'
import ChangePasswordForm from '@/views/admin/account/ChangePasswordForm'

export const metadata: Metadata = {
  title: 'My Account — IGM Admin Portal'
}

const initials = (fullName: string) =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')

const MyAccountPage = async () => {
  const session = await getSession()

  if (!session) redirect('/admin/login')

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>My Account</h1>
        <p className='text-sm text-muted-foreground'>View your account details and update your password.</p>
      </div>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <div className='flex items-center gap-4'>
            <Avatar className='size-12'>
              <AvatarFallback>{initials(session.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className='text-base font-bold text-[#0c2847]'>{session.fullName}</CardTitle>
              <CardDescription className='text-xs'>{session.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className='pt-6'>
          <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>Role</p>
          <p className='text-sm font-semibold text-slate-800'>{session.role.name}</p>
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <div className='flex items-center gap-2'>
            <UserIcon className='size-4 text-[#0c2847]' />
            <CardTitle className='text-base font-bold text-[#0c2847]'>Change Password</CardTitle>
          </div>
          <CardDescription className='text-xs'>
            You&apos;ll need to enter your current password to set a new one.
          </CardDescription>
        </CardHeader>
        <CardContent className='pt-6'>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}

export default MyAccountPage
