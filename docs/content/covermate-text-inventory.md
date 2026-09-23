# CoverMate Website Page Text Inventory For ChatGPT Copy Review
Generated: 2026-09-09T04:30:15.060Z

Historical export: these rows and the companion JSON are a dated capture, not
the current CMS or source inventory. Before new copy work, read current Live/
Draft and regenerate the inventory; preserve this export's capture provenance.
See [current handoff](../HANDOFF.md).

## Source Precedence
1. `production-live` entries, when present, were captured from `https://covermateinsurance.com` and should be treated as the current visible public website source.
2. `repo-defaults` entries are the repository cold-start CMS payload. Firestore live content still prevails in production when it loads successfully.
3. Inline-editor overrides from Firestore/local production state are already applied into matching public rows when a live capture is provided.
4. This export includes Thai and English text that visitors can see on the public site: header, footer, brand/contact text, and public page sections.
5. SEO meta tags, private owner/editor UI, URLs, assets, theme tokens, hidden items, and implementation config are intentionally excluded.
## Product Guardrails For Rewriting
- Keep motor/company count at `14` where it refers to visible insurer logos.
- Do not change licence numbers: `6401006221`, `6804008544`, `5704011570`, or Thai legal licence `ว00287/2534` without explicit approval.
- Preserve the two public visitor entry points in the same CoverMate product: `/` is the full home page, `/motor` is the dedicated motor campaign page, and `/#motor` is only a legacy home alias into `#insurers`.
- Keep public analytics privacy-safe: no visitor names, phone numbers, LINE IDs, or freeform messages in GA4 copy/events.
## Suggested Prompt For ChatGPT
```text
You are helping refine CoverMate public website copy in Thai and English. Use the text inventory below.
Rewrite only entries whose copyKind is copy/short-label and editable is true.
Preserve meaning, trust, Thai naturalness, legal constraints, and the warm personal advisory tone.
Return a table with: ID, original, suggested rewrite, rationale, and risk/notes.
Do not rewrite protected legal/licence copy unless explicitly asked.
Do not invent private owner-interface copy; this export is public visitor-site copy only.
```
## Summary
```json
{
  "totalEntries": 581,
  "editableEntries": 566,
  "protectedEntries": 10,
  "bySource": {
    "repo-defaults": 581
  },
  "bySurface": {
    "brand": 8,
    "contact": 8,
    "public-header": 11,
    "public-footer": 4,
    "public-section": 550
  },
  "byLanguage": {
    "th": 236,
    "en": 290,
    "mixed": 40,
    "neutral": 15
  },
  "byCopyKind": {
    "copy": 551,
    "protected": 10,
    "contact-or-number": 5,
    "short-label": 15
  }
}
```
## Visible Public Page Section Copy

