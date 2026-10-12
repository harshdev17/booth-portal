import { createHash, createHmac } from 'node:crypto'

/**
 * Provably fair pseudo-random number generator & shuffle utility.
 * Uses HMAC-SHA256 with server_seed + client_seed so outcomes
 * are completely deterministic, reproducible, and verifiable.
 */
export class ProvablyFairRandom {
  /**
   * Deterministic Knuth / Fisher-Yates shuffle.
   * Given the same items, serverSeed, and clientSeed, this will
   * ALWAYS return the exact same shuffled ordering.
   */
  public static shuffle<T>(items: T[], serverSeed: string, clientSeed: string): T[] {
    const list = [...items]
    let counter = 0

    const nextRandom = (): number => {
      const hmac = createHmac('sha256', serverSeed)

      hmac.update(`${clientSeed}:${counter++}`)
      const digest = hmac.digest()

      return digest.readUInt32BE(0) / 0xffffffff
    }

    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(nextRandom() * (i + 1))
      const temp = list[i]

      list[i] = list[j]
      list[j] = temp
    }

    return list
  }

  /**
   * Generates public SHA-256 hash of server seed for pre-draw commitment.
   */
  public static hashSeed(seed: string): string {
    return createHash('sha256').update(seed).digest('hex')
  }

  /**
   * Computes combined seed hash.
   */
  public static combineSeeds(serverSeed: string, clientSeed: string): string {
    return createHash('sha256').update(`${serverSeed}:${clientSeed}`).digest('hex')
  }
}
