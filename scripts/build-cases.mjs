import { build } from 'esbuild';
await build({ entryPoints: ['src/admin/case-work-ui.mjs'], outfile: 'assets/admin-case-work.js', bundle: true, format: 'esm', minify: true, target: 'es2022' });
console.log('Built Cases workspace UI.');
