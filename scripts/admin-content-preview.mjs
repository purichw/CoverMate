import { startArticlesAdminPreview } from './articles-admin-preview.mjs';

// Local design data only; no Firebase connection and no writable endpoint.
const live = { config: { sections: [{ id: 'hero', type: 'hero' }] }, text: {}, updatedAt: '2026-09-29T07:30:00Z' };
const draft = { ...live, text: { 'preview.heading': 'ตัวอย่างฉบับร่างสำหรับตรวจดีไซน์' }, updatedAt: '2026-09-30T03:24:00Z' };
const { baseUrl } = await startArticlesAdminPreview({ cms: { live, draft, versions: [{ id: 'preview-version-1', ...live, ts: Date.parse(live.updatedAt) }] } });
console.log(baseUrl + '/admin#content\nLocal design preview only. Synthetic account and CMS data; no production connections or writes.');
