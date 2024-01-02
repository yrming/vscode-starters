import fs from 'fs-extra'
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
  ],
  format: ['cjs'],
  shims: true,
  dts: false,
  external: [
    'vscode',
  ],
  async onSuccess() {
    fs.copySync('./node_modules/create-svelte/dist', './dist/dist', { overwrite: true });
  },
})
