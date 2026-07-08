import { defineConfig } from '@tarojs/cli'
import devConfig from './dev'
import prodConfig from './prod'

// Taro build config. Compiles src/ (React + TS) to WeChat mini program (weapp)
// under dist/. The decision engine is consumed by the UI as a plain module.
export default defineConfig(async (merge) => {
  const baseConfig = {
    projectName: 'what-to-eat',
    date: '2025-07-08',
    designWidth: 750,
    deviceRatio: { 640: 2.34 / 2, 750: 1, 828: 1.81 / 2 },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [],
    defineConstants: {},
    copy: { patterns: [], options: {} },
    framework: 'react',
    compiler: { type: 'webpack5', prebundle: { enable: false } },
    mini: {
      postcss: {
        pxtransform: { enable: true, config: {} },
      },
    },
    h5: {},
  }
  return merge({}, baseConfig, process.env.NODE_ENV === 'development' ? devConfig : prodConfig)
})
