// Babel config for the Taro build (React + TypeScript + webpack5).
// The decision engine is plain TS and does not depend on this — it is
// transpiled by Vitest/esbuild for tests and by Taro's babel for the bundle.
module.exports = {
  presets: [
    ['taro', {
      framework: 'react',
      ts: true,
      compiler: 'webpack5',
    }],
  ],
}
