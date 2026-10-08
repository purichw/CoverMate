import { build } from 'esbuild';
await build({ entryPoints: ['src/admin/customer-workspace.mjs'], outfile: 'assets/admin-customers.js', bundle: true, format: 'esm', target: ['es2022'], minify: true, legalComments: 'none' });
console.log('Built customer workspace.');
