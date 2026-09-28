'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { login as loginUser } from '@/lib/auth/login'
import { destroySession } from '@/lib/auth/session'
import { isRateLimited } from '@/lib/auth/rate-limit'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required')
})

export type LoginFormState = {
  error?: string
  fieldErrors?: Partial<Record<'email' | 'password', string>>
}

async function getRequestMeta() {
  const headerList = await headers()

  // x-forwarded-for can be a comma-separated list; the first entry is the
  // original client per convention. This still trusts the proxy layer (the
  // hosting reverse proxy) to set it correctly — do not treat it as
  // cryptographically verified client identity.
  const forwardedFor = headerList.get('x-forwarded-for')
  const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : (headerList.get('x-real-ip') ?? undefined)
  const userAgent = headerList.get('user-agent') ?? undefined

  return { ipAddress, userAgent }
}

export async function loginAction(_prevState: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password')
  })

  if (!parsed.success) {
    const fieldErrors: LoginFormState['fieldErrors'] = {}

    for (const issue of parsed.error.issues) {
      const key = issue.path[0]

      if (key === 'email' || key === 'password') fieldErrors[key] = issue.message
    }

    return { fieldErrors }
  }

  const { ipAddress, userAgent } = await getRequestMeta()
  const rateLimitKey = ipAddress ?? 'unknown'

  if (isRateLimited(rateLimitKey)) {
    return { error: 'Too many attempts. Please wait a minute and try again.' }
  }

  const result = await loginUser(parsed.data.email, parsed.data.password, { ipAddress, userAgent })

  if (!result.ok) {
    const messages: Record<typeof result.error, string> = {
      invalid_credentials: 'Invalid email or password.',
      account_disabled: 'This account has been disabled. Contact your Super Admin.',
      account_locked: 'This account is temporarily locked due to repeated failed attempts. Try again later.'
    }

    return { error: messages[result.error] }
  }

  redirect('/admin/dashboard')
}

export async function logoutAction() {
  await destroySession()
  redirect('/admin/login')
}
