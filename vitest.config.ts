import { defineConfig } from 'vitest/config'

// The decision engine is the single pre-agreed automated test seam (see PRD
// "Testing Decisions"). It is pure TypeScript with no Taro / wx imports, so we
// scope Vitest to it for fast, hermetic feedback. UI and wx/Amap adapters are
// intentionally not unit-tested (manual verification per the PRD).
export default defineConfig({
  test: {
    include: ['src/engine/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
})
