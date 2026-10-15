// "Did you mean ...?" for the common typo'd email domains (gil.com, gmial.com,
// yahho.com ...). A hint only — it never blocks.

const COMMON_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'yahoo.in',
  'yahoo.co.in',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'rediffmail.com',
  'icloud.com',
  'protonmail.com'
]

function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)] as number[])

  for (let j = 1; j <= b.length; j++) dp[0][j] = j

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
  }

  return dp[a.length][b.length]
}

/** The corrected address if the domain looks like a typo of a popular one, else null. */
export function suggestEmail(value: string): string | null {
  const at = value.lastIndexOf('@')

  if (at < 1) return null

  const local = value.slice(0, at)
  const domain = value.slice(at + 1).toLowerCase()

  if (!domain.includes('.') || COMMON_DOMAINS.includes(domain)) return null

  let best: { domain: string; d: number } | null = null

  for (const candidate of COMMON_DOMAINS) {
    const d = distance(domain, candidate)

    if (d > 0 && d <= 2 && (!best || d < best.d)) best = { domain: candidate, d }
  }

  return best ? `${local}@${best.domain}` : null
}
