import fs from 'node:fs';
import { renderErrorPage, ERROR_CODES } from '../server/error-page.mjs';
const check=process.argv.includes('--check');
for(const code of ERROR_CODES){
  // Static core intentionally has no stale navigation/contact snapshot.
  const file=new URL(`../${code}.html`,import.meta.url), html=renderErrorPage(code);
  if(check){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==html)throw Error(`${code}.html is stale; run build:errors`);}
  else fs.writeFileSync(file,html);
}
console.log(`${check?'Verified':'Generated'} ${ERROR_CODES.length} error pages from one shared renderer.`);
