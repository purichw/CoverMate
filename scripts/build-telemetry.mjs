import { build } from 'esbuild';
// Keep native dynamic imports without CommonJS interop helpers, and isolate globals.
await build({ entryPoints: ['src/telemetry.js'], outfile: 'assets/telemetry.js', bundle: true, minify: true, target: ['chrome100', 'safari16'], format: 'esm', banner: { js: '(()=>{' }, footer: { js: '})();' } });
await build({ entryPoints: ['src/runtime-diagnostics.js'], outfile: 'assets/runtime-diagnostics.js', bundle: true, minify: true, target: ['chrome100', 'safari16'], format: 'esm' });
console.log('Built privacy-preserving telemetry.');
