// Components Import
import Logo from '@/components/shared/Logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import LoginForm from '@/views/admin/auth/login/login-form'

// SVG Import
import AuthBackgroundShape from '@/assets/svg/auth-background-shape'

const AdminLogin = () => {
  return (
    <div className='relative flex h-auto min-h-screen items-center justify-center overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8'>
      <div className='absolute'>
        <AuthBackgroundShape />
      </div>

      <Card className='z-1 w-full gap-6 py-6 sm:max-w-md'>
        <CardHeader className='gap-6 px-6'>
          <Logo className='gap-3' />

          <div>
            <CardTitle className='mb-2 text-2xl font-semibold'>Admin Sign In</CardTitle>
            <CardDescription className='text-base'>
              Kurukshetra Development Board — Booth / Shop Allotment Portal
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
