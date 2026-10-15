import 'server-only'

import { resolve4, resolveMx } from 'node:dns/promises'

const LOOKUP_TIMEOUT_MS = 3000

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), LOOKUP_TIMEOUT_MS))
  ])
}

const NOT_FOUND = new Set(['ENOTFOUND', 'ENODATA', 'NXDOMAIN'])

/**
 * Free, third-party-free check that an email's domain can actually receive
 * mail (it has MX records, or at least an address record). It proves nothing
 * about the mailbox itself — only that e.g. "gil.com" typos for domains that
 * do not exist are caught. Fails OPEN on DNS/network trouble so a resolver
 * hiccup never blocks a real applicant.
 */
export async function emailDomainCanReceiveMail(email: string): Promise<boolean> {
  const domain = email.split('@')[1]?.toLowerCase()

  if (!domain) return false

  try {
    const mx = await withTimeout(resolveMx(domain))

    if (mx.length > 0) return true
  } catch (error) {
    if (!NOT_FOUND.has((error as NodeJS.ErrnoException).code ?? '')) return true
  }

  try {
    const addresses = await withTimeout(resolve4(domain))

    return addresses.length > 0
  } catch (error) {
    return !NOT_FOUND.has((error as NodeJS.ErrnoException).code ?? '')
  }
}
