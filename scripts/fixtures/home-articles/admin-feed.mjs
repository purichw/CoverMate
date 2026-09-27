import { homeArticleFixture } from './feed.mjs';

// Synthetic metadata only. No real author identities or unpublished CMS records.
export const adminArticleFixture = {
  available: true, complete: true, sample: true,
  items: [
    ...homeArticleFixture.items.map((item, index) => ({
      ...structuredClone(item), categoryId: ['motor', 'health', 'travel'][index],
      authorName: 'ทีม CoverMate (ตัวอย่าง)', updatedAt: `2026-09-${26 - index}T03:30:00.000Z`,
      status: index === 2 ? 'draft' : 'published'
    })),
    ...[
      ['sample-review', 'review-policy', 'ความรู้ทั่วไป', 'general', 'ทบทวนกรมธรรม์เดิม เริ่มดูตรงไหนดี', 'published', 'motor'],
      ['sample-group', 'group-health-cover', 'ประกันสุขภาพ', 'health', 'ประกันกลุ่ม (Group Health) ควรเช็กความคุ้มครองอะไรบ้าง', 'scheduled', 'health'],
      ['sample-renew', 'motor-renewal', 'ประกันรถยนต์', 'motor', 'ก่อนต่ออายุประกันรถยนต์ เตรียมข้อมูลอะไรบ้าง', 'draft', '']
    ].map(([id, slug, category, categoryId, title, status, image], index) => ({
      id, slug, status, categoryId, authorName: 'ทีม CoverMate (ตัวอย่าง)',
      updatedAt: `2026-09-${23 - index}T07:20:00.000Z`, scheduledAt: status === 'scheduled' ? '2026-10-01T02:00:00.000Z' : null,
      image: { src: image ? `assets/article-preview/${image}.jpg` : '' },
      translations: { th: { title, category, excerpt: 'เนื้อหาตัวอย่างสำหรับตรวจการแสดงผลรายการบทความ ก่อนเชื่อมต่อคลังบทความจริง' } }
    }))
  ]
};
