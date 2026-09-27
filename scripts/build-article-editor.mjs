import {build} from 'esbuild';
// Preserve Markdown hard-break whitespace in escaped strings, not literal lines.
await build({entryPoints:['src/admin/article-editor.mjs'],outfile:'admin/articles/editor.js',bundle:true,format:'esm',minify:true,target:'es2020',supported:{'template-literal':false},legalComments:'eof'});
console.log('Built lazy Article Editor.');
