import bcrypt from 'bcryptjs'

// Cost factor 12 is a reasonable balance of security and latency for an
// interactive login on typical shared hosting. Revisit upward as hardware
// improves; never downward.
const BCRYPT_COST = 12

export async function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, BCRYPT_COST)
}

export async function verifyPassword(plainTextPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, hash)
}
