import { build } from 'esbuild';
await build({ entryPoints: ['src/telemetry.js'], outfile: 'assets/telemetry.js', bundle: true, minify: true, target: ['chrome100', 'safari16'], format: 'iife' });
console.log('Built privacy-preserving telemetry.');
