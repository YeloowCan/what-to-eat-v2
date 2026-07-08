/** Time port — injected so timestamps are deterministic in tests. */
export interface Clock {
  now(): number
}

/** Production clock — wraps `Date.now()` (a JS global, not a wx API). */
export class SystemClock implements Clock {
  now(): number {
    return Date.now()
  }
}

/** Test clock returning a fixed (advancable) time. */
export class FakeClock implements Clock {
  constructor(private current: number) {}
  now(): number {
    return this.current
  }
  advance(ms: number): void {
    this.current += ms
  }
}
