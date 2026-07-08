/** Random number generator port — injected so picks are deterministic in tests. */
export interface Rng {
  /** Returns a float in [0, 1). */
  next(): number
}

/**
 * Deterministic, seedable RNG (mulberry32). Used in production (seeded per
 * session) and acceptable in tests where a known seed is wanted. Pure — no IO.
 */
export class SeededRng implements Rng {
  private state: number
  constructor(seed: number) {
    this.state = seed >>> 0
  }
  next(): number {
    this.state |= 0
    this.state = (this.state + 0x6d2b79f5) | 0
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Test RNG that returns a queued sequence of values, repeating the last once
 * exhausted. Lets a test assert exactly which candidate is picked.
 */
export class FakeRng implements Rng {
  private i = 0
  constructor(private readonly values: number[]) {}
  next(): number {
    const v = this.values[Math.min(this.i, this.values.length - 1)]
    this.i++
    return v
  }
}
