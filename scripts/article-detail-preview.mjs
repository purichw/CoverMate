import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {startHomeArticlesPreview} from './home-articles-preview.mjs';
import {articleDetailFixture} from './fixtures/home-articles/detail-feed.mjs';

export const startArticleDetailPreview = options => startHomeArticlesPreview({feed:structuredClone(articleDetailFixture),details:structuredClone(articleDetailFixture),...options});
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const fixture=process.argv.find(arg=>arg.startsWith('--fixture='))?.slice(10);
  const state=fixture?JSON.parse(fs.readFileSync(fixture,'utf8')):undefined;
  const {baseUrl}=await startArticleDetailPreview({state});
  console.log('LOCAL PREVIEW: sample content only; no CMS writes or form submissions.');
  console.log(baseUrl+'/articles/health-insurance-checklist');
}
