#! /usr/bin/env node
import { build } from 'esbuild';
import { execSync } from 'child_process';

const typeScriptDeclarationsPlugin = {
  name: 'TypeScriptDeclarationsPlugin',
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length > 0) return;
      console.log('[build] Creating Typescript Declaration Files');
      execSync('tsc');
    });
  },
};

(async () => {
  console.log('[build] Creating Module JS Files');
  await build({
    entryPoints: ['./src/index.ts'],
    outfile: './dist/index.mjs',
    format: 'esm',
    bundle: true,
    platform: 'node',
  });

  console.log('[build] Creating Common JS Files');
  await build({
    entryPoints: ['./src/index.ts'],
    outfile: './dist/index.js',
    format: 'cjs',
    bundle: true,
    platform: 'node',
    plugins: [typeScriptDeclarationsPlugin],
  });

  console.log('[build] Build Finished');
})();
