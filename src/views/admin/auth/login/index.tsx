import Image from 'next/image'

// Components Import
import Logo from '@/components/shared/Logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import LoginForm from '@/views/admin/auth/login/login-form'

/**
 * Matches the KDB institutional theme used across the public site (warm
 * ivory canvas, navy, gold ornamental divider) instead of the AdminCN
 * template's generic decorative diamond-blob background, which had no
 * relation to the portal's actual visual identity.
 */
const AdminLogin = () => {
  return (
    <div
      className='relative flex h-auto min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-8'
      style={{
        backgroundColor: '#faf8f5',
        backgroundImage:
          'radial-gradient(circle at 12% 20%, rgba(12, 40, 71, 0.06) 0%, transparent 55%),' +
          'radial-gradient(circle at 88% 82%, rgba(216, 137, 29, 0.08) 0%, transparent 50%)'
      }}
    >
      <div className='absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#c88718] via-[#ffd56b] to-[#c88718]' />

      <Card className='z-1 w-full gap-6 rounded-2xl border-[#e2e8f0] py-6 shadow-xs sm:max-w-md'>
        <CardHeader className='gap-4 px-6 text-center'>
          <div className='flex justify-center'>
            <Logo className='gap-3' />
          </div>

          <Image
            src='/images/public/gita-mahotsav-gold-ornamental-divider.png'
            alt=''
            width={160}
            height={16}
            className='mx-auto h-auto w-32 object-contain opacity-80'
          />

          <div>
            <CardTitle className='mb-1.5 text-2xl font-bold text-[#0c2847]'>Admin Sign In</CardTitle>
            <CardDescription className='text-sm'>
              Kurukshetra Development Board — Booth/Stall Allotment Portal
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className='px-6'>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminLogin
