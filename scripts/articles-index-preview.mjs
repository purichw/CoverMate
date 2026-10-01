import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {startHomeArticlesPreview} from './home-articles-preview.mjs';
import {articleIndexFixture} from './fixtures/home-articles/index-feed.mjs';
import {articleDetailFixture} from './fixtures/home-articles/detail-feed.mjs';

export const startArticlesIndexPreview = options => startHomeArticlesPreview({feed:structuredClone(articleIndexFixture),details:structuredClone(articleDetailFixture),...options});
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const fixture=process.argv.find(arg=>arg.startsWith('--fixture='))?.slice(10);
  const state=fixture?JSON.parse(fs.readFileSync(fixture,'utf8')):undefined;
  const {baseUrl}=await startArticlesIndexPreview({state});
  console.log('LOCAL PREVIEW ONLY: sample articles; no CMS writes or real submissions.');
  console.log(baseUrl+'/articles');
}
