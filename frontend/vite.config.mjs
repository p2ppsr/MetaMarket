import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@bsv/wallet-toolbox-client/out/src/WalletSettingsManager': '@bsv/wallet-toolbox-client'
    }
  },
  build: {
    outDir: 'build'
  }
})