| ID | Lang | Surface | Path/Field | Current text | Guidance |
| --- | --- | --- | --- | --- | --- |
| `repo-defaults:sections.0.th.kicker` | th | public-section | sections.0.th.kicker | ปรึกษาเบื้องต้นโดยไม่มีค่าใช้จ่าย · กรุงเทพฯ | Candidate for copy refinement. |
| `repo-defaults:sections.0.th.title` | th | public-section | sections.0.th.title | เรื่องความเสี่ยง<br>ไม่จำเป็นต้องจัดการเพียงลำพัง | Candidate for copy refinement. |
| `repo-defaults:sections.0.th.body` | mixed | public-section | sections.0.th.body | ประกันชีวิตและสุขภาพดำเนินการผ่าน AIA ส่วนประกันรถยนต์ เราเปรียบเทียบความคุ้มครองและเบี้ยประกันจากบริษัทประกันภัย 14 แห่ง เพื่อช่วยให้คุณเลือกความคุ้มครองที่เหมาะสม โดยไม่เสนอเกินความจำเป็น | Candidate for copy refinement. |
| `repo-defaults:sections.0.th.cta1` | mixed | public-section | sections.0.th.cta1 | ติดต่อเราทาง LINE | Candidate for copy refinement. |
| `repo-defaults:sections.0.th.cta2` | th | public-section | sections.0.th.cta2 | ประเมินความคุ้มครอง | Candidate for copy refinement. |
| `repo-defaults:sections.0.th.note` | th | public-section | sections.0.th.note | เราตอบกลับทุกข้อความด้วยตนเองภายในเวลาทำการ | Candidate for copy refinement. |
| `repo-defaults:sections.0.th.claimText` | th | public-section | sections.0.th.claimText | เกิดอุบัติเหตุอยู่ตอนนี้ โทร 1669 ก่อนเสมอ แล้วค่อยติดต่อเรา | Candidate for copy refinement. |
| `repo-defaults:sections.0.th.claimLinkText` | th | public-section | sections.0.th.claimLinkText | ดูขั้นตอนเมื่อเกิดเหตุ | Candidate for copy refinement. |
| `repo-defaults:sections.0.en.kicker` | en | public-section | sections.0.en.kicker | Complimentary consultation · Bangkok | Candidate for copy refinement. |
| `repo-defaults:sections.0.en.title` | en | public-section | sections.0.en.title | You do not have to<br>manage risk alone | Candidate for copy refinement. |
| `repo-defaults:sections.0.en.body` | en | public-section | sections.0.en.body | For life and health insurance, we arrange cover through AIA. For motor insurance, we compare options from 14 insurers to help you choose suitable protection without unnecessary extras. | Candidate for copy refinement. |
| `repo-defaults:sections.0.en.cta1` | en | public-section | sections.0.en.cta1 | Contact us on LINE | Candidate for copy refinement. |
| `repo-defaults:sections.0.en.cta2` | en | public-section | sections.0.en.cta2 | Estimate your cover | Candidate for copy refinement. |
| `repo-defaults:sections.0.en.note` | en | public-section | sections.0.en.note | We respond personally to every message during business hours. | Candidate for copy refinement. |
| `repo-defaults:sections.0.en.claimText` | en | public-section | sections.0.en.claimText | In an accident right now, call 1669 first, then contact us | Candidate for copy refinement. |
| `repo-defaults:sections.0.en.claimLinkText` | en | public-section | sections.0.en.claimLinkText | See the accident guide | Candidate for copy refinement. |
| `repo-defaults:sections.1.items.0.th.label` | th | public-section | sections.1.items.0.th.label | แนะนำตามความจำเป็น | Candidate for copy refinement. |
| `repo-defaults:sections.1.items.0.en.label` | en | public-section | sections.1.items.0.en.label | Advice based on your needs | Candidate for copy refinement. |
| `repo-defaults:sections.1.items.1.th.label` | mixed | public-section | sections.1.items.1.th.label | ประกันชีวิตและสุขภาพผ่าน AIA | Candidate for copy refinement. |
| `repo-defaults:sections.1.items.1.en.label` | en | public-section | sections.1.items.1.en.label | AIA life and health cover | Candidate for copy refinement. |
| `repo-defaults:sections.1.items.2.th.label` | mixed | public-section | sections.1.items.2.th.label | ติดต่อสะดวกทาง LINE | Candidate for copy refinement. |
| `repo-defaults:sections.1.items.2.en.label` | en | public-section | sections.1.items.2.en.label | Easy to reach on LINE | Candidate for copy refinement. |
| `repo-defaults:sections.1.items.3.th.label` | th | public-section | sections.1.items.3.th.label | ดูแลต่อเนื่องถึงการเคลม | Candidate for copy refinement. |
| `repo-defaults:sections.1.items.3.en.label` | en | public-section | sections.1.items.3.en.label | Support through claims | Candidate for copy refinement. |
| `repo-defaults:sections.2.th.kicker` | th | public-section | sections.2.th.kicker | สิ่งที่เราดูแลให้ได้ | Candidate for copy refinement. |
| `repo-defaults:sections.2.th.title` | th | public-section | sections.2.th.title | ความคุ้มครอง<br>ที่เราช่วยจัดให้ได้ | Candidate for copy refinement. |
| `repo-defaults:sections.2.th.body` | mixed | public-section | sections.2.th.body | ประกันชีวิตและสุขภาพดำเนินการผ่าน AIA ส่วนประกันรถยนต์ให้บริการในฐานะนายหน้า หากคุณมีกรมธรรม์อยู่แล้ว เรายินดีช่วยตรวจสอบความคุ้มครองที่อาจซ้ำซ้อนหรือส่วนที่อาจยังขาด โดยไม่มีค่าใช้จ่าย | Candidate for copy refinement. |
| `repo-defaults:sections.2.en.kicker` | en | public-section | sections.2.en.kicker | What we can arrange | Candidate for copy refinement. |
| `repo-defaults:sections.2.en.title` | en | public-section | sections.2.en.title | The cover we can<br>arrange | Candidate for copy refinement. |
| `repo-defaults:sections.2.en.body` | en | public-section | sections.2.en.body | Life and health insurance is arranged through AIA, while motor insurance is handled in a broker capacity. If you already have cover, we can review it for potential gaps or overlap at no charge. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.0.th.title` | th | public-section | sections.2.items.0.th.title | ประกันชีวิต | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.0.th.sub` | mixed | public-section | sections.2.items.0.th.sub | ตัวแทน AIA · ครอบครัว ออม เกษียณ | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.0.th.b1` | th | public-section | sections.2.items.0.th.b1 | แบบตลอดชีพและชั่วระยะเวลา สำหรับผู้ที่มีคนพึ่งพารายได้ของคุณ | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.0.th.b2` | th | public-section | sections.2.items.0.th.b2 | แบบสะสมทรัพย์และบำนาญสามารถใช้สิทธิลดหย่อนภาษีได้ตามเงื่อนไขที่กฎหมายกำหนด | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.0.th.b3` | th | public-section | sections.2.items.0.th.b3 | โรคร้ายแรงจ่ายผลประโยชน์เป็นเงินก้อนเมื่อตรวจพบโรคที่อยู่ภายใต้ความคุ้มครอง | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.0.th.note` | th | public-section | sections.2.items.0.th.note | ไม่รวมแบบประกันควบการลงทุน (ยูนิตลิงก์) | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.0.en.title` | en | public-section | sections.2.items.0.en.title | Life | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.0.en.sub` | en | public-section | sections.2.items.0.en.sub | AIA agent · family, savings, retirement | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.0.en.b1` | en | public-section | sections.2.items.0.en.b1 | Whole-life and term cover for people whose family depends on their income. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.0.en.b2` | en | public-section | sections.2.items.0.en.b2 | Savings and annuity plans may qualify for tax deductions, subject to applicable rules. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.0.en.b3` | en | public-section | sections.2.items.0.en.b3 | Critical illness benefits pay a lump sum when a covered illness is diagnosed. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.0.en.note` | en | public-section | sections.2.items.0.en.note | Unit-linked plans are not offered. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.1.th.title` | th | public-section | sections.2.items.1.th.title | ประกันสุขภาพ | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.1.th.sub` | mixed | public-section | sections.2.items.1.th.sub | ตัวแทน AIA · เหมาจ่าย โรคร้ายแรง ชดเชย | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.1.th.b1` | th | public-section | sections.2.items.1.th.b1 | แบบเหมาจ่ายด้วยวงเงินรวม ช่วยลดข้อจำกัดจากการกำหนดวงเงินย่อยในแต่ละรายการ | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.1.th.b2` | th | public-section | sections.2.items.1.th.b2 | เลือกค่าห้องให้สอดคล้องกับโรงพยาบาลที่คุณมีแนวโน้มใช้จริง | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.1.th.b3` | th | public-section | sections.2.items.1.th.b3 | ค่าชดเชยรายวันช่วยรองรับรายได้ที่อาจหายไประหว่างพักรักษาตัว | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.1.en.title` | en | public-section | sections.2.items.1.en.title | Health | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.1.en.sub` | en | public-section | sections.2.items.1.en.sub | AIA agent · lump-sum, CI, income | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.1.en.b1` | en | public-section | sections.2.items.1.en.b1 | Aggregate-limit plans can reduce the restrictions created by item-by-item caps. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.1.en.b2` | en | public-section | sections.2.items.1.en.b2 | Room benefits should match the hospitals you are likely to use. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.1.en.b3` | en | public-section | sections.2.items.1.en.b3 | Daily cash benefits can help replace income while you are recovering. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.2.th.title` | th | public-section | sections.2.items.2.th.title | โรคร้ายแรง | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.2.th.sub` | mixed | public-section | sections.2.items.2.th.sub | ตัวแทน AIA · จ่ายก้อนเมื่อตรวจเจอ | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.2.th.b1` | th | public-section | sections.2.items.2.th.b1 | รับผลประโยชน์เป็นเงินก้อนเมื่อตรวจพบโรคที่อยู่ภายใต้ความคุ้มครอง โดยไม่ต้องใช้ใบเสร็จค่ารักษาในการเบิกผลประโยชน์ | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.2.th.b2` | th | public-section | sections.2.items.2.th.b2 | ความคุ้มครองครอบคลุมกลุ่มโรคสำคัญ เช่น มะเร็ง หลอดเลือดสมอง และหัวใจ ตามเงื่อนไขของแบบประกัน | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.2.th.b3` | th | public-section | sections.2.items.2.th.b3 | ช่วยรองรับค่าใช้จ่ายหรือรายได้ที่อาจหายไประหว่างการรักษาและพักฟื้น | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.2.en.title` | en | public-section | sections.2.items.2.en.title | Critical illness | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.2.en.sub` | en | public-section | sections.2.items.2.en.sub | AIA agent · lump sum on diagnosis | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.2.en.b1` | en | public-section | sections.2.items.2.en.b1 | A lump-sum benefit is paid when a covered illness is diagnosed, without requiring medical receipts for that benefit. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.2.en.b2` | en | public-section | sections.2.items.2.en.b2 | Cover can include major illness groups such as cancer, stroke and heart conditions, subject to plan terms. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.2.en.b3` | en | public-section | sections.2.items.2.en.b3 | It can help with expenses or lost income during treatment and recovery. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.3.th.title` | th | public-section | sections.2.items.3.th.title | อุบัติเหตุส่วนบุคคล | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.3.th.sub` | mixed | public-section | sections.2.items.3.th.sub | ตัวแทน AIA · คุ้มครอง 24 ชม. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.3.th.b1` | th | public-section | sections.2.items.3.th.b1 | คุ้มครองอุบัติเหตุตลอด 24 ชั่วโมง ทั้งที่ทำงาน บนถนน หรือที่บ้าน | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.3.th.b2` | th | public-section | sections.2.items.3.th.b2 | รองรับค่ารักษาจากอุบัติเหตุ ผลประโยชน์จากการบาดเจ็บ และทุพพลภาพถาวรตามเงื่อนไขกรมธรรม์ | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.3.th.b3` | th | public-section | sections.2.items.3.th.b3 | เบี้ยประกันโดยทั่วไปเข้าถึงได้ง่ายและขั้นตอนการสมัครไม่ซับซ้อน เหมาะสำหรับผู้ที่ต้องการเริ่มต้นความคุ้มครองอุบัติเหตุ | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.3.en.title` | en | public-section | sections.2.items.3.en.title | Personal accident | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.3.en.sub` | en | public-section | sections.2.items.3.en.sub | AIA agent · 24-hour protection | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.3.en.b1` | en | public-section | sections.2.items.3.en.b1 | Accident cover applies around the clock, whether at work, on the road or at home. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.3.en.b2` | en | public-section | sections.2.items.3.en.b2 | It can support medical expenses, injury benefits and permanent disability benefits, subject to policy terms. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.3.en.b3` | en | public-section | sections.2.items.3.en.b3 | Premiums are generally accessible and the application process is straightforward for first accident cover. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.4.th.title` | th | public-section | sections.2.items.4.th.title | บำนาญ | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.4.th.sub` | mixed | public-section | sections.2.items.4.th.sub | ตัวแทน AIA · รายได้ยามเกษียณ | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.4.th.b1` | th | public-section | sections.2.items.4.th.b1 | เปลี่ยนเงินออมเป็นรายได้ประจำในวัยเกษียณตามรูปแบบและเงื่อนไขของแผน | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.4.th.b2` | th | public-section | sections.2.items.4.th.b2 | สามารถใช้สิทธิลดหย่อนภาษีเพิ่มเติมได้ตามเพดานและเงื่อนไขของกรมสรรพากร | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.4.th.b3` | th | public-section | sections.2.items.4.th.b3 | เริ่มวางแผนเร็วช่วยให้มีเวลาสะสมทุนและจัดระดับรายได้ในอนาคตได้เป็นระบบขึ้น | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.4.en.title` | en | public-section | sections.2.items.4.en.title | Annuity | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.4.en.sub` | en | public-section | sections.2.items.4.en.sub | AIA agent · income for retirement | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.4.en.b1` | en | public-section | sections.2.items.4.en.b1 | Turns savings into scheduled retirement income according to the plan structure. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.4.en.b2` | en | public-section | sections.2.items.4.en.b2 | May qualify for additional tax deductions, subject to Revenue Department limits and conditions. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.4.en.b3` | en | public-section | sections.2.items.4.en.b3 | Starting earlier gives more time to build capital and plan future income. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.5.th.title` | th | public-section | sections.2.items.5.th.title | ประกันรถยนต์ | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.5.th.sub` | th | public-section | sections.2.items.5.th.sub | ชั้น 1–3 · พ.ร.บ. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.5.th.b1` | th | public-section | sections.2.items.5.th.b1 | ในฐานะนายหน้า เราสามารถเปรียบเทียบข้อเสนอสำหรับรถคันเดียวกันจากบริษัทประกันภัย 14 แห่งในรอบเดียว | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.5.th.b2` | th | public-section | sections.2.items.5.th.b2 | ครอบคลุมภาคสมัครใจชั้น 1–3 และ พ.ร.บ. พร้อมช่วยพิจารณาทุนประกันและค่าเสียหายส่วนแรกให้เหมาะกับการใช้รถ | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.5.th.b3` | th | public-section | sections.2.items.5.th.b3 | ช่วยเตือนต่ออายุล่วงหน้าและจัดทำข้อมูลเปรียบเทียบใหม่ให้พิจารณาในแต่ละปี | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.5.en.title` | en | public-section | sections.2.items.5.en.title | Motor insurance | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.5.en.sub` | en | public-section | sections.2.items.5.en.sub | Class 1–3 · compulsory | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.5.en.b1` | en | public-section | sections.2.items.5.en.b1 | As a broker, we can compare options for the same vehicle across 14 insurers in one review. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.5.en.b2` | en | public-section | sections.2.items.5.en.b2 | Voluntary Class 1–3 and compulsory cover can be reviewed with suitable sums insured and excess levels. | Candidate for copy refinement. |
| `repo-defaults:sections.2.items.5.en.b3` | en | public-section | sections.2.items.5.en.b3 | We help with renewal reminders and provide a fresh comparison each year. | Candidate for copy refinement. |
| `repo-defaults:sections.3.th.kicker` | th | public-section | sections.3.th.kicker | ไม่มีค่าใช้จ่าย · ไม่ต้องย้ายบริษัท | Candidate for copy refinement. |
| `repo-defaults:sections.3.th.title` | th | public-section | sections.3.th.title | ส่งกรมธรรม์เดิมมา<br>เราช่วยตรวจให้โดยไม่มีค่าใช้จ่าย | Candidate for copy refinement. |
| `repo-defaults:sections.3.th.body` | mixed | public-section | sections.3.th.body | ส่งภาพหน้าตารางกรมธรรม์ทาง LINE โดยไม่ต้องกรอกแบบฟอร์ม เราจะช่วยตรวจสอบว่าปัจจุบันมีความคุ้มครองอะไรอยู่ มีส่วนใดที่อาจยังขาดหรือซ้ำซ้อน และสรุปประเด็นสำคัญกลับให้เป็นภาษาที่เข้าใจง่าย | Candidate for copy refinement. |
| `repo-defaults:sections.3.th.cta1` | mixed | public-section | sections.3.th.cta1 | ส่งกรมธรรม์ทาง LINE | Candidate for copy refinement. |
| `repo-defaults:sections.3.th.note` | th | public-section | sections.3.th.note | หากความคุ้มครองเดิมของคุณเหมาะสมอยู่แล้ว เราจะแจ้งให้ทราบอย่างตรงไปตรงมา และจะไม่แนะนำให้เปลี่ยนหรือยกเลิกกรมธรรม์เดิมโดยไม่มีเหตุผลที่เหมาะสม | Candidate for copy refinement. |
| `repo-defaults:sections.3.en.kicker` | en | public-section | sections.3.en.kicker | No charge · no need to switch | Candidate for copy refinement. |
| `repo-defaults:sections.3.en.title` | en | public-section | sections.3.en.title | Send us your existing policy<br>for a complimentary review | Candidate for copy refinement. |
| `repo-defaults:sections.3.en.body` | en | public-section | sections.3.en.body | Send a clear photograph of the policy schedule on LINE. We will review your existing benefits, identify potential gaps or overlap, and return a concise summary in plain language. | Candidate for copy refinement. |
| `repo-defaults:sections.3.en.cta1` | en | public-section | sections.3.en.cta1 | Send your policy on LINE | Candidate for copy refinement. |
| `repo-defaults:sections.3.en.note` | en | public-section | sections.3.en.note | If your existing cover is already suitable, we will say so clearly. We will not recommend replacing a good policy without an appropriate reason. | Candidate for copy refinement. |
| `repo-defaults:sections.3.items.0.th.title` | th | public-section | sections.3.items.0.th.title | ส่งอะไรมา | Candidate for copy refinement. |
| `repo-defaults:sections.3.items.0.th.body` | th | public-section | sections.3.items.0.th.body | หน้าตารางกรมธรรม์ที่แสดงทุนประกันและความคุ้มครอง ไม่ว่าจะเป็นรถ ชีวิต หรือสุขภาพ ถ่ายด้วยมือถือให้ชัดเจนก็เพียงพอ | Candidate for copy refinement. |
| `repo-defaults:sections.3.items.0.en.title` | en | public-section | sections.3.items.0.en.title | What to send | Candidate for copy refinement. |
| `repo-defaults:sections.3.items.0.en.body` | en | public-section | sections.3.items.0.en.body | The schedule page showing sums insured and benefits for motor, life or health cover. A clear phone photograph is enough. | Candidate for copy refinement. |
| `repo-defaults:sections.3.items.1.th.title` | th | public-section | sections.3.items.1.th.title | เราตรวจอะไรให้ | Candidate for copy refinement. |
| `repo-defaults:sections.3.items.1.th.body` | th | public-section | sections.3.items.1.th.body | ทุนประกันสัมพันธ์กับภาระจริงหรือไม่ ค่าห้องเหมาะกับโรงพยาบาลที่คุณใช้หรือเปล่า มีความคุ้มครองซ้ำซ้อนตรงไหน และมีส่วนใดที่ยังอาจขาด | Candidate for copy refinement. |
| `repo-defaults:sections.3.items.1.en.title` | en | public-section | sections.3.items.1.en.title | What we review | Candidate for copy refinement. |
| `repo-defaults:sections.3.items.1.en.body` | en | public-section | sections.3.items.1.en.body | Whether sums insured match your obligations, whether room benefits fit the hospital you use, where policies may overlap, and where protection may still be missing. | Candidate for copy refinement. |
| `repo-defaults:sections.3.items.2.th.title` | th | public-section | sections.3.items.2.th.title | ได้อะไรกลับ | Candidate for copy refinement. |
| `repo-defaults:sections.3.items.2.th.body` | th | public-section | sections.3.items.2.th.body | สรุปเป็นภาษาที่เข้าใจง่าย ว่าประเด็นใดควรพิจารณาก่อน เรื่องใดรอได้ และจุดใดที่ยังเหมาะสมอยู่แล้ว | Candidate for copy refinement. |
| `repo-defaults:sections.3.items.2.en.title` | en | public-section | sections.3.items.2.en.title | What you receive | Candidate for copy refinement. |
| `repo-defaults:sections.3.items.2.en.body` | en | public-section | sections.3.items.2.en.body | A plain-language summary of what to consider first, what can wait, and what already appears suitable. | Candidate for copy refinement. |
| `repo-defaults:sections.4.th.kicker` | th | public-section | sections.4.th.kicker | ทำงานกันอย่างไร | Candidate for copy refinement. |
| `repo-defaults:sections.4.th.title` | th | public-section | sections.4.th.title | ขั้นตอน<br>การทำงานร่วมกัน | Candidate for copy refinement. |
| `repo-defaults:sections.4.en.kicker` | en | public-section | sections.4.en.kicker | How it works | Candidate for copy refinement. |
| `repo-defaults:sections.4.en.title` | en | public-section | sections.4.en.title | How we<br>work together | Candidate for copy refinement. |
| `repo-defaults:sections.4.items.0.th.title` | mixed | public-section | sections.4.items.0.th.title | ติดต่อทาง LINE | Candidate for copy refinement. |
| `repo-defaults:sections.4.items.0.th.body` | th | public-section | sections.4.items.0.th.body | ส่งคำถามที่ต้องการทราบมาได้เลย ไม่ต้องเตรียมเอกสาร และไม่มีข้อผูกมัดในการดำเนินการต่อ | Candidate for copy refinement. |
| `repo-defaults:sections.4.items.0.en.title` | en | public-section | sections.4.items.0.en.title | Contact us on LINE | Candidate for copy refinement. |
| `repo-defaults:sections.4.items.0.en.body` | en | public-section | sections.4.items.0.en.body | Send us the question you would like to discuss. There is nothing to prepare and no obligation to proceed. | Candidate for copy refinement. |
| `repo-defaults:sections.4.items.1.th.title` | th | public-section | sections.4.items.1.th.title | พูดคุยเบื้องต้น | Candidate for copy refinement. |
| `repo-defaults:sections.4.items.1.th.body` | th | public-section | sections.4.items.1.th.body | พูดคุยเรื่องรายได้ ภาระ และสิ่งที่คุณให้ความสำคัญ เพื่อประเมินระดับความคุ้มครองที่เหมาะสม | Candidate for copy refinement. |
| `repo-defaults:sections.4.items.1.en.title` | en | public-section | sections.4.items.1.en.title | Initial consultation | Candidate for copy refinement. |
| `repo-defaults:sections.4.items.1.en.body` | en | public-section | sections.4.items.1.en.body | We discuss your income, obligations and priorities to understand what level of cover may be appropriate. | Candidate for copy refinement. |
| `repo-defaults:sections.4.items.2.th.title` | th | public-section | sections.4.items.2.th.title | เปรียบเทียบทางเลือก | Candidate for copy refinement. |
| `repo-defaults:sections.4.items.2.th.body` | th | public-section | sections.4.items.2.th.body | เราจัดทำข้อมูลเปรียบเทียบ พร้อมอธิบายความแตกต่างของความคุ้มครอง เบี้ยประกัน และเงื่อนไขสำคัญ | Candidate for copy refinement. |
| `repo-defaults:sections.4.items.2.en.title` | en | public-section | sections.4.items.2.en.title | Compare the options | Candidate for copy refinement. |
| `repo-defaults:sections.4.items.2.en.body` | en | public-section | sections.4.items.2.en.body | We prepare a clear comparison and explain the differences in cover, premium and key conditions. | Candidate for copy refinement. |
| `repo-defaults:sections.4.items.3.th.title` | th | public-section | sections.4.items.3.th.title | ดูแลต่อเนื่อง | Candidate for copy refinement. |
| `repo-defaults:sections.4.items.3.th.body` | th | public-section | sections.4.items.3.th.body | เราช่วยประสานงานเรื่องการต่ออายุ การแก้ไขกรมธรรม์ และการเคลมกับบริษัทประกันภัยอย่างต่อเนื่อง | Candidate for copy refinement. |
| `repo-defaults:sections.4.items.3.en.title` | en | public-section | sections.4.items.3.en.title | Ongoing service | Candidate for copy refinement. |
| `repo-defaults:sections.4.items.3.en.body` | en | public-section | sections.4.items.3.en.body | We assist with renewals, policy changes and claim coordination throughout the policy term. | Candidate for copy refinement. |
| `repo-defaults:sections.5.th.kicker` | th | public-section | sections.5.th.kicker | ประกันรถยนต์ · ในฐานะนายหน้า | Candidate for copy refinement. |
| `repo-defaults:sections.5.th.title` | th | public-section | sections.5.th.title | ประกันรถยนต์<br>เปรียบเทียบได้ 14 แห่ง | Candidate for copy refinement. |
| `repo-defaults:sections.5.th.body` | mixed | public-section | sections.5.th.body | สำหรับประกันรถยนต์ เราสามารถเปรียบเทียบข้อเสนอจากบริษัทประกันภัย 14 แห่ง เพื่อพิจารณาทางเลือกที่เหมาะสมกับคุณ ส่วนประกันชีวิตและสุขภาพดำเนินการผ่าน AIA | Candidate for copy refinement. |
| `repo-defaults:sections.5.th.cta1` | th | public-section | sections.5.th.cta1 | ดูหน้าประกันรถยนต์โดยเฉพาะ | Candidate for copy refinement. |
| `repo-defaults:sections.5.en.kicker` | en | public-section | sections.5.en.kicker | Motor insurance · as a broker | Candidate for copy refinement. |
| `repo-defaults:sections.5.en.title` | en | public-section | sections.5.en.title | Motor insurance<br>compared across 14 insurers | Candidate for copy refinement. |
| `repo-defaults:sections.5.en.body` | en | public-section | sections.5.en.body | For motor insurance, we compare options from 14 insurers. Life and health insurance is arranged through AIA. | Candidate for copy refinement. |
| `repo-defaults:sections.5.en.cta1` | en | public-section | sections.5.en.cta1 | Open the dedicated motor page | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.0.th.name` | th | public-section | sections.5.items.0.th.name | วิริยะประกันภัย | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.0.en.name` | en | public-section | sections.5.items.0.en.name | Viriyah | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.1.th.name` | th | public-section | sections.5.items.1.th.name | กรุงเทพประกันภัย | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.1.en.name` | en | public-section | sections.5.items.1.en.name | Bangkok Insurance | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.2.th.name` | th | public-section | sections.5.items.2.th.name | โตเกียวมารีนประกันภัย | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.2.en.name` | en | public-section | sections.5.items.2.en.name | Tokio Marine | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.3.th.name` | th | public-section | sections.5.items.3.th.name | อลิอันซ์ อยุธยา | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.3.en.name` | en | public-section | sections.5.items.3.en.name | Allianz Ayudhya | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.4.th.name` | th | public-section | sections.5.items.4.th.name | เทเวศประกันภัย | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.4.en.name` | en | public-section | sections.5.items.4.en.name | Deves | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.5.th.name` | th | public-section | sections.5.items.5.th.name | เมืองไทยประกันภัย | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.5.en.name` | en | public-section | sections.5.items.5.en.name | Muang Thai | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.6.th.name` | th | public-section | sections.5.items.6.th.name | ธนชาตประกันภัย | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.6.en.name` | en | public-section | sections.5.items.6.en.name | Thanachart | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.7.th.name` | th | public-section | sections.5.items.7.th.name | ทิพยประกันภัย | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.7.en.name` | en | public-section | sections.5.items.7.en.name | Dhipaya | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.8.th.name` | th | public-section | sections.5.items.8.th.name | ชับบ์สามัคคีประกันภัย | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.8.en.name` | en | public-section | sections.5.items.8.en.name | Chubb Samaggi | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.9.th.name` | th | public-section | sections.5.items.9.th.name | แอกซ่าประกันภัย | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.9.en.name` | en | public-section | sections.5.items.9.en.name | AXA | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.10.th.name` | mixed | public-section | sections.5.items.10.th.name | MSIG ประกันภัย | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.10.en.name` | en | public-section | sections.5.items.10.en.name | MSIG | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.11.th.name` | th | public-section | sections.5.items.11.th.name | นวกิจประกันภัย | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.11.en.name` | en | public-section | sections.5.items.11.en.name | Navakij | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.12.th.name` | th | public-section | sections.5.items.12.th.name | ไอโออิ กรุงเทพ ประกันภัย | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.12.en.name` | en | public-section | sections.5.items.12.en.name | Aioi Bangkok Insurance | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.13.th.name` | th | public-section | sections.5.items.13.th.name | ซมโปะประกันภัย | Candidate for copy refinement. |
| `repo-defaults:sections.5.items.13.en.name` | en | public-section | sections.5.items.13.en.name | Sompo | Candidate for copy refinement. |
| `repo-defaults:sections.5.cards.0.th.kicker` | th | public-section | sections.5.cards.0.th.kicker | ประกันชีวิต+สุขภาพ · ในฐานะตัวแทน | Candidate for copy refinement. |
| `repo-defaults:sections.5.cards.0.th.title` | mixed | public-section | sections.5.cards.0.th.title | ตัวแทน AIA อย่างเป็นทางการ | Candidate for copy refinement. |
| `repo-defaults:sections.5.cards.0.en.kicker` | en | public-section | sections.5.cards.0.en.kicker | Life & health · as an agent | Candidate for copy refinement. |
| `repo-defaults:sections.5.cards.0.en.title` | en | public-section | sections.5.cards.0.en.title | Official AIA agent | Candidate for copy refinement. |
| `repo-defaults:sections.5.cards.1.th.kicker` | th | public-section | sections.5.cards.1.th.kicker | ประกันรถยนต์ · ในฐานะนายหน้า | Candidate for copy refinement. |
| `repo-defaults:sections.5.cards.1.th.title` | mixed | public-section | sections.5.cards.1.th.title | ศรีกรุงโบรคเกอร์ · Srikrung Broker | Candidate for copy refinement. |
| `repo-defaults:sections.5.cards.1.en.kicker` | en | public-section | sections.5.cards.1.en.kicker | Motor cover · as a broker | Candidate for copy refinement. |
| `repo-defaults:sections.5.cards.1.en.title` | mixed | public-section | sections.5.cards.1.en.title | ศรีกรุงโบรคเกอร์ · Srikrung Broker | Candidate for copy refinement. |
| `repo-defaults:sections.6.th.kicker` | th | public-section | sections.6.th.kicker | เครื่องมือและข้อมูลที่เป็นประโยชน์ | Candidate for copy refinement. |
| `repo-defaults:sections.6.th.title` | th | public-section | sections.6.th.title | ประเมินความต้องการ<br>คุ้มครองเบื้องต้น | Candidate for copy refinement. |
| `repo-defaults:sections.6.th.body` | th | public-section | sections.6.th.body | เครื่องมือนี้แยกการประเมินเป็นสามส่วน: ทุนชีวิตจากค่าใช้จ่ายจำเป็นและปีที่ครอบครัวต้องพึ่งพา, ส่วนต่างค่าห้องอ้างอิงจากข้อมูลโรงพยาบาลที่มีแหล่งที่มา, และเงินก้อนสำหรับช่วงพักฟื้นจากโรคร้ายแรง | Candidate for copy refinement. |
| `repo-defaults:sections.6.th.note` | mixed | public-section | sections.6.th.note | อ้างอิงชุดข้อมูล 2026-08-15-v0.1 และวิธีคำนวณที่แยกชีวิต สุขภาพ และโรคร้ายแรงออกจากกัน ตัวเลขเป็นจุดเริ่มต้นในการคุย ไม่ใช่ใบเสนอราคา คำแนะนำเฉพาะบุคคล หรือค่าใช้จ่ายที่ต้องจ่ายแน่นอน | Candidate for copy refinement. |
| `repo-defaults:sections.6.en.kicker` | en | public-section | sections.6.en.kicker | Tools and useful resources | Candidate for copy refinement. |
| `repo-defaults:sections.6.en.title` | en | public-section | sections.6.en.title | Estimate your<br>starting protection need | Candidate for copy refinement. |
| `repo-defaults:sections.6.en.body` | en | public-section | sections.6.en.body | This tool separates the estimate into three parts: life cover from essential spending and support years, a hospital room-gap reference with source provenance, and a recovery buffer for critical illness. | Candidate for copy refinement. |
| `repo-defaults:sections.6.en.note` | en | public-section | sections.6.en.note | Based on reference dataset 2026-08-15-v0.1 and methodology that keeps life, health and critical illness separate. The result is a discussion starting point, not a quotation, personalised advice, or a guaranteed out-of-pocket amount. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.datasetVersion` | en | public-section | sections.6.calculator.datasetVersion | 2026-08-15-v0.1 | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.sourcePackage` | en | public-section | sections.6.calculator.sourcePackage | covermate-reference-data-v0.1 | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.start.th` | th | public-section | sections.6.calculator.situations.start.th | เพิ่งเริ่มทำงาน | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.start.en` | en | public-section | sections.6.calculator.situations.start.en | Just started working | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.start.recs.0.th` | th | public-section | sections.6.calculator.situations.start.recs.0.th | เริ่มจากค่ารักษาและอุบัติเหตุ | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.start.recs.0.en` | en | public-section | sections.6.calculator.situations.start.recs.0.en | Start with health and accident cover | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.start.recs.0.wth` | th | public-section | sections.6.calculator.situations.start.recs.0.wth | ช่วงเริ่มทำงานควรรักษาสภาพคล่องไว้ก่อน เครื่องมือนี้จึงแยกเงินก้อนชีวิตออกจากค่ารักษาและเงินพักฟื้น | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.start.recs.0.wen` | en | public-section | sections.6.calculator.situations.start.recs.0.wen | Early-career planning should protect cash flow first, so this tool separates life need, medical room gap and recovery buffer. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.start.recs.1.th` | th | public-section | sections.6.calculator.situations.start.recs.1.th | เพิ่มทุนชีวิตเมื่อมีคนพึ่งพารายได้ | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.start.recs.1.en` | en | public-section | sections.6.calculator.situations.start.recs.1.en | Increase life cover when others depend on you | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.start.recs.1.wth` | th | public-section | sections.6.calculator.situations.start.recs.1.wth | ทุนชีวิตควรอิงค่าใช้จ่ายจำเป็นและจำนวนปีที่ต้องดูแล ไม่ใช่ตัวคูณรายได้แบบตายตัว | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.start.recs.1.wen` | en | public-section | sections.6.calculator.situations.start.recs.1.wen | Life cover should follow essential spending and support years, not a fixed salary multiplier. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.start.recs.2.th` | th | public-section | sections.6.calculator.situations.start.recs.2.th | เช็กค่าห้องกับโรงพยาบาลที่ใช้จริง | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.start.recs.2.en` | en | public-section | sections.6.calculator.situations.start.recs.2.en | Check room benefits against likely hospitals | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.start.recs.2.wth` | th | public-section | sections.6.calculator.situations.start.recs.2.wth | ส่วนต่างค่าห้องเป็นข้อมูลอ้างอิง ไม่ใช่จำนวนเงินที่ต้องจ่ายแน่นอน เพราะขึ้นกับเงื่อนไขกรมธรรม์ | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.start.recs.2.wen` | en | public-section | sections.6.calculator.situations.start.recs.2.wen | The room gap is a reference, not a guaranteed bill, because policy terms decide the actual outcome. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.family.th` | th | public-section | sections.6.calculator.situations.family.th | มีครอบครัว มีลูก | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.family.en` | en | public-section | sections.6.calculator.situations.family.en | Family with kids | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.family.recs.0.th` | th | public-section | sections.6.calculator.situations.family.recs.0.th | คุ้มครองรายจ่ายบ้านหลายปี | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.family.recs.0.en` | en | public-section | sections.6.calculator.situations.family.recs.0.en | Protect household spending for several years | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.family.recs.0.wth` | th | public-section | sections.6.calculator.situations.family.recs.0.wth | ใส่ค่าใช้จ่ายจำเป็นต่อเดือนและจำนวนปีที่อยากให้ครอบครัวยืนต่อได้ แล้วค่อยหักเงินสำรองหรือทุนเดิมที่กันไว้แล้ว | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.family.recs.0.wen` | en | public-section | sections.6.calculator.situations.family.recs.0.wen | Enter essential monthly spending and the years your family needs support, then subtract liquid assets and existing cover. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.family.recs.1.th` | th | public-section | sections.6.calculator.situations.family.recs.1.th | หนี้และค่าเรียนควรถูกนับแยก | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.family.recs.1.en` | en | public-section | sections.6.calculator.situations.family.recs.1.en | Debts and education should be explicit | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.family.recs.1.wth` | th | public-section | sections.6.calculator.situations.family.recs.1.wth | หนี้บ้าน รถ หรือภาระอนาคตควรเป็นตัวเลขแยกจากค่าใช้จ่ายรายเดือน เพื่อไม่ให้ทุนชีวิตต่ำกว่าภาระจริง | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.family.recs.1.wen` | en | public-section | sections.6.calculator.situations.family.recs.1.wen | Mortgage, car debt and future obligations should be entered separately from monthly spending so life need is not understated. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.family.recs.2.th` | th | public-section | sections.6.calculator.situations.family.recs.2.th | โรคร้ายแรงคือเงินพักฟื้น | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.family.recs.2.en` | en | public-section | sections.6.calculator.situations.family.recs.2.en | Critical illness is a recovery buffer | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.family.recs.2.wth` | th | public-section | sections.6.calculator.situations.family.recs.2.wth | เงินก้อนโรคร้ายแรงในเครื่องมือนี้อิงเดือนพักฟื้น ไม่ได้ผูกโรคใดโรคหนึ่งกับทุนตายตัว | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.family.recs.2.wen` | en | public-section | sections.6.calculator.situations.family.recs.2.wen | The CI figure is based on recovery months, not a disease-to-sum-insured shortcut. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.business.th` | th | public-section | sections.6.calculator.situations.business.th | เจ้าของธุรกิจ | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.business.en` | en | public-section | sections.6.calculator.situations.business.en | Business owner | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.business.recs.0.th` | th | public-section | sections.6.calculator.situations.business.recs.0.th | แยกภาระบ้านกับภาระธุรกิจ | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.business.recs.0.en` | en | public-section | sections.6.calculator.situations.business.recs.0.en | Separate household and business obligations | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.business.recs.0.wth` | th | public-section | sections.6.calculator.situations.business.recs.0.wth | ภาระธุรกิจที่ครอบครัวต้องรับต่อควรถูกใส่เป็นภาระอนาคต ไม่รวมปนกับค่าใช้จ่ายประจำบ้าน | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.business.recs.0.wen` | en | public-section | sections.6.calculator.situations.business.recs.0.wen | Business obligations that would fall to the family should be added as future obligations, not blended into household spending. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.business.recs.1.th` | th | public-section | sections.6.calculator.situations.business.recs.1.th | เงินสดสำรองช่วยลดช่องว่างได้ | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.business.recs.1.en` | en | public-section | sections.6.calculator.situations.business.recs.1.en | Earmarked liquidity reduces the gap | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.business.recs.1.wth` | th | public-section | sections.6.calculator.situations.business.recs.1.wth | เงินสำรองที่ตั้งใจใช้เพื่อครอบครัวหรือธุรกิจในกรณีฉุกเฉินสามารถนำมาหักได้ แต่เงินทุนหมุนเวียนที่ต้องใช้ทำงานไม่ควรนับซ้ำ | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.business.recs.1.wen` | en | public-section | sections.6.calculator.situations.business.recs.1.wen | Earmarked emergency liquidity can reduce the gap, but working capital needed by the business should not be double-counted. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.business.recs.2.th` | th | public-section | sections.6.calculator.situations.business.recs.2.th | ตรวจ health limit แยกจากทุนชีวิต | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.business.recs.2.en` | en | public-section | sections.6.calculator.situations.business.recs.2.en | Review health limits separately from life cover | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.business.recs.2.wth` | mixed | public-section | sections.6.calculator.situations.business.recs.2.wth | ค่ารักษาไม่ควรถูกนำไปคูณเป็นทุนชีวิต แต่ควรตรวจเป็น room gap และเงื่อนไขกรมธรรม์แยกต่างหาก | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.business.recs.2.wen` | en | public-section | sections.6.calculator.situations.business.recs.2.wen | Medical costs should not drive life cover. Review room gap and policy wording separately. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.retire.th` | th | public-section | sections.6.calculator.situations.retire.th | ใกล้เกษียณ | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.retire.en` | en | public-section | sections.6.calculator.situations.retire.en | Near retirement | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.retire.recs.0.th` | th | public-section | sections.6.calculator.situations.retire.recs.0.th | ลดทุนชีวิตเมื่อภาระลดลง | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.retire.recs.0.en` | en | public-section | sections.6.calculator.situations.retire.recs.0.en | Reduce life cover as obligations fall | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.retire.recs.0.wth` | th | public-section | sections.6.calculator.situations.retire.recs.0.wth | ถ้าหนี้และคนพึ่งพิงลดลง ทุนชีวิตอาจไม่ต้องสูงเท่าช่วงสร้างครอบครัว แต่สุขภาพและเงินพักฟื้นยังควรตรวจละเอียด | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.retire.recs.0.wen` | en | public-section | sections.6.calculator.situations.retire.recs.0.wen | As debts and dependants fall, life cover may not need to be as high as before, while health and recovery buffers deserve closer review. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.retire.recs.1.th` | th | public-section | sections.6.calculator.situations.retire.recs.1.th | ค่าห้องควรตรงกับโรงพยาบาลที่ใช้จริง | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.retire.recs.1.en` | en | public-section | sections.6.calculator.situations.retire.recs.1.en | Room benefits should match likely hospitals | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.retire.recs.1.wth` | th | public-section | sections.6.calculator.situations.retire.recs.1.wth | เลือกค่าห้องจากโรงพยาบาลที่มีแนวโน้มใช้จริง แล้วดูว่าส่วนต่างที่ต้องเตรียมรับได้หรือไม่ | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.retire.recs.1.wen` | en | public-section | sections.6.calculator.situations.retire.recs.1.wen | Choose a likely hospital reference and check whether the resulting room gap is acceptable. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.retire.recs.2.th` | th | public-section | sections.6.calculator.situations.retire.recs.2.th | กันเงินพักฟื้นที่ไม่ใช่ค่ารักษา | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.retire.recs.2.en` | en | public-section | sections.6.calculator.situations.retire.recs.2.en | Set aside non-medical recovery cash | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.retire.recs.2.wth` | th | public-section | sections.6.calculator.situations.retire.recs.2.wth | ช่วงพักฟื้นยังมีค่าเดินทาง คนดูแล และรายได้ที่อาจลดลง ซึ่งไม่ใช่ค่ารักษาโดยตรง | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.situations.retire.recs.2.wen` | en | public-section | sections.6.calculator.situations.retire.recs.2.wen | Recovery may require transport, caregiving and income replacement beyond hospital bills. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.life.formula` | en | public-section | sections.6.calculator.life.formula | essential_monthly_household_spending * 12 * support_years + outstanding_debts + future_obligations + transition_final_costs - earmarked_liquid_assets - existing_death_benefits | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.life.guardrails.0` | en | public-section | sections.6.calculator.life.guardrails.0 | Do not use hospital treatment costs in the core life-sum calculation. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.life.guardrails.1` | en | public-section | sections.6.calculator.life.guardrails.1 | Do not use arbitrary salary multipliers as the authoritative model. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.life.guardrails.2` | en | public-section | sections.6.calculator.life.guardrails.2 | Willingness to pay must not reduce calculated need. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.health.model` | en | public-section | sections.6.calculator.health.model | coverage_fit_and_out_of_pocket_reference | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.health.selectedRoomReference.hospitalId` | en | public-section | sections.6.calculator.health.selectedRoomReference.hospitalId | bnh | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.health.selectedRoomReference.hospitalName.th` | th | public-section | sections.6.calculator.health.selectedRoomReference.hospitalName.th | โรงพยาบาล BNH | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.health.selectedRoomReference.hospitalName.en` | en | public-section | sections.6.calculator.health.selectedRoomReference.hospitalName.en | BNH Hospital | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.health.selectedRoomReference.roomType.th` | th | public-section | sections.6.calculator.health.selectedRoomReference.roomType.th | Regent Adult | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.health.selectedRoomReference.roomType.en` | en | public-section | sections.6.calculator.health.selectedRoomReference.roomType.en | Regent Adult | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.health.selectedRoomReference.currency` | en | public-section | sections.6.calculator.health.selectedRoomReference.currency | THB | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.health.selectedRoomReference.priceUnit` | en | public-section | sections.6.calculator.health.selectedRoomReference.priceUnit | day | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.health.selectedRoomReference.confidenceLevel` | en | public-section | sections.6.calculator.health.selectedRoomReference.confidenceLevel | A | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.health.selectedRoomReference.note.th` | th | public-section | sections.6.calculator.health.selectedRoomReference.note.th | ข้อมูลค่าห้องอ้างอิงจากหน้าโรงพยาบาล ไม่ใช่จำนวนเงินที่ผู้เอาประกันต้องจ่ายแน่นอน | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.health.selectedRoomReference.note.en` | en | public-section | sections.6.calculator.health.selectedRoomReference.note.en | Published room reference from the hospital page, not a guaranteed out-of-pocket amount. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.health.guardrails.0` | en | public-section | sections.6.calculator.health.guardrails.0 | Do not output one authoritative required sum insured. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.health.guardrails.1` | en | public-section | sections.6.calculator.health.guardrails.1 | Do not call the reference difference the amount the user will definitely pay. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.health.guardrails.2` | en | public-section | sections.6.calculator.health.guardrails.2 | Every medical reference must expose source, last_checked and confidence. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.health.guardrails.3` | en | public-section | sections.6.calculator.health.guardrails.3 | Do not derive P50/P75/P90 from promotional/package pages. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.criticalIllness.formula` | en | public-section | sections.6.calculator.criticalIllness.formula | essential_monthly_spending * recovery_months + one_off_recovery_non_medical_budget + chosen_medical_oop_buffer - earmarked_emergency_assets - existing_ci_lump_sum_cover | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.criticalIllness.guardrails.0` | en | public-section | sections.6.calculator.criticalIllness.guardrails.0 | Recovery period must be explicitly user-selected. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.criticalIllness.guardrails.1` | en | public-section | sections.6.calculator.criticalIllness.guardrails.1 | Do not map a disease name to a fixed CI sum. | Candidate for copy refinement. |
| `repo-defaults:sections.6.calculator.criticalIllness.guardrails.2` | en | public-section | sections.6.calculator.criticalIllness.guardrails.2 | Health treatment scenarios may contextualize the user's chosen medical OOP buffer but must not dictate it. | Candidate for copy refinement. |
| `repo-defaults:sections.7.th.kicker` | th | public-section | sections.7.th.kicker | ประกันรถยนต์ · เทียบชั้นความคุ้มครอง | Candidate for copy refinement. |
| `repo-defaults:sections.7.th.title` | th | public-section | sections.7.th.title | แต่ละชั้น<br>ต่างกันตรงไหน | Candidate for copy refinement. |
| `repo-defaults:sections.7.th.body` | th | public-section | sections.7.th.body | ตารางนี้ช่วยให้เห็นความแตกต่างโดยทั่วไปของประกันรถยนต์แต่ละชั้น โดยเฉพาะความคุ้มครองรถของผู้เอาประกัน ภัยธรรมชาติ และเงื่อนไขที่ต้องตรวจสอบก่อนเลือก | Candidate for copy refinement. |
| `repo-defaults:sections.7.th.note` | th | public-section | sections.7.th.note | ตารางนี้เป็นภาพรวมของความคุ้มครองทั่วไป วงเงิน เงื่อนไข และข้อยกเว้นแตกต่างกันตามกรมธรรม์ของแต่ละบริษัท ก่อนตัดสินใจ เราสามารถช่วยตรวจสอบเงื่อนไขจริงของแผนที่คุณสนใจได้โดยไม่มีค่าใช้จ่าย | Candidate for copy refinement. |
| `repo-defaults:sections.7.en.kicker` | en | public-section | sections.7.en.kicker | Motor insurance · comparing the classes | Candidate for copy refinement. |
| `repo-defaults:sections.7.en.title` | en | public-section | sections.7.en.title | What actually differs<br>between the classes | Candidate for copy refinement. |
| `repo-defaults:sections.7.en.body` | en | public-section | sections.7.en.body | This table shows the general differences between motor insurance classes, especially cover for your own vehicle, natural disasters and conditions to review before choosing. | Candidate for copy refinement. |
| `repo-defaults:sections.7.en.note` | en | public-section | sections.7.en.note | This table is a general overview. Limits, conditions and exclusions vary by insurer and policy. We can review the actual policy wording with you before you decide, at no charge. | Candidate for copy refinement. |
| `repo-defaults:sections.7.heads.0.th` | th | public-section | sections.7.heads.0.th | คุ้มครองรถของผู้เอาประกัน | Candidate for copy refinement. |
| `repo-defaults:sections.7.heads.0.en` | en | public-section | sections.7.heads.0.en | Your own car | Candidate for copy refinement. |
| `repo-defaults:sections.7.heads.1.th` | th | public-section | sections.7.heads.1.th | คุ้มครองคู่กรณี (ชีวิต/ทรัพย์สิน) | Candidate for copy refinement. |
| `repo-defaults:sections.7.heads.1.en` | en | public-section | sections.7.heads.1.en | Third party (injury / property) | Candidate for copy refinement. |
| `repo-defaults:sections.7.heads.2.th` | th | public-section | sections.7.heads.2.th | คุ้มครองอุบัติเหตุส่วนบุคคล | Candidate for copy refinement. |
| `repo-defaults:sections.7.heads.2.en` | en | public-section | sections.7.heads.2.en | Personal accident | Candidate for copy refinement. |
| `repo-defaults:sections.7.heads.3.th` | th | public-section | sections.7.heads.3.th | รถหาย / ไฟไหม้ | Candidate for copy refinement. |
| `repo-defaults:sections.7.heads.3.en` | en | public-section | sections.7.heads.3.en | Theft & fire | Candidate for copy refinement. |
| `repo-defaults:sections.7.heads.4.th` | th | public-section | sections.7.heads.4.th | คุ้มครองภัยธรรมชาติ | Candidate for copy refinement. |
| `repo-defaults:sections.7.heads.4.en` | en | public-section | sections.7.heads.4.en | Flood & natural disaster | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.0.th.label` | th | public-section | sections.7.items.0.th.label | ชั้น 1 | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.0.th.value` | th | public-section | sections.7.items.0.th.value | เหมาะสำหรับรถใหม่ หรือผู้ขับขี่ที่ต้องการความคุ้มครองกว้างกว่าโดยรวม | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.0.en.label` | en | public-section | sections.7.items.0.en.label | Class 1 | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.0.en.value` | en | public-section | sections.7.items.0.en.value | Suitable for newer vehicles or drivers seeking broader overall protection | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.1.th.label` | th | public-section | sections.7.items.1.th.label | ชั้น 2+ | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.1.th.note` | th | public-section | sections.7.items.1.th.note | เฉพาะชนคู่กรณีที่ระบุได้ | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.1.th.value` | th | public-section | sections.7.items.1.th.value | เหมาะสำหรับรถมูลค่าปานกลางที่ต้องการสมดุลระหว่างความคุ้มครองและเบี้ยประกัน | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.1.en.label` | en | public-section | sections.7.items.1.en.label | Class 2+ | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.1.en.note` | en | public-section | sections.7.items.1.en.note | only when the other vehicle is identified | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.1.en.value` | en | public-section | sections.7.items.1.en.value | Suitable for mid-value cars where premium and protection need to be balanced | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.2.th.label` | th | public-section | sections.7.items.2.th.label | ชั้น 2 | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.2.th.value` | th | public-section | sections.7.items.2.th.value | เหมาะกับรถที่ต้องการเน้นความคุ้มครองรถหายหรือไฟไหม้มากกว่าความเสียหายจากการชน | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.2.en.label` | en | public-section | sections.7.items.2.en.label | Class 2 | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.2.en.value` | en | public-section | sections.7.items.2.en.value | Suitable when theft or fire is the main concern rather than collision damage | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.3.th.label` | th | public-section | sections.7.items.3.th.label | ชั้น 3+ | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.3.th.note` | th | public-section | sections.7.items.3.th.note | เฉพาะชนคู่กรณีที่ระบุได้ | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.3.th.value` | th | public-section | sections.7.items.3.th.value | ช่วยลดเบี้ยประกัน โดยยังมีความคุ้มครองบางส่วนเมื่อชนกับคู่กรณีที่ระบุได้ | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.3.en.label` | en | public-section | sections.7.items.3.en.label | Class 3+ | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.3.en.note` | en | public-section | sections.7.items.3.en.note | only when the other vehicle is identified | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.3.en.value` | en | public-section | sections.7.items.3.en.value | A lower-premium option with partial own-car cover when the other vehicle is identified | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.4.th.label` | th | public-section | sections.7.items.4.th.label | ชั้น 3 | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.4.th.value` | th | public-section | sections.7.items.4.th.value | เหมาะกับรถใช้งานมานาน หรือรถที่มูลค่าไม่สูงและต้องการความคุ้มครองพื้นฐาน | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.4.en.label` | en | public-section | sections.7.items.4.en.label | Class 3 | Candidate for copy refinement. |
| `repo-defaults:sections.7.items.4.en.value` | en | public-section | sections.7.items.4.en.value | Suitable for older or lower-value cars where basic protection is enough | Candidate for copy refinement. |
| `repo-defaults:sections.8.th.kicker` | th | public-section | sections.8.th.kicker | เก็บหน้านี้ไว้ · สำหรับกรณีเกิดอุบัติเหตุ | Candidate for copy refinement. |
| `repo-defaults:sections.8.th.title` | th | public-section | sections.8.th.title | เกิดอุบัติเหตุ<br>ทำอะไรก่อน | Candidate for copy refinement. |
| `repo-defaults:sections.8.th.body` | th | public-section | sections.8.th.body | เมื่อเกิดอุบัติเหตุ การจัดลำดับสิ่งที่ต้องทำอาจไม่ง่าย เราจึงสรุปขั้นตอนสำคัญไว้ให้ทำตามทีละข้อ จากนั้นสามารถติดต่อเราเพื่อช่วยประสานงานกับบริษัทประกันภัยต่อได้ | Candidate for copy refinement. |
| `repo-defaults:sections.8.th.note` | mixed | public-section | sections.8.th.note | หากไม่แน่ใจว่าควรดำเนินการอย่างไร สามารถติดต่อเราเพื่อสอบถามขั้นตอนเบื้องต้นได้โดยไม่มีค่าใช้จ่าย แม้ยังไม่ได้เป็นลูกค้าของ CoverMate | Candidate for copy refinement. |
| `repo-defaults:sections.8.en.kicker` | en | public-section | sections.8.en.kicker | Keep this page · for accident situations | Candidate for copy refinement. |
| `repo-defaults:sections.8.en.title` | en | public-section | sections.8.en.title | An accident just<br>happened — do this | Candidate for copy refinement. |
| `repo-defaults:sections.8.en.body` | en | public-section | sections.8.en.body | In an accident, it can be hard to decide what to do first. We have set out the key steps in order, then you can contact us for help coordinating with the insurer. | Candidate for copy refinement. |
| `repo-defaults:sections.8.en.note` | en | public-section | sections.8.en.note | If you are unsure what to do, you can contact us for initial guidance at no charge, even if you are not yet a CoverMate client. | Candidate for copy refinement. |
| `repo-defaults:sections.8.items.0.th.title` | th | public-section | sections.8.items.0.th.title | ดูคนก่อนดูรถ | Candidate for copy refinement. |
| `repo-defaults:sections.8.items.0.th.body` | th | public-section | sections.8.items.0.th.body | มีใครเจ็บไหม ถ้าเจ็บโทร 1669 ทันที ย้ายรถออกจากช่องทางเดินรถถ้าขยับได้ เปิดไฟฉุกเฉิน ตั้งสามเหลี่ยม อย่ายืนอยู่บนถนน | Candidate for copy refinement. |
| `repo-defaults:sections.8.items.0.en.title` | en | public-section | sections.8.items.0.en.title | People before cars | Candidate for copy refinement. |
| `repo-defaults:sections.8.items.0.en.body` | en | public-section | sections.8.items.0.en.body | Anyone hurt? Call 1669 immediately. Move the car out of live traffic if it can be moved, turn hazards on, set a warning triangle and avoid standing in the road. | Candidate for copy refinement. |
| `repo-defaults:sections.8.items.1.th.title` | th | public-section | sections.8.items.1.th.title | ถ่ายรูปก่อนขยับ | Candidate for copy refinement. |
| `repo-defaults:sections.8.items.1.th.body` | th | public-section | sections.8.items.1.th.body | ถ่ายให้เห็นตำแหน่งรถทั้งสองคันพร้อมกัน ป้ายทะเบียนคู่กรณี ความเสียหายทุกด้าน และภาพกว้างให้เห็นถนนกับสัญญาณไฟ | Candidate for copy refinement. |
| `repo-defaults:sections.8.items.1.en.title` | en | public-section | sections.8.items.1.en.title | Photograph before moving | Candidate for copy refinement. |
| `repo-defaults:sections.8.items.1.en.body` | en | public-section | sections.8.items.1.en.body | Take photos showing both vehicles in position, the other plate, all visible damage, and a wide view of the road and traffic signals. | Candidate for copy refinement. |
| `repo-defaults:sections.8.items.2.th.title` | th | public-section | sections.8.items.2.th.title | แจ้งบริษัทประกัน | Candidate for copy refinement. |
| `repo-defaults:sections.8.items.2.th.body` | th | public-section | sections.8.items.2.th.body | โทรสายด่วนบริษัทที่หน้ากรมธรรม์ แจ้งเลขกรมธรรม์กับสถานที่ รอเจ้าหน้าที่มาออกใบเคลม อย่าตกลงจ่ายเงินสดกันเองข้างถนน | Candidate for copy refinement. |
| `repo-defaults:sections.8.items.2.en.title` | en | public-section | sections.8.items.2.en.title | Notify the insurer | Candidate for copy refinement. |
| `repo-defaults:sections.8.items.2.en.body` | en | public-section | sections.8.items.2.en.body | Call the hotline shown on your policy with the policy number and location, then wait for the surveyor or claim slip. Avoid settling in cash at the roadside. | Candidate for copy refinement. |
| `repo-defaults:sections.8.items.3.th.title` | th | public-section | sections.8.items.3.th.title | ส่งเอกสารให้เรา | Candidate for copy refinement. |
| `repo-defaults:sections.8.items.3.th.body` | mixed | public-section | sections.8.items.3.th.body | ส่งภาพถ่ายและใบเคลมทาง LINE เราจะช่วยติดตามและประสานงานกับบริษัทประกันภัยในประเด็นที่เกี่ยวข้อง เช่น อู่ซ่อม รถใช้ระหว่างซ่อม และค่าเสียหายส่วนแรกตามเงื่อนไขกรมธรรม์ | Candidate for copy refinement. |
| `repo-defaults:sections.8.items.3.en.title` | en | public-section | sections.8.items.3.en.title | Send the documents to us | Candidate for copy refinement. |
| `repo-defaults:sections.8.items.3.en.body` | en | public-section | sections.8.items.3.en.body | Send the photos and claim slip on LINE. We can help follow up and coordinate with the insurer on relevant issues such as garages, courtesy cars and excess amounts under the policy conditions. | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.0.th.kicker` | th | public-section | sections.8.cards.0.th.kicker | เจ็บ · ฉุกเฉิน | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.0.th.title` | neutral | public-section | sections.8.cards.0.th.title | 1669 | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.0.th.body` | th | public-section | sections.8.cards.0.th.body | ศูนย์การแพทย์ฉุกเฉิน · ฟรี ตลอด 24 ชม. | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.0.en.kicker` | en | public-section | sections.8.cards.0.en.kicker | Injury · emergency | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.0.en.title` | neutral | public-section | sections.8.cards.0.en.title | 1669 | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.0.en.body` | en | public-section | sections.8.cards.0.en.body | Emergency medical services · free, 24 hours | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.1.th.kicker` | th | public-section | sections.8.cards.1.th.kicker | ตำรวจ | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.1.th.title` | neutral | public-section | sections.8.cards.1.th.title | 191 | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.1.th.body` | th | public-section | sections.8.cards.1.th.body | เมื่อมีข้อพิพาท คู่กรณีหนี หรือต้องลงบันทึกประจำวัน | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.1.en.kicker` | en | public-section | sections.8.cards.1.en.kicker | Police | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.1.en.title` | neutral | public-section | sections.8.cards.1.en.title | 191 | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.1.en.body` | en | public-section | sections.8.cards.1.en.body | For disputes, a driver leaving the scene, or a police report | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.2.th.kicker` | th | public-section | sections.8.cards.2.th.kicker | อุบัติเหตุบนทางหลวง | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.2.th.title` | neutral | public-section | sections.8.cards.2.th.title | 1586 | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.2.th.body` | th | public-section | sections.8.cards.2.th.body | สายด่วนกรมทางหลวง · แจ้งเหตุและขอความช่วยเหลือบนถนน | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.2.en.kicker` | en | public-section | sections.8.cards.2.en.kicker | Highway incidents | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.2.en.title` | neutral | public-section | sections.8.cards.2.en.title | 1586 | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.2.en.body` | en | public-section | sections.8.cards.2.en.body | Department of Highways hotline · road incidents and assistance | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.3.th.kicker` | th | public-section | sections.8.cards.3.th.kicker | ร้องเรียนเรื่องประกัน | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.3.th.title` | neutral | public-section | sections.8.cards.3.th.title | 1186 | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.3.th.body` | th | public-section | sections.8.cards.3.th.body | สายด่วน คปภ. · เมื่อบริษัทประกันปฏิเสธหรือประวิงเวลา | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.3.en.kicker` | en | public-section | sections.8.cards.3.en.kicker | Insurance complaints | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.3.en.title` | neutral | public-section | sections.8.cards.3.en.title | 1186 | Candidate for copy refinement. |
| `repo-defaults:sections.8.cards.3.en.body` | en | public-section | sections.8.cards.3.en.body | OIC hotline · when an insurer refuses or delays | Candidate for copy refinement. |
| `repo-defaults:sections.9.th.kicker` | th | public-section | sections.9.th.kicker | เตือนล่วงหน้า · ยกเลิกได้ทุกเมื่อ | Candidate for copy refinement. |
| `repo-defaults:sections.9.th.title` | th | public-section | sections.9.th.title | ไม่ต้องกังวลเรื่องวันหมดอายุ<br>ให้เราช่วยเตือนล่วงหน้า | Candidate for copy refinement. |
| `repo-defaults:sections.9.th.body` | th | public-section | sections.9.th.body | แจ้งประเภทกรมธรรม์และเดือนที่หมดอายุไว้กับเรา เราจะเตือนล่วงหน้า 60 วัน และสำหรับประกันรถยนต์จะช่วยเปรียบเทียบข้อเสนอใหม่เพื่อให้คุณพิจารณาว่าควรต่ออายุที่เดิมหรือเปลี่ยนทางเลือก โดยยังไม่ต้องส่งเอกสารในขั้นตอนนี้ | Candidate for copy refinement. |
| `repo-defaults:sections.9.th.note` | th | public-section | sections.9.th.note | เราใช้ข้อมูลนี้เพื่อแจ้งเตือนเฉพาะเรื่องที่คุณขอ ไม่ส่งโปรโมชั่น และคุณสามารถยกเลิกการแจ้งเตือนได้ทุกเมื่อ | Candidate for copy refinement. |
| `repo-defaults:sections.9.en.kicker` | en | public-section | sections.9.en.kicker | Advance reminders · stop any time | Candidate for copy refinement. |
| `repo-defaults:sections.9.en.title` | en | public-section | sections.9.en.title | Let us keep track of<br>your renewal dates | Candidate for copy refinement. |
| `repo-defaults:sections.9.en.body` | en | public-section | sections.9.en.body | Tell us the policy type and expiry month. We will remind you 60 days in advance and, for motor insurance, provide a fresh comparison for the coming renewal. No documents are required at this stage. | Candidate for copy refinement. |
| `repo-defaults:sections.9.en.note` | en | public-section | sections.9.en.note | We use the information only for the reminders you request. We do not send promotional messages, and you can stop reminders at any time. | Candidate for copy refinement. |
| `repo-defaults:sections.9.items.0.th.title` | th | public-section | sections.9.items.0.th.title | เตือน 60 วันก่อน | Candidate for copy refinement. |
| `repo-defaults:sections.9.items.0.th.body` | th | public-section | sections.9.items.0.th.body | มีเวลาพอสำหรับเปรียบเทียบข้อเสนอ ต่ออายุ หรือเปลี่ยนบริษัทประกันโดยไม่เร่งรีบ | Candidate for copy refinement. |
| `repo-defaults:sections.9.items.0.en.title` | en | public-section | sections.9.items.0.en.title | Sixty days ahead | Candidate for copy refinement. |
| `repo-defaults:sections.9.items.0.en.body` | en | public-section | sections.9.items.0.en.body | Enough time to compare options, renew or switch insurers without rushing. | Candidate for copy refinement. |
| `repo-defaults:sections.9.items.1.th.title` | th | public-section | sections.9.items.1.th.title | มาพร้อมข้อมูลใหม่ | Candidate for copy refinement. |
| `repo-defaults:sections.9.items.1.th.body` | th | public-section | sections.9.items.1.th.body | สำหรับประกันรถยนต์ เราจะช่วยเปรียบเทียบข้อเสนอใหม่ในแต่ละปี เพราะราคาและเงื่อนไขอาจเปลี่ยนได้ | Candidate for copy refinement. |
| `repo-defaults:sections.9.items.1.en.title` | en | public-section | sections.9.items.1.en.title | With updated options | Candidate for copy refinement. |
| `repo-defaults:sections.9.items.1.en.body` | en | public-section | sections.9.items.1.en.body | For motor insurance, we can compare fresh offers each year because premiums and conditions may change. | Candidate for copy refinement. |
| `repo-defaults:sections.9.items.2.th.title` | th | public-section | sections.9.items.2.th.title | ใช้ข้อมูลเท่าที่จำเป็น | Candidate for copy refinement. |
| `repo-defaults:sections.9.items.2.th.body` | th | public-section | sections.9.items.2.th.body | เริ่มจากประเภทกรมธรรม์ เดือนที่หมดอายุ และช่องทางติดต่อ โดยยังไม่ต้องส่งเลขกรมธรรม์หรือเลขบัตรประชาชน | Candidate for copy refinement. |
| `repo-defaults:sections.9.items.2.en.title` | en | public-section | sections.9.items.2.en.title | Only necessary data | Candidate for copy refinement. |
| `repo-defaults:sections.9.items.2.en.body` | en | public-section | sections.9.items.2.en.body | We start with the policy type, expiry month and contact channel. No policy number or ID card number is needed at this stage. | Candidate for copy refinement. |
| `repo-defaults:sections.10.th.kicker` | th | public-section | sections.10.th.kicker | อ่านก่อนตัดสินใจ | Candidate for copy refinement. |
| `repo-defaults:sections.10.th.title` | th | public-section | sections.10.th.title | สี่เรื่องที่ควรรู้<br>ก่อนเลือกประกัน | Candidate for copy refinement. |
| `repo-defaults:sections.10.th.body` | th | public-section | sections.10.th.body | สรุปประเด็นสำคัญที่มักถูกมองข้าม เพื่อช่วยให้คุณตั้งคำถามและตรวจสอบเงื่อนไขก่อนตัดสินใจ | Candidate for copy refinement. |
| `repo-defaults:sections.10.en.kicker` | en | public-section | sections.10.en.kicker | Read before you decide | Candidate for copy refinement. |
| `repo-defaults:sections.10.en.title` | en | public-section | sections.10.en.title | Four things to know<br>before choosing cover | Candidate for copy refinement. |
| `repo-defaults:sections.10.en.body` | en | public-section | sections.10.en.body | Key points that are often missed, written to help you ask better questions and review conditions before deciding. | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.0.th.label` | th | public-section | sections.10.items.0.th.label | สุขภาพ | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.0.th.meta` | th | public-section | sections.10.items.0.th.meta | อ่าน 2 นาที | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.0.th.title` | th | public-section | sections.10.items.0.th.title | ค่าห้องที่เลือกไว้ อาจไม่พอกับโรงพยาบาลที่คุณจะไปจริง | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.0.th.body` | th | public-section | sections.10.items.0.th.body | เวลาซื้อประกันสุขภาพ หลายคนเลือกค่าห้องตามเบี้ยที่จ่ายไหว แต่เมื่อป่วยจริง เรามักเลือกโรงพยาบาลที่ใกล้บ้านหรือแพทย์ที่ไว้วางใจ ไม่ใช่โรงพยาบาลที่ค่าห้องพอดีกับกรมธรรม์<br><br>วิธีตรวจง่าย ๆ คือดูค่าห้องเดี่ยวต่อคืนของโรงพยาบาลที่คุณมีแนวโน้มใช้ แล้วเทียบกับตัวเลขในกรมธรรม์ หากกรมธรรม์ให้ 4,000 บาท แต่ค่าห้องจริง 6,500 บาท ส่วนต่าง 2,500 บาทต่อคืนอาจเป็นค่าใช้จ่ายที่ผู้เอาประกันต้องรับผิดชอบเอง ทั้งนี้ขึ้นอยู่กับเงื่อนไขกรมธรรม์<br><br>แบบเหมาจ่ายด้วยวงเงินรวมช่วยลดข้อจำกัดจากการเพิ่มค่าห้องทีละขั้น เพราะไม่ต้องแยกดูวงเงินย่อยของแต่ละรายการมากเท่าเดิม | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.0.en.label` | en | public-section | sections.10.items.0.en.label | Health | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.0.en.meta` | en | public-section | sections.10.items.0.en.meta | 2 min read | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.0.en.title` | en | public-section | sections.10.items.0.en.title | Your room benefit may not match the hospital you would actually use | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.0.en.body` | mixed | public-section | sections.10.items.0.en.body | When buying health insurance, many people choose a room benefit around the premium they can afford. But when illness happens, you usually choose the hospital near home or the doctor you trust, not the hospital whose room rate happens to match your policy.<br><br>A simple check is to look up the private room rate at the hospital you are likely to use, then compare it with the figure on your policy. If the policy pays ฿4,000 and the room is ฿6,500, the ฿2,500 difference per night may be your responsibility, depending on policy terms.<br><br>An aggregate-limit plan can address this more directly than increasing the room benefit one step at a time, because fewer item-by-item caps need to be checked. | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.1.th.label` | th | public-section | sections.10.items.1.th.label | รถยนต์ | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.1.th.meta` | th | public-section | sections.10.items.1.th.meta | อ่าน 2 นาที | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.1.th.title` | th | public-section | sections.10.items.1.th.title | ชั้น 3+ ไม่ได้คุ้มครองทุกการชน และนี่คือจุดที่มักพลาด | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.1.th.body` | th | public-section | sections.10.items.1.th.body | ประกันชั้น 3+ คุ้มครองความเสียหายต่อรถของคุณเมื่อชนกับ “ยานพาหนะทางบกที่มีคู่กรณีระบุได้” เงื่อนไขนี้สั้น แต่ตัดหลายเหตุการณ์ออกไป<br><br>ชนเสาไฟ ชนขอบทาง ถอยชนกำแพงบ้าน ชนสัตว์ที่วิ่งตัดหน้า หรือคู่กรณีหลบหนีและไม่สามารถระบุได้ อาจไม่เข้าเงื่อนไขความคุ้มครองรถของผู้เอาประกัน ส่วนความเสียหายต่อคู่กรณียังเป็นอีกเงื่อนไขหนึ่งตามกรมธรรม์<br><br>หากรถยังผ่อนอยู่ หรือเป็นรถคันหลักที่ใช้ทำงาน ส่วนต่างเบี้ยระหว่างชั้น 3+ กับชั้น 1 อาจน้อยกว่าค่าซ่อมครั้งเดียวที่ต้องรับผิดชอบเอง ควรเปรียบเทียบตัวเลขจริงก่อนตัดสินใจ | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.1.en.label` | en | public-section | sections.10.items.1.en.label | Motor | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.1.en.meta` | en | public-section | sections.10.items.1.en.meta | 2 min read | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.1.en.title` | en | public-section | sections.10.items.1.en.title | Class 3+ does not cover every collision — here is the common gap | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.1.en.body` | en | public-section | sections.10.items.1.en.body | Class 3+ covers damage to your car when it collides with an identified land vehicle. That condition is short, but it excludes many situations.<br><br>Hitting a lamp post, kerb or wall, striking an animal, or being hit by a driver who cannot be identified may fall outside own-car damage cover. Third-party liability is assessed under its own policy conditions.<br><br>If the car is still financed or is essential for work, the premium gap between Class 3+ and Class 1 may be smaller than one repair bill you would otherwise pay yourself. It is worth comparing the actual numbers before deciding. | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.2.th.label` | th | public-section | sections.10.items.2.th.label | ชีวิต | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.2.th.meta` | th | public-section | sections.10.items.2.th.meta | อ่าน 2 นาที | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.2.th.title` | th | public-section | sections.10.items.2.th.title | ทุนประกันชีวิตควรสะท้อนภาระทางการเงินและระยะเวลาที่ครอบครัวต้องพึ่งพารายได้ | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.2.th.body` | mixed | public-section | sections.10.items.2.th.body | คำถามที่ตอบง่ายกว่า “ควรทำทุนเท่าไหร่” คือ “ถ้ารายได้หายไปพรุ่งนี้ คนที่บ้านต้องใช้เวลานานแค่ไหนก่อนยืนได้ด้วยตัวเอง”<br><br>นำค่าใช้จ่ายบ้านต่อเดือนคูณจำนวนเดือนที่ต้องการดูแลต่อ บวกหนี้ที่ยังเหลือ เช่น บ้าน รถ และค่าเรียนของลูกที่ยังต้องจ่าย ตัวเลขนี้คือฐานสำหรับพิจารณาทุนประกัน ไม่จำเป็นต้องเป็นเลขกลมหรือเลขสวย<br><br>หลายคนที่คำนวณแบบนี้พบว่าทุนเดิมอาจยังไม่พอ แต่ก็อาจพบว่าแบบชั่วระยะเวลา (term) ช่วยเติมส่วนที่ขาดได้ด้วยเบี้ยที่เข้าถึงได้กว่าที่คิด | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.2.en.label` | en | public-section | sections.10.items.2.en.label | Life | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.2.en.meta` | en | public-section | sections.10.items.2.en.meta | 2 min read | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.2.en.title` | en | public-section | sections.10.items.2.en.title | A life sum assured should reflect debt and the time your family needs support | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.2.en.body` | en | public-section | sections.10.items.2.en.body | A more useful starting question is: if household income stopped tomorrow, how long would the family need before standing on its own?<br><br>Take the household’s monthly costs, multiply by the number of months to protect, then add outstanding debts such as mortgage, car finance and future education costs. That figure is the starting point for the sum assured. It does not need to be round.<br><br>Many people who calculate this way find their existing cover may be short, but term cover can often fill the gap for a more accessible premium than expected. | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.3.th.label` | th | public-section | sections.10.items.3.th.label | ภาษี | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.3.th.meta` | th | public-section | sections.10.items.3.th.meta | อ่าน 1 นาที | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.3.th.title` | th | public-section | sections.10.items.3.th.title | สิทธิลดหย่อนประกันมีสองกลุ่มหลัก คนมักใช้ไม่ครบ | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.3.th.body` | mixed | public-section | sections.10.items.3.th.body | เบี้ยประกันชีวิตทั่วไปลดหย่อนได้ถึง 100,000 บาท และเบี้ยประกันสุขภาพตนเองรวมอยู่ในเพดานนี้ได้ไม่เกิน 25,000 บาท<br><br>ประกันบำนาญเป็นอีกกลุ่มหนึ่งที่แยกออกมา ลดหย่อนเพิ่มได้ถึง 200,000 บาท โดยไม่เกิน 15% ของเงินได้ และเมื่อรวมกับ RMF กองทุนสำรองเลี้ยงชีพ และ กบข. ต้องไม่เกิน 500,000 บาท<br><br>ผู้ที่ใช้สิทธิ 100,000 บาทเต็มแล้วและยังต้องการวางแผนภาษีเพิ่มเติม มักไม่รู้ว่าสิทธิบำนาญยังอาจเหลืออยู่ ตัวเลขและเงื่อนไขของแต่ละปีควรตรวจสอบกับกรมสรรพากรก่อนยื่นภาษี | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.3.en.label` | en | public-section | sections.10.items.3.en.label | Tax | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.3.en.meta` | en | public-section | sections.10.items.3.en.meta | 1 min read | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.3.en.title` | en | public-section | sections.10.items.3.en.title | Insurance-related tax deductions fall into two main categories | Candidate for copy refinement. |
| `repo-defaults:sections.10.items.3.en.body` | mixed | public-section | sections.10.items.3.en.body | Ordinary life premiums are deductible up to ฿100,000, and your own health premiums can be included within that ceiling up to ฿25,000.<br><br>Annuity cover sits in a separate category: a further ฿200,000, capped at 15% of income and at ฿500,000 when combined with RMF and provident-fund contributions.<br><br>People who have already used the ฿100,000 allowance and still want additional tax planning often do not realise the annuity allowance may remain available. Confirm the current-year figures and conditions with the Revenue Department before filing. | Candidate for copy refinement. |
| `repo-defaults:sections.12.th.kicker` | mixed | public-section | sections.12.th.kicker | เกี่ยวกับ CoverMate | Candidate for copy refinement. |
| `repo-defaults:sections.12.th.title` | th | public-section | sections.12.th.title | ดูแลด้วยความเข้าใจ<br>และความรอบคอบ | Candidate for copy refinement. |
| `repo-defaults:sections.12.th.body` | mixed | public-section | sections.12.th.body | CoverMate เกิดขึ้นจากการเห็นว่าหลายคนเพิ่งพบในวันที่ต้องใช้สิทธิหรือเคลมว่า ความคุ้มครองที่มีไม่ตรงกับสิ่งที่เข้าใจไว้ เราจึงให้ความสำคัญกับการอธิบายทางเลือก เงื่อนไข และข้อจำกัดให้ชัดเจน เพื่อให้คุณมีข้อมูลเพียงพอก่อนตัดสินใจ<br><br>ประกันชีวิตและสุขภาพดำเนินการผ่าน AIA ส่วนประกันรถยนต์ให้บริการในฐานะนายหน้า โดยเปรียบเทียบทางเลือกจากบริษัทประกันภัยตามความเหมาะสม | Candidate for copy refinement. |
| `repo-defaults:sections.12.en.kicker` | en | public-section | sections.12.en.kicker | About CoverMate | Candidate for copy refinement. |
| `repo-defaults:sections.12.en.title` | en | public-section | sections.12.en.title | A considered approach<br>to protection | Candidate for copy refinement. |
| `repo-defaults:sections.12.en.body` | en | public-section | sections.12.en.body | CoverMate was created after seeing how often people discover, only when they need to claim, that their cover does not match what they understood. Our approach is to explain options, conditions and limitations clearly so you have enough information before deciding.<br><br>For life and health insurance, we arrange cover through AIA. For motor insurance, we act in a broker capacity and compare suitable insurer options. | Candidate for copy refinement. |
| `repo-defaults:sections.12.items.0.th.label` | th | public-section | sections.12.items.0.th.label | ความเชี่ยวชาญ | Candidate for copy refinement. |
| `repo-defaults:sections.12.items.0.th.value` | th | public-section | sections.12.items.0.th.value | ชีวิต สุขภาพ และรถยนต์ | Candidate for copy refinement. |
| `repo-defaults:sections.12.items.0.en.label` | en | public-section | sections.12.items.0.en.label | Focus | Candidate for copy refinement. |
| `repo-defaults:sections.12.items.0.en.value` | en | public-section | sections.12.items.0.en.value | Life, health and motor | Candidate for copy refinement. |
| `repo-defaults:sections.12.items.1.th.label` | th | public-section | sections.12.items.1.th.label | ใบอนุญาต | Candidate for copy refinement. |
| `repo-defaults:sections.12.items.1.en.label` | en | public-section | sections.12.items.1.en.label | Licences | Candidate for copy refinement. |
| `repo-defaults:sections.12.items.2.th.label` | th | public-section | sections.12.items.2.th.label | ภาษา | Candidate for copy refinement. |
| `repo-defaults:sections.12.items.2.th.value` | mixed | public-section | sections.12.items.2.th.value | ไทย · English | Candidate for copy refinement. |
| `repo-defaults:sections.12.items.2.en.label` | en | public-section | sections.12.items.2.en.label | Languages | Candidate for copy refinement. |
| `repo-defaults:sections.12.items.2.en.value` | en | public-section | sections.12.items.2.en.value | Thai · English | Candidate for copy refinement. |
| `repo-defaults:sections.12.items.3.th.label` | th | public-section | sections.12.items.3.th.label | พื้นที่ดูแล | Candidate for copy refinement. |
| `repo-defaults:sections.12.items.3.th.value` | th | public-section | sections.12.items.3.th.value | กรุงเทพฯ และปริมณฑล | Candidate for copy refinement. |
| `repo-defaults:sections.12.items.3.en.label` | en | public-section | sections.12.items.3.en.label | Area | Candidate for copy refinement. |
| `repo-defaults:sections.12.items.3.en.value` | en | public-section | sections.12.items.3.en.value | Bangkok & surrounding | Candidate for copy refinement. |
| `repo-defaults:sections.13.th.kicker` | th | public-section | sections.13.th.kicker | คำถามที่ถูกถามบ่อย | Candidate for copy refinement. |
| `repo-defaults:sections.13.th.title` | th | public-section | sections.13.th.title | คำถามที่พบบ่อย | Candidate for copy refinement. |
| `repo-defaults:sections.13.en.kicker` | en | public-section | sections.13.en.kicker | Asked most often | Candidate for copy refinement. |
| `repo-defaults:sections.13.en.title` | en | public-section | sections.13.en.title | Questions, answered plainly | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.0.th.q` | mixed | public-section | sections.13.items.0.th.q | ต้องจ่ายค่าที่ปรึกษาให้ CoverMate ไหม | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.0.th.a` | mixed | public-section | sections.13.items.0.th.a | ไม่มีค่าที่ปรึกษาเพิ่มเติมจาก CoverMate ค่าตอบแทนในการให้บริการมาจากบริษัทประกันภัยเมื่อมีการออกกรมธรรม์ โดยเบี้ยประกันเป็นไปตามอัตราและเงื่อนไขของบริษัทประกันภัย | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.0.en.q` | en | public-section | sections.13.items.0.en.q | Does CoverMate charge a consultation fee? | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.0.en.a` | en | public-section | sections.13.items.0.en.a | No additional consultation fee is charged by CoverMate. Compensation comes from the insurer when a policy is issued, and premiums follow the insurer’s filed rates and conditions. | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.1.th.q` | th | public-section | sections.13.items.1.th.q | มีประกันอยู่แล้ว ย้ายมาให้ดูแลได้ไหม | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.1.th.a` | th | public-section | sections.13.items.1.th.a | สำหรับประกันรถยนต์สามารถเปลี่ยนนายหน้าได้เมื่อต่ออายุ ส่วนประกันชีวิตที่มีอยู่แล้วยังคงอยู่กับตัวแทนเดิม แต่เราสามารถช่วยตรวจทานกรมธรรม์เดิมให้โดยไม่มีค่าใช้จ่าย | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.1.en.q` | en | public-section | sections.13.items.1.en.q | Can existing cover be transferred for review? | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.1.en.a` | en | public-section | sections.13.items.1.en.a | For motor insurance, the broker can usually be changed at renewal. Existing life policies remain with the original agent, but we can review them for gaps or overlap at no charge. | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.2.th.q` | th | public-section | sections.13.items.2.th.q | จะถูกติดต่อซ้ำ ๆ หรือไม่ | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.2.th.a` | th | public-section | sections.13.items.2.th.a | เราจะให้ข้อมูลที่เกี่ยวข้องและให้คุณตัดสินใจตามจังหวะของคุณ หากยังไม่ประสงค์ดำเนินการต่อ เราจะไม่ติดต่อเพื่อติดตามการขาย เว้นแต่คุณขอให้เราแจ้งเตือน | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.2.en.q` | en | public-section | sections.13.items.2.en.q | Will CoverMate follow up repeatedly? | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.2.en.a` | en | public-section | sections.13.items.2.en.a | We provide the relevant information and let you decide at your own pace. If you prefer not to proceed, we will not follow up for sales unless you ask for a reminder. | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.3.th.q` | mixed | public-section | sections.13.items.3.th.q | เบี้ยผ่าน CoverMate แพงกว่าซื้อออนไลน์ไหม | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.3.th.a` | mixed | public-section | sections.13.items.3.th.a | เบี้ยประกันเป็นไปตามอัตราและเงื่อนไขของบริษัทประกันภัย การใช้บริการผ่าน CoverMate ไม่มีค่าที่ปรึกษาเพิ่มเติม และเราช่วยเปรียบเทียบเงื่อนไขให้ก่อนตัดสินใจ | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.3.en.q` | en | public-section | sections.13.items.3.en.q | Is it more expensive than buying online? | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.3.en.a` | en | public-section | sections.13.items.3.en.a | Premiums follow the insurer’s rates and conditions. Using CoverMate adds no separate consultation fee, and we help compare the conditions before you decide. | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.4.th.q` | th | public-section | sections.13.items.4.th.q | เคลมยากไหม ถ้าเคลมแล้วไม่ได้ล่ะ | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.4.th.a` | th | public-section | sections.13.items.4.th.a | เมื่อเกิดการเคลม เราช่วยตรวจสอบเอกสารและประสานงานกับบริษัทประกันภัยตามขั้นตอน หากมีการปฏิเสธการเคลม เราสามารถช่วยตรวจสอบเหตุผลและประสานงานเรื่องการทบทวนหรืออุทธรณ์ตามช่องทางที่เกี่ยวข้อง | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.4.en.q` | en | public-section | sections.13.items.4.en.q | What if a claim gets refused? | Candidate for copy refinement. |
| `repo-defaults:sections.13.items.4.en.a` | en | public-section | sections.13.items.4.en.a | When a claim occurs, we can help check documents and coordinate with the insurer through the required process. If a claim is refused, we can review the reason and help with the relevant review or appeal channel. | Candidate for copy refinement. |
| `repo-defaults:sections.14.th.kicker` | th | public-section | sections.14.th.kicker | โครงสร้างค่าตอบแทน · อธิบายอย่างชัดเจน | Candidate for copy refinement. |
| `repo-defaults:sections.14.th.title` | th | public-section | sections.14.th.title | ค่าตอบแทนในการให้บริการ<br>มาจากไหน | Candidate for copy refinement. |
| `repo-defaults:sections.14.th.body` | th | public-section | sections.14.th.body | ความโปร่งใสเรื่องค่าตอบแทนเป็นส่วนสำคัญของการให้คำแนะนำ เราจึงอธิบายไว้ล่วงหน้าว่าค่าตอบแทนในการให้บริการมาจากช่องทางใด | Candidate for copy refinement. |
| `repo-defaults:sections.14.th.note` | mixed | public-section | sections.14.th.note | เบี้ยประกันเป็นอัตราที่บริษัทประกันภัยยื่นและได้รับความเห็นชอบจาก คปภ. การใช้บริการผ่าน CoverMate ไม่มีค่าที่ปรึกษาเพิ่มเติม | Candidate for copy refinement. |
| `repo-defaults:sections.14.en.kicker` | en | public-section | sections.14.en.kicker | Compensation structure · explained clearly | Candidate for copy refinement. |
| `repo-defaults:sections.14.en.title` | en | public-section | sections.14.en.title | Where our<br>service compensation comes from | Candidate for copy refinement. |
| `repo-defaults:sections.14.en.body` | en | public-section | sections.14.en.body | Transparency about compensation is part of giving trustworthy advice. We explain in advance how CoverMate is compensated for the service. | Candidate for copy refinement. |
| `repo-defaults:sections.14.en.note` | en | public-section | sections.14.en.note | Premiums are filed with and approved by the OIC. Using CoverMate adds no separate consultation fee. | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.0.n` | neutral | public-section | sections.14.cards.0.n | 1 | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.0.th.kicker` | th | public-section | sections.14.cards.0.th.kicker | คุณจ่าย | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.0.th.title` | th | public-section | sections.14.cards.0.th.title | เบี้ยประกัน | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.0.th.body` | mixed | public-section | sections.14.cards.0.th.body | ชำระเบี้ยประกันให้บริษัทประกันภัยโดยตรง โดยไม่มีค่าที่ปรึกษาแยกต่างหากจาก CoverMate | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.0.en.kicker` | en | public-section | sections.14.cards.0.en.kicker | You pay | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.0.en.title` | en | public-section | sections.14.cards.0.en.title | The premium | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.0.en.body` | en | public-section | sections.14.cards.0.en.body | Premiums are paid to the insurer directly, with no separate advisory fee from CoverMate. | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.1.n` | neutral | public-section | sections.14.cards.1.n | 2 | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.1.th.kicker` | th | public-section | sections.14.cards.1.th.kicker | บริษัทประกันภัยจ่าย | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.1.th.title` | th | public-section | sections.14.cards.1.th.title | ค่าตอบแทนการให้บริการ | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.1.th.body` | th | public-section | sections.14.cards.1.th.body | บริษัทประกันภัยเป็นผู้จ่ายค่าตอบแทนตามโครงสร้างของผลิตภัณฑ์ ซึ่งรวมอยู่ในอัตราเบี้ยประกันตามเงื่อนไขที่เกี่ยวข้อง | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.1.en.kicker` | en | public-section | sections.14.cards.1.en.kicker | The insurer pays | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.1.en.title` | en | public-section | sections.14.cards.1.en.title | Service compensation | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.1.en.body` | en | public-section | sections.14.cards.1.en.body | The insurer pays compensation according to the product structure, already reflected in the applicable premium rate. | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.2.n` | neutral | public-section | sections.14.cards.2.n | 3 | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.2.th.kicker` | th | public-section | sections.14.cards.2.th.kicker | แปลว่า | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.2.th.title` | th | public-section | sections.14.cards.2.th.title | ไม่มีค่าที่ปรึกษาเพิ่ม | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.2.th.body` | mixed | public-section | sections.14.cards.2.th.body | การใช้บริการผ่าน CoverMate ไม่มีค่าที่ปรึกษาเพิ่มเติม และเรายังคงช่วยดูแลเรื่องการต่ออายุและการประสานงานเมื่อเกิดการเคลม | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.2.en.kicker` | en | public-section | sections.14.cards.2.en.kicker | Which means | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.2.en.title` | en | public-section | sections.14.cards.2.en.title | No extra advisory fee | Candidate for copy refinement. |
| `repo-defaults:sections.14.cards.2.en.body` | en | public-section | sections.14.cards.2.en.body | Using CoverMate adds no separate advisory fee, while we continue helping with renewals and claim coordination. | Candidate for copy refinement. |
| `repo-defaults:sections.14.items.0.th.label` | th | public-section | sections.14.items.0.th.label | ทำไมถึงต่างกันในแต่ละแบบ | Candidate for copy refinement. |
| `repo-defaults:sections.14.items.0.th.value` | th | public-section | sections.14.items.0.th.value | โครงสร้างค่าตอบแทนแตกต่างกันตามประเภทผลิตภัณฑ์และเงื่อนไขของบริษัทประกันภัย เราอธิบายให้ชัดเจนเมื่อเกี่ยวข้องกับการตัดสินใจ | Candidate for copy refinement. |
| `repo-defaults:sections.14.items.0.en.label` | en | public-section | sections.14.items.0.en.label | Why it differs by product | Candidate for copy refinement. |
| `repo-defaults:sections.14.items.0.en.value` | en | public-section | sections.14.items.0.en.value | Compensation structures differ by product type and insurer conditions. We explain this clearly when it is relevant to your decision. | Candidate for copy refinement. |
| `repo-defaults:sections.14.items.1.th.label` | th | public-section | sections.14.items.1.th.label | สิ่งที่เรายึดถือ | Candidate for copy refinement. |
| `repo-defaults:sections.14.items.1.th.value` | th | public-section | sections.14.items.1.th.value | เราไม่แนะนำผลิตภัณฑ์เพียงเพราะให้ค่าตอบแทนสูงกว่า หากไม่เหมาะกับความต้องการของคุณ และไม่เร่งรัดการตัดสินใจด้วยแรงกดดันจากโปรโมชั่น | Candidate for copy refinement. |
| `repo-defaults:sections.14.items.1.en.label` | en | public-section | sections.14.items.1.en.label | What we stand by | Candidate for copy refinement. |
| `repo-defaults:sections.14.items.1.en.value` | en | public-section | sections.14.items.1.en.value | We do not recommend a higher-paying product if it is not suitable for your needs, and we do not rush decisions with promotion pressure. | Candidate for copy refinement. |
| `repo-defaults:sections.14.items.2.th.label` | th | public-section | sections.14.items.2.th.label | สอบถามได้โดยตรง | Candidate for copy refinement. |
| `repo-defaults:sections.14.items.2.th.value` | th | public-section | sections.14.items.2.th.value | หากต้องการทราบโครงสร้างค่าตอบแทนของแบบประกันที่เสนอ สามารถสอบถามเราได้โดยตรง | Candidate for copy refinement. |
| `repo-defaults:sections.14.items.2.en.label` | en | public-section | sections.14.items.2.en.label | Ask directly | Candidate for copy refinement. |
| `repo-defaults:sections.14.items.2.en.value` | en | public-section | sections.14.items.2.en.value | If you want to understand the compensation structure for a proposed plan, you can ask us directly. | Candidate for copy refinement. |
| `repo-defaults:sections.14.items.3.th.label` | th | public-section | sections.14.items.3.th.label | ถ้าไม่ดำเนินการต่อ | Candidate for copy refinement. |
| `repo-defaults:sections.14.items.3.th.value` | th | public-section | sections.14.items.3.th.value | การตรวจกรมธรรม์เดิม ตอบคำถาม หรือช่วยดูขั้นตอนเบื้องต้นเมื่อเกิดการเคลม ไม่มีค่าใช้จ่าย และเราจะไม่ติดตามการขายหากคุณไม่ได้ขอ | Candidate for copy refinement. |
| `repo-defaults:sections.14.items.3.en.label` | en | public-section | sections.14.items.3.en.label | If you do not proceed | Candidate for copy refinement. |
| `repo-defaults:sections.14.items.3.en.value` | en | public-section | sections.14.items.3.en.value | Reviewing an existing policy, answering questions or helping with initial claim steps is at no charge, and we will not follow up for sales unless you ask us to. | Candidate for copy refinement. |
| `repo-defaults:sections.15.th.kicker` | th | public-section | sections.15.th.kicker | พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล | Candidate for copy refinement. |
| `repo-defaults:sections.15.th.title` | th | public-section | sections.15.th.title | ข้อมูลที่คุณส่งให้เรา<br>ถูกนำไปใช้อย่างไร | Candidate for copy refinement. |
| `repo-defaults:sections.15.th.body` | th | public-section | sections.15.th.body | เราแจ้งรายละเอียดการใช้ข้อมูลไว้ก่อนที่คุณจะส่งข้อมูล เพื่อให้ทราบว่าข้อมูลใดถูกเก็บ ใช้เพื่อวัตถุประสงค์ใด และอาจถูกส่งต่อให้ใครบ้าง | Candidate for copy refinement. |
| `repo-defaults:sections.15.th.note` | mixed | public-section | sections.15.th.note | หากต้องการขอเข้าถึง แก้ไข หรือลบข้อมูล สามารถติดต่อเราทาง LINE หรือโทรศัพท์ได้ เราจะดำเนินการตามระยะเวลาที่กฎหมายกำหนด | Candidate for copy refinement. |
| `repo-defaults:sections.15.en.kicker` | en | public-section | sections.15.en.kicker | Thai PDPA | Candidate for copy refinement. |
| `repo-defaults:sections.15.en.title` | en | public-section | sections.15.en.title | How we use<br>the information you provide | Candidate for copy refinement. |
| `repo-defaults:sections.15.en.body` | en | public-section | sections.15.en.body | We explain how information is used before you send it, so you know what is collected, why it is used, and who it may be shared with. | Candidate for copy refinement. |
| `repo-defaults:sections.15.en.note` | en | public-section | sections.15.en.note | To request access, correction or deletion of your personal data, contact us by LINE or telephone. We will process the request within the period required by law. | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.0.th.label` | th | public-section | sections.15.items.0.th.label | เก็บอะไร | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.0.th.value` | th | public-section | sections.15.items.0.th.value | ชื่อที่ให้เรียก ช่องทางติดต่อ และข้อมูลที่คุณเลือกแจ้ง เช่น อายุ รายได้โดยประมาณ หรือกรมธรรม์ที่ถืออยู่ | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.0.en.label` | en | public-section | sections.15.items.0.en.label | What is collected | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.0.en.value` | en | public-section | sections.15.items.0.en.value | The name you provide, how to reach you, and information you choose to share, such as age, approximate income or policies held. | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.1.th.label` | th | public-section | sections.15.items.1.th.label | ใช้ทำอะไร | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.1.th.value` | th | public-section | sections.15.items.1.th.value | ใช้เพื่อตอบคำถาม ตรวจสอบความต้องการ และจัดทำทางเลือกหรือใบเสนอราคาตามที่คุณขอ | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.1.en.label` | en | public-section | sections.15.items.1.en.label | What it is used for | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.1.en.value` | en | public-section | sections.15.items.1.en.value | To answer questions, understand your needs, and prepare options or quotations you request. | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.2.th.label` | th | public-section | sections.15.items.2.th.label | ส่งต่อให้ใคร | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.2.th.value` | th | public-section | sections.15.items.2.th.value | ส่งให้บริษัทประกันภัยหรือผู้ประมวลผลที่เกี่ยวข้องเฉพาะเมื่อจำเป็นต่อการขอใบเสนอราคา การสมัคร หรือการดำเนินการตามที่คุณยินยอม | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.2.en.label` | en | public-section | sections.15.items.2.en.label | Who it is shared with | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.2.en.value` | en | public-section | sections.15.items.2.en.value | Shared with the relevant insurer or processor only when needed for a quotation, application or action you consent to. | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.3.th.label` | th | public-section | sections.15.items.3.th.label | เก็บนานเท่าไหร่ | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.3.th.value` | th | public-section | sections.15.items.3.th.value | ถ้าไม่ได้ทำกรมธรรม์ ลบภายใน 12 เดือน ถ้าทำแล้ว เก็บตามอายุกรมธรรม์บวก 10 ปีตามที่กฎหมายประกันภัยกำหนด | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.3.en.label` | en | public-section | sections.15.items.3.en.label | How long it is kept | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.3.en.value` | en | public-section | sections.15.items.3.en.value | If nothing is arranged, deleted within 12 months. If a policy is issued, kept for its term plus the 10 years insurance law requires. | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.4.th.label` | th | public-section | sections.15.items.4.th.label | สิทธิของคุณ | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.4.th.value` | th | public-section | sections.15.items.4.th.value | ขอดู ขอสำเนา ขอแก้ไข ขอให้ลบ ขอให้หยุดใช้ หรือถอนความยินยอมได้ทุกเมื่อ และร้องเรียนต่อสำนักงาน คปภ. หรือ สคส. ได้ | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.4.en.label` | en | public-section | sections.15.items.4.en.label | Your rights | Candidate for copy refinement. |
| `repo-defaults:sections.15.items.4.en.value` | en | public-section | sections.15.items.4.en.value | Access, a copy, correction, deletion, restriction, or withdrawal of consent at any time — plus the right to complain to the OIC or the PDPC. | Candidate for copy refinement. |
| `repo-defaults:sections.16.th.kicker` | th | public-section | sections.16.th.kicker | ติดต่อเรา | Candidate for copy refinement. |
| `repo-defaults:sections.16.th.title` | th | public-section | sections.16.th.title | ขอรับคำปรึกษา | Candidate for copy refinement. |
| `repo-defaults:sections.16.th.body` | th | public-section | sections.16.th.body | แจ้งชื่อและเรื่องที่ต้องการทราบ เราจะตอบกลับพร้อมข้อมูลที่เกี่ยวข้องและทางเลือกที่ชัดเจน โดยไม่มีค่าใช้จ่ายและไม่มีข้อผูกมัด | Candidate for copy refinement. |
| `repo-defaults:sections.16.th.note` | mixed | public-section | sections.16.th.note | หากไม่สะดวกกรอกแบบฟอร์ม สามารถติดต่อเราทาง LINE ได้โดยตรง | Candidate for copy refinement. |
| `repo-defaults:sections.16.en.kicker` | en | public-section | sections.16.en.kicker | Contact us | Candidate for copy refinement. |
| `repo-defaults:sections.16.en.title` | en | public-section | sections.16.en.title | Request a consultation | Candidate for copy refinement. |
| `repo-defaults:sections.16.en.body` | en | public-section | sections.16.en.body | Leave your name and let us know what you would like to discuss. We will respond with clear, relevant information and available options, with no consultation fee or obligation. | Candidate for copy refinement. |
| `repo-defaults:sections.16.en.note` | en | public-section | sections.16.en.note | You can also contact us directly on LINE. | Candidate for copy refinement. |

## Visible Header / Footer / Brand / Contact Copy

| ID | Lang | Surface | Path/Field | Current text | Guidance |
| --- | --- | --- | --- | --- | --- |
| `repo-defaults:brand.name.th` | th | brand | brand.name.th | CoverMate | Candidate for copy refinement. |
| `repo-defaults:brand.name.en` | en | brand | brand.name.en | CoverMate | Candidate for copy refinement. |
| `repo-defaults:brand.fullName.th` | th | brand | brand.fullName.th | CoverMate | Candidate for copy refinement. |
| `repo-defaults:brand.fullName.en` | en | brand | brand.fullName.en | CoverMate | Candidate for copy refinement. |
| `repo-defaults:brand.role.th` | th | brand | brand.role.th | ที่ปรึกษาประกันภัย | Candidate for copy refinement. |
| `repo-defaults:brand.role.en` | en | brand | brand.role.en | Insurance Advisory | Candidate for copy refinement. |
| `repo-defaults:contact.lineId` | en | contact | contact.lineId | @CoverMate | Candidate for copy refinement. |
| `repo-defaults:contact.facebookName` | en | contact | contact.facebookName | CoverMate Insurance | Candidate for copy refinement. |
| `repo-defaults:contact.email` | en | contact | contact.email | purich@example.com | Candidate for copy refinement. |
| `repo-defaults:contact.hours.th` | th | contact | contact.hours.th | จันทร์–เสาร์ 9:00–20:00 น. | Candidate for copy refinement. |
| `repo-defaults:contact.hours.en` | en | contact | contact.hours.en | Mon–Sat, 9am–8pm | Candidate for copy refinement. |
| `repo-defaults:contact.area.th` | th | contact | contact.area.th | กรุงเทพฯ และปริมณฑล · นัดเจอหรือคุยออนไลน์ได้ | Candidate for copy refinement. |
| `repo-defaults:contact.area.en` | en | contact | contact.area.en | Bangkok & around · in person or online | Candidate for copy refinement. |
| `repo-defaults:header.cta.th` | th | public-header | header.cta.th | ติดต่อทาง LINE | Candidate for copy refinement. |
| `repo-defaults:header.cta.en` | en | public-header | header.cta.en | Contact on LINE | Candidate for copy refinement. |
| `repo-defaults:header.nav.0.label.th` | th | public-header | header.nav.0.label.th | ความคุ้มครอง | Candidate for copy refinement. |
| `repo-defaults:header.nav.0.label.en` | en | public-header | header.nav.0.label.en | Cover | Candidate for copy refinement. |
| `repo-defaults:header.nav.1.label.th` | th | public-header | header.nav.1.label.th | ตรวจกรมธรรม์ | Candidate for copy refinement. |
| `repo-defaults:header.nav.1.label.en` | en | public-header | header.nav.1.label.en | Policy review | Candidate for copy refinement. |
| `repo-defaults:header.nav.2.label.th` | th | public-header | header.nav.2.label.th | ประกันรถยนต์ | Candidate for copy refinement. |
| `repo-defaults:header.nav.2.label.en` | en | public-header | header.nav.2.label.en | Motor | Candidate for copy refinement. |
| `repo-defaults:header.nav.3.label.th` | th | public-header | header.nav.3.label.th | เครื่องมือ | Candidate for copy refinement. |
| `repo-defaults:header.nav.3.label.en` | en | public-header | header.nav.3.label.en | Resources | Candidate for copy refinement. |
| `repo-defaults:header.nav.4.label.th` | th | public-header | header.nav.4.label.th | คำถามที่พบบ่อย | Candidate for copy refinement. |
| `repo-defaults:footer.tagline.th` | th | public-footer | footer.tagline.th | ประกันชีวิต สุขภาพ และรถยนต์ · ให้คำปรึกษาโดยไม่มีค่าใช้จ่าย | Candidate for copy refinement. |
| `repo-defaults:footer.tagline.en` | en | public-footer | footer.tagline.en | Life, health and motor insurance · consultation at no charge | Candidate for copy refinement. |

## Protected Or Guarded Copy

| ID | Lang | Surface | Path/Field | Current text | Guidance |
| --- | --- | --- | --- | --- | --- |
| `repo-defaults:brand.credential.th` | th | brand | brand.credential.th | ตัวแทน AIA · นายหน้าประกันรถยนต์ · ดูแลถึงการเคลม | Do not change licence numbers, legal assertions, or compliance meaning without owner/legal approval. |
| `repo-defaults:brand.credential.en` | en | brand | brand.credential.en | AIA agent · motor broker · support through claims | Do not change licence numbers, legal assertions, or compliance meaning without owner/legal approval. |
| `repo-defaults:footer.legal.th` | th | public-footer | footer.legal.th | CoverMate · ตัวแทนประกันชีวิตและนายหน้าประกันวินาศภัยที่ได้รับใบอนุญาต · ใบอนุญาตตัวแทนประกันชีวิต 6401006221 · ใบอนุญาตนายหน้าประกันวินาศภัย 6804008544 · ประกันรถยนต์จัดผ่านศรีกรุงโบรคเกอร์ ใบอนุญาตนายหน้าประกันวินาศภัยเลขที่ ว00287/2534 · เนื้อหาบนหน้านี้เป็นข้อมูลเบื้องต้น ไม่ใช่ใบเสนอราคา | Do not change licence numbers, legal assertions, or compliance meaning without owner/legal approval. |
| `repo-defaults:footer.legal.en` | en | public-footer | footer.legal.en | CoverMate — insurance advisory · Licensed life agent (No. 6401006221) and non-life broker (No. 6804008544) · Motor cover placed through Srikrung Broker, non-life broker licence No. ว00287/2534 · Information here is indicative and is not a quotation. | Do not change licence numbers, legal assertions, or compliance meaning without owner/legal approval. |
| `repo-defaults:sections.5.cards.0.th.body` | mixed | public-section | sections.5.cards.0.th.body | ใบอนุญาตตัวแทนประกันชีวิตเลขที่ 6401006221 · ประกันชีวิตและสุขภาพ เราดูแลในฐานะตัวแทน AIA โดยตรง กรมธรรม์ออกโดย AIA | Do not change licence numbers, legal assertions, or compliance meaning without owner/legal approval. |
| `repo-defaults:sections.5.cards.0.en.body` | en | public-section | sections.5.cards.0.en.body | Life agent licence No. 6401006221 · Life and health insurance is handled directly as an AIA agent. Policies are issued by AIA. | Do not change licence numbers, legal assertions, or compliance meaning without owner/legal approval. |
| `repo-defaults:sections.5.cards.1.th.body` | th | public-section | sections.5.cards.1.th.body | ใบอนุญาตนายหน้าประกันวินาศภัยเลขที่ ว00287/2534 · เราเสนอและจัดเบี้ยประกันรถยนต์ในฐานะนายหน้าภายใต้ศรีกรุงโบรคเกอร์ กรมธรรม์ออกโดยบริษัทประกันที่คุณเลือก | Do not change licence numbers, legal assertions, or compliance meaning without owner/legal approval. |
| `repo-defaults:sections.5.cards.1.en.body` | mixed | public-section | sections.5.cards.1.en.body | Non-life broker licence No. ว00287/2534 · Motor insurance is proposed and placed in a broker capacity under Srikrung Broker. Policies are issued by the insurer you choose. | Do not change licence numbers, legal assertions, or compliance meaning without owner/legal approval. |
| `repo-defaults:sections.12.items.1.th.value` | th | public-section | sections.12.items.1.th.value | ตัวแทนประกันชีวิต 6401006221 · นายหน้าประกันวินาศภัย 6804008544 | Do not change licence numbers, legal assertions, or compliance meaning without owner/legal approval. |
| `repo-defaults:sections.12.items.1.en.value` | en | public-section | sections.12.items.1.en.value | Life agent No. 6401006221 · Non-life broker No. 6804008544 | Do not change licence numbers, legal assertions, or compliance meaning without owner/legal approval. |

## Full Structured Data
See `/Users/point/CoverMate/docs/content/covermate-text-inventory.json` for every extracted entry with metadata.
