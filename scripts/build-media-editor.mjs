import fs from 'node:fs';
import { build } from 'esbuild';

await build({entryPoints:['src/admin/media-editor.js'],outfile:'admin/media-editor.js',bundle:true,format:'esm',minify:true,target:'es2020',legalComments:'eof',external:['/covermate-environment.mjs']});
fs.copyFileSync('node_modules/cropperjs/dist/cropper.min.css','admin/cropper.css');
console.log('Built lazy-loaded Admin media editor.');
