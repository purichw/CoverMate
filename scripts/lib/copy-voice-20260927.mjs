// Reviewed copy only. Paths under `source` address the pre-normalized fallback;
// live paths use stable CMS IDs, never the current order of customer-owned rows.
export const copyChanges = [];
function fields(owner, source, values) {
  for (const [key, translations] of Object.entries(values)) {
    for (const [index, lang] of ['th', 'en'].entries()) {
      copyChanges.push({ owner: `${owner}.${lang}.${key}`, source: `${source}.${lang}.${key}`, value: translations[index] });
    }
  }
}
function global(owner, th, en) {
  for (const [lang, value] of Object.entries({ th, en })) copyChanges.push({ owner: `${owner}.${lang}`, source: `${owner}.${lang}`, value });
}
const section = (id, values) => fields(`sections.@${id}`, `sections.@${id}`, values);
const row = (sectionId, id, index, values, collection = 'items') => fields(`sections.@${sectionId}.${collection}.@${id}`, `sections.@${sectionId}.${collection}.${index}`, values);

section('hero', {
  kicker: ['ปรึกษาเรื่องประกันกับ CoverMate', 'Insurance advice from CoverMate'],
  title: ['มีคำถามเรื่องประกัน\nคุยกับเราได้', "Questions about insurance?\nWe're here to help."],
  body: ['ไม่แน่ใจว่าควรทำประกันแบบไหน หรืออยากรู้ว่ากรมธรรม์ที่มีคุ้มครองอะไรบ้าง เราช่วยอ่านและอธิบายให้ได้', "We can help you understand a policy you already have or compare options if you're considering a new one."],
  note: ['ปรึกษาได้โดยไม่มีค่าใช้จ่าย เราตอบกลับในเวลาทำการ', 'Advice is free. We reply during business hours.'],
  cta1: ['คุยทาง LINE', 'Chat on LINE'],
  claimText: ['หากมีผู้เจ็บป่วยฉุกเฉิน โทร 1669', 'For a medical emergency in Thailand, call 1669.']
});
row('trust', 'cmr-trust-items-a12bbda6298248', 0, { label: ['ปรึกษาได้โดยไม่มีค่าใช้จ่าย', 'No consultation fee'] });
row('trust', 'cmr-trust-items-02a121583a8246', 2, { label: ['ติดต่อสะดวกทาง LINE', 'Chat with us on LINE'] });
section('cover', {
  kicker: ['ประเภทประกัน', 'Insurance options'],
  title: ['ประกันที่เราช่วยดูให้ได้', 'Insurance we can help with'],
  body: ['เราเป็นตัวแทน AIA สำหรับประกันชีวิตและสุขภาพ ส่วนประกันรถยนต์ เราช่วยเปรียบเทียบแผนในฐานะนายหน้าผ่านศรีกรุงโบรคเกอร์', 'We are an AIA agent for life and health insurance. For car insurance, we compare options as a broker through Srikrung Broker.']
});
row('cover', 'cmr-cover-items-36e6d756405941', 0, {
  b1: ['ช่วยดูทุนประกัน โดยคุยเรื่องรายได้ หนี้ และคนที่คุณต้องดูแล', 'We help you consider how much cover you need, based on your income, debts and dependants.'],
  b2: ['อธิบายแบบตลอดชีพ ชั่วระยะเวลา สะสมทรัพย์ และบำนาญ ว่าแต่ละแบบต่างกันอย่างไร', 'We explain the differences between whole-life, term, savings and annuity policies.'],
  b3: ['ดูเบี้ย ระยะเวลาจ่าย และผลประโยชน์ของแผนที่สนใจให้เข้าใจก่อนสมัคร', 'We go through premiums, payment periods and benefits before you apply.']
});
row('cover', 'cmr-cover-items-50c52b8b084347', 1, {
  sub: ['ตัวแทน AIA · ค่ารักษาและผลประโยชน์สุขภาพ', 'AIA agent · medical cover and benefits'],
  b1: ['ช่วยดูวงเงินค่ารักษา ค่าห้อง และเงื่อนไขของแผนที่คุณสนใจ', 'We help you compare treatment limits, room benefits and policy terms.'],
  b2: ['เทียบกับโรงพยาบาลที่คุณใช้ งบประมาณ และสวัสดิการที่มีอยู่', 'We take into account your preferred hospital, budget and existing benefits.'],
  b3: ['อธิบายข้อยกเว้น ระยะรอคอย และค่าใช้จ่ายที่อาจต้องจ่ายเอง', 'We explain exclusions, waiting periods and costs you may need to pay yourself.']
});
row('cover', 'cmr-cover-items-404a0b32122643', 2, {
  sub: ['ตัวแทน AIA · เงินก้อนเมื่อเข้าเงื่อนไข', 'AIA agent · lump-sum benefits'],
  b1: ['จ่ายเงินก้อนเมื่อเจ็บป่วยด้วยโรคและเข้าเงื่อนไขที่ระบุในกรมธรรม์', 'Pays a lump sum when an illness meets the conditions set out in the policy.'],
  b2: ['ช่วยดูว่าแผนคุ้มครองโรคอะไร ระยะไหน และมีข้อยกเว้นอะไรบ้าง', 'We explain which illnesses and stages are covered, and what is excluded.'],
  b3: ['พิจารณาวงเงินร่วมกับค่ารักษาและค่าใช้จ่ายระหว่างพักฟื้น', 'We help you consider the benefit amount alongside treatment and recovery expenses.']
});
row('cover', 'cmr-cover-items-b8cf1828018f42', 3, {
  b2: ['ช่วยเทียบวงเงินค่ารักษาและผลประโยชน์กรณีบาดเจ็บหรือทุพพลภาพตามเงื่อนไขของแต่ละแผน', 'We compare medical limits and injury or disability benefits under each plan.'],
  b3: ['ดูร่วมกับลักษณะงาน การเดินทาง และประกันที่มีอยู่แล้ว', 'We consider your work, travel and any cover you already have.']
});
row('cover', 'cmr-cover-items-844fde7deed64f', 4, {
  b1: ['ช่วยดูเบี้ยที่ต้องจ่ายและเงินบำนาญที่จะได้รับตามแผน', 'We explain the premiums and retirement payments set out in the plan.'],
  b2: ['ตรวจช่วงอายุที่เริ่มรับเงิน ระยะเวลารับเงิน และเงื่อนไขให้ครบ', 'We go through when payments start, how long they last and the conditions that apply.'],
  b3: ['พิจารณาร่วมกับเงินออม ภาระค่าใช้จ่าย และแผนเกษียณที่มีอยู่', 'We consider the policy alongside your savings, expenses and existing retirement plans.']
});
row('cover', 'cmr-cover-items-ba2daee850494e', 5, {
  title: ['ประกันรถยนต์', 'Car insurance'],
  b1: ['ช่วยเปรียบเทียบเบี้ยและความคุ้มครองจากบริษัทที่รับประกันรถของคุณ ผ่านศรีกรุงโบรคเกอร์', 'Through Srikrung Broker, we compare premiums and cover from insurers that can insure your car.'],
  b2: ['อธิบายความต่างของแต่ละชั้น รวมถึงทุนประกัน ซ่อมห้างหรือซ่อมอู่ และค่าเสียหายส่วนแรก', 'We explain each class, the sum insured, repair options and excess.'],
  b3: ['สอบถามเรื่อง พ.ร.บ. การต่ออายุ หรือให้ช่วยประสานงานเคลมได้', 'You can also ask about compulsory cover, renewals or help with a claim.']
});
section('about', {
  title: ['เราช่วยเรื่องอะไรได้บ้าง', 'How we can help'],
  body: ['คุณอาจกำลังเลือกประกันฉบับแรก หรือมีกรมธรรม์อยู่แล้วแต่ยังไม่เข้าใจบางข้อ เราช่วยอ่าน อธิบายความคุ้มครองและข้อยกเว้น แล้วคุยกันว่ามีเรื่องไหนควรตรวจเพิ่มเติม หากต้องการเปรียบเทียบแผน เราจะดูทั้งเบี้ย เงื่อนไข และงบประมาณของคุณไปด้วยกัน', "Whether you're looking at your first policy or have questions about one you already hold, we can help. We explain the cover and exclusions, check anything unclear, and compare premiums and terms with your budget in mind."]
});
row('about', 'cmr-about-items-6271c7cde63f4b', 3, { value: ['กรุงเทพฯ และปริมณฑล', 'Bangkok and surrounding areas'] });
section('review', {
  title: ['มีประกันอยู่แล้ว\nให้เราช่วยอ่านได้', 'Already have insurance?\nWe can review it with you.'],
  body: ['ส่งหน้าตารางกรมธรรม์ทาง LINE แล้วบอกจุดที่สงสัย เราจะช่วยดูความคุ้มครอง วงเงิน และเงื่อนไขให้ โดยไม่จำเป็นต้องซื้อประกันเพิ่ม', "Send your policy schedule on LINE and tell us what you'd like to check. We can explain the cover, limits and terms. You don't need to buy another policy."],
  note: ['ก่อนเปลี่ยนหรือยกเลิกกรมธรรม์ ควรตรวจสิทธิและเงื่อนไขของทั้งฉบับเดิมและฉบับใหม่ให้ครบ', 'Before changing or cancelling a policy, check the benefits and conditions of both the existing policy and any replacement.']
});
row('review', 'cmr-review-items-4ecc6cd23d9548', 0, {
  title: ['ต้องส่งอะไรบ้าง?', 'What should I send?'],
  body: ['เริ่มจากหน้าตารางที่แสดงทุนประกันและความคุ้มครอง ถ่ายให้เห็นข้อความชัด และปิดข้อมูลส่วนตัวที่ไม่จำเป็น เช่น เลขบัตรประชาชน ก่อนส่ง', 'Start with a clear photo of the schedule showing cover and benefit amounts. Hide unnecessary personal details, such as your ID card number, before sending it.']
});
row('review', 'cmr-review-items-75da0447444a47', 1, {
  title: ['ช่วยดูเรื่องไหนได้บ้าง?', 'What can you check?'],
  body: ['ดูวงเงิน ความคุ้มครองที่ซ้ำกัน และข้อจำกัดที่ควรรู้ โดยเทียบกับสิ่งที่คุณต้องการและสวัสดิการที่มีอยู่', 'We review limits, overlapping benefits and restrictions, alongside your needs and any benefits you already have.']
});
row('review', 'cmr-review-items-fb08c021986243', 2, {
  title: ['จะได้รับคำแนะนำแบบไหน?', 'What will you explain?'],
  body: ['เราสรุปให้ว่ากรมธรรม์คุ้มครองอะไร มีข้อไหนควรตรวจเพิ่มเติม และตอบคำถามที่คุณสงสัย', "We summarise what the policy covers, flag anything that needs checking and answer your questions."]
});
section('insurers', {
  body: ['เราเป็นตัวแทน AIA สำหรับประกันชีวิตและสุขภาพ และเป็นนายหน้าประกันรถยนต์ผ่านศรีกรุงโบรคเกอร์ กรมธรรม์ออกโดยบริษัทประกันที่คุณเลือก', 'We are an AIA agent for life and health insurance and a car insurance broker through Srikrung Broker. Your policy is issued by the insurer you choose.'],
  cta1: ['ดูประกันรถยนต์', 'View car insurance']
});
row('insurers', 'cmr-insurers-cards-ee2195cac9c04b', 0, {
  body: ['ใบอนุญาตตัวแทนประกันชีวิตเลขที่ {{lifeLicence}} · เราให้คำปรึกษาและดูแลการสมัครประกันชีวิตและสุขภาพของ AIA โดย AIA เป็นผู้ออกกรมธรรม์', 'Life agent licence No. {{lifeLicence}}. We advise on AIA life and health insurance and help with applications. AIA issues the policy.']
}, 'cards');
row('insurers', 'cmr-insurers-cards-0f066fb5d6884b', 1, {
  body: ['ศรีกรุงโบรคเกอร์ ใบอนุญาตนายหน้าประกันวินาศภัยเลขที่ {{brokerLicence}} · เราช่วยเปรียบเทียบและจัดทำประกันรถยนต์ผ่านศรีกรุงโบรคเกอร์ โดยบริษัทประกันที่คุณเลือกเป็นผู้ออกกรมธรรม์', 'Srikrung Broker, non-life broker licence No. {{brokerLicence}}. We compare and arrange car insurance through Srikrung Broker. The insurer you choose issues the policy.']
}, 'cards');
section('tiers', {
  title: ['ประกันรถยนต์แต่ละชั้น\nต่างกันอย่างไร?', 'How do the car insurance\nclasses compare?'],
  note: ['ตารางนี้เป็นข้อมูลสรุป วงเงินและข้อยกเว้นขึ้นอยู่กับกรมธรรม์ของแต่ละบริษัท หากไม่แน่ใจว่าข้อไหนหมายถึงอะไร ถามเราได้', 'This is a summary. Limits and exclusions depend on the policy and insurer. Ask us if anything is unclear.']
});
for (const [id, index, tagTh, tagEn, th, en] of [
  ['cmr-tiers-items-e09d0303aa5a42', 0, 'รวมการชนแบบไม่มีคู่กรณี', 'Includes single-vehicle accidents', 'คุ้มครองรถตัวเองและคู่กรณีตามเงื่อนไข รวมถึงอุบัติเหตุที่ไม่มีคู่กรณี', 'Covers your car and third-party liability, including single-vehicle accidents, subject to policy terms.'],
  ['cmr-tiers-items-c29d9e1307cc4c', 1, 'ชนรถ รถหาย และไฟไหม้', 'Collision, theft and fire', 'คุ้มครองรถตัวเองเมื่อชนกับยานพาหนะที่ระบุคู่กรณีได้ รวมถึงรถหายและไฟไหม้ตามเงื่อนไข', 'Own-car cover for collisions with an identified vehicle, plus theft and fire, subject to policy terms.'],
  ['cmr-tiers-items-06f5627586f14b', 2, 'รถหายและไฟไหม้', 'Theft and fire', 'คุ้มครองคู่กรณี และรถตัวเองกรณีรถหายหรือไฟไหม้ตามเงื่อนไข ไม่รวมความเสียหายจากการชนของรถตัวเอง', 'Third-party liability, plus theft and fire cover for your car. Does not cover collision damage to your own car.'],
  ['cmr-tiers-items-c45bdaf15bb44c', 3, 'ชนกับยานพาหนะที่ระบุได้', 'Identified-vehicle collisions', 'คุ้มครองรถตัวเองเมื่อชนกับยานพาหนะที่ระบุคู่กรณีได้ และความรับผิดต่อคู่กรณีตามเงื่อนไข', 'Own-car cover for collisions with an identified vehicle, and third-party liability, subject to policy terms.'],
  ['cmr-tiers-items-b490d2e901ee43', 4, 'ความรับผิดต่อคู่กรณี', 'Third-party liability', 'คุ้มครองความรับผิดต่อคู่กรณี ไม่รวมความเสียหายของรถตัวเอง', 'Covers third-party liability, not damage to your own car.']
]) row('tiers', id, index, { tag: [tagTh, tagEn], value: [th, en] });
section('talk', { title: ['มีเรื่องอยากถาม คุยกับเราได้', 'What would you like to ask?'] });
section('renew', {
  title: ['ให้ช่วยเตือนวันต่ออายุประกันไหม?', 'Would you like a renewal reminder?'],
  note: ['เราใช้ข้อมูลนี้เพื่อติดตามเรื่องต่ออายุที่คุณแจ้งไว้ หากไม่ต้องการให้เตือนต่อ บอกเราทาง LINE ได้', 'We use these details to follow up on the renewal you requested. Let us know on LINE if you no longer want reminders.']
});
row('renew', 'cmr-renew-items-53a8cb7ced184d', 0, { title: ['แจ้งก่อนถึงวันต่ออายุ', 'A reminder before renewal'], body: ['ฝากเดือนที่กรมธรรม์หมดอายุไว้ เพื่อให้เราติดต่อกลับและช่วยเตรียมเรื่องต่ออายุ', 'Leave your expiry month so we can get in touch and help you prepare for renewal.'] });
row('renew', 'cmr-renew-items-81333c21059f49', 1, { title: ['ช่วยเปรียบเทียบอีกครั้ง', 'Compare your options again'], body: ['สำหรับรถยนต์ เราช่วยดูเบี้ยและเงื่อนไขที่เสนอในรอบต่ออายุ เทียบกับกรมธรรม์เดิมให้ได้', 'For car insurance, we can compare renewal quotes and terms with your current policy.'] });
row('renew', 'cmr-renew-items-9597e9c00d7943', 2, { title: ['ใช้ข้อมูลอะไรบ้าง?', 'What details do you need?'] });
section('faq', { kicker: ['', ''], title: ['คำถามที่พบบ่อย', 'Frequently asked questions'] });
const faqs = [
  ['cmr-faq-items-f8cbb67b759246', 'ปรึกษาเรื่องประกัน มีค่าใช้จ่ายไหม?', 'Is there a fee for advice?', 'ไม่มีค่าปรึกษาจาก CoverMate คุณถามหรือให้ช่วยอ่านกรมธรรม์เดิมได้ โดยไม่จำเป็นต้องซื้อประกัน หากมีการทำประกัน เราได้รับค่าตอบแทนจากบริษัทประกันตามเงื่อนไขของแต่ละผลิตภัณฑ์', "We don't charge for advice or for reviewing an existing policy. You don't need to buy insurance. If a policy is arranged, we receive commission from the insurer under the terms for that product."],
  ['cmr-faq-items-d8f52e62a52f49', 'มีประกันอยู่แล้ว ให้ช่วยดูได้ไหม?', 'Can you help me review a policy I already have?', 'ได้ ส่งหน้าตารางกรมธรรม์มาและบอกเรื่องที่สงสัย เราช่วยอธิบายความคุ้มครองและเงื่อนไขให้ได้ ส่วนการเปลี่ยนผู้ดูแลหรือนายหน้าเป็นอีกเรื่องหนึ่ง ต้องตรวจขั้นตอนกับบริษัทประกันของกรมธรรม์นั้นก่อน', "Yes. Send your policy schedule and tell us what you'd like to check. We can explain the cover and terms. Changing the servicing agent or broker is a separate process that needs to be checked with your insurer."],
  ['cmr-faq-items-312ad113060c4a', 'ถ้าแค่สอบถาม จะมีคนโทรมาตามไหม?', 'Will I get follow-up calls if I only ask a question?', 'คุณสอบถามก่อนได้ เราจะตอบเรื่องที่คุณถามผ่านช่องทางที่แจ้งไว้ หากยังไม่ต้องการทำประกันต่อ บอกเราได้ เราจะไม่โทรติดตามการซื้อ เว้นแต่คุณขอให้ติดต่อกลับ', "You can ask a question without committing to a purchase. We'll reply through the channel you provide. If you're not looking to proceed, let us know. We won't make sales follow-up calls unless you ask us to contact you."],
  ['cmr-faq-items-0d6b81ed6d1b4e', 'ซื้อผ่าน CoverMate แพงกว่าซื้อออนไลน์ไหม?', 'Does buying through CoverMate cost more than buying online?', 'ราคาอาจต่างกันตามแผน ความคุ้มครอง ส่วนลด และช่องทางขาย จึงควรเทียบใบเสนอราคาที่มีเงื่อนไขเดียวกัน หากมีราคาที่ดูไว้อยู่แล้ว ส่งมาให้ช่วยเทียบได้ โดย CoverMate ไม่มีค่าปรึกษาเพิ่มเติม', "Prices can differ by plan, cover, discounts and sales channel. It's worth comparing quotes on the same terms. If you already have a quote, we can help compare it. CoverMate does not charge an additional consultation fee."],
  ['cmr-faq-items-1c03a26a79ce4f', 'ถ้าเคลมไม่ผ่าน ต้องทำยังไง?', 'What can I do if my claim is rejected?', 'ขอเหตุผลและรายละเอียดจากบริษัทประกันก่อน แล้วส่งมาให้เราช่วยอ่านเทียบกับกรมธรรม์ได้ เราช่วยตรวจเอกสารและประสานงานเพื่อขอทบทวนได้ แต่ไม่สามารถรับรองผลการพิจารณาเคลม', "Ask your insurer for the reasons and details of the decision. We can help read these against your policy, check the documents and contact the insurer about a review. We cannot guarantee the outcome."],
  ['cmr-guides-items-ac836217595142', 'ควรเลือกค่าห้องวันละเท่าไหร่?', 'How much cover do I need for hospital room costs?', 'ลองดูค่าห้องของโรงพยาบาลที่คุณมีแนวโน้มใช้ แล้วเทียบกับสวัสดิการและประกันที่มีอยู่ รวมถึงงบที่จ่ายเบี้ยไหว ต้องดูด้วยว่ากรมธรรม์กำหนดวงเงินค่าห้องและค่าใช้จ่ายส่วนอื่นไว้อย่างไร ไม่ใช่ดูตัวเลขค่าห้องอย่างเดียว', 'Check room rates at the hospital you are likely to use, then compare them with your existing benefits and premium budget. Also check how the policy limits room costs and other expenses, rather than looking at the room benefit alone.'],
  ['cmr-guides-items-8c892580c37745', 'ประกันชั้น 3+ ถ้าขับชนเอง เคลมได้ไหม?', 'Does Class 3+ cover an accident with no other vehicle involved?', 'โดยทั่วไป ความเสียหายของรถตัวเองในประกันชั้น 3+ ต้องเกิดจากการชนกับยานพาหนะและระบุคู่กรณีได้ หากชนเสาหรือกำแพงเอง มักไม่อยู่ในความคุ้มครองส่วนนี้ ควรตรวจเงื่อนไขกรมธรรม์ของคุณก่อนแจ้งเคลม', 'Class 3+ generally covers damage to your own car only in a collision with an identified vehicle. Hitting a post or wall is generally not covered under this benefit. Check the terms of your own policy.'],
  ['cmr-guides-items-8296fccb198147', 'ควรทำประกันชีวิตวงเงินเท่าไหร่?', 'How much life insurance do I need?', 'เริ่มจากดูว่ามีใครต้องพึ่งพารายได้ของคุณ มีหนี้หรือค่าใช้จ่ายที่ต้องดูแลเท่าไหร่ และต้องดูแลอีกนานแค่ไหน จากนั้นดูเงินออมและประกันที่มีอยู่ด้วย วงเงินที่เหมาะจะแตกต่างกัน และควรเลือกเบี้ยที่จ่ายต่อเนื่องไหว', 'Consider who depends on your income, the debts and expenses they would need to cover, and for how long. Take your savings and existing insurance into account too. The amount will vary, and premiums need to remain affordable.'],
  ['cmr-guides-items-214f22abea7543', 'ประกันแบบไหนลดหย่อนภาษีได้บ้าง?', 'Which types of insurance qualify for tax deductions?', 'ประกันชีวิต สุขภาพ และบำนาญบางแบบใช้ลดหย่อนได้เมื่อเข้าเงื่อนไขของกรมสรรพากร แต่แต่ละประเภทมีเพดานและเงื่อนไขต่างกัน ควรตรวจหนังสือรับรองเบี้ยประกันและหลักเกณฑ์ของปีภาษีที่จะยื่น หากไม่แน่ใจว่าเบี้ยส่วนไหนใช้สิทธิได้ ให้เราช่วยตรวจข้อมูลกับบริษัทประกันได้', 'Some life, health and annuity policies qualify under Revenue Department rules. Limits and conditions differ. Check your premium certificate and the rules for the relevant tax year. We can help check with the insurer which part of your premium is eligible.']
];
faqs.forEach(([id, qTh, qEn, aTh, aEn], index) => {
  const source = index < 5 ? `sections.@faq.items.${index}` : `sections.@guides.items.${index - 5}`;
  fields(`sections.@faq.items.@${id}`, source, { q: [qTh, qEn], a: [aTh, aEn] });
  if (index >= 5) {
    for (const change of copyChanges.slice(-4)) change.source = change.source.replace(/\.(q|a)$/, (_, field) => field === 'q' ? '.title' : '.body');
    fields(`sections.@faq.items.@${id}`, source, { meta: ['', ''] });
  }
});
section('fees', {
  kicker: ['', ''], title: ['ค่าปรึกษาและค่าตอบแทน', 'Advice fees and commission'],
  body: ['CoverMate ไม่มีค่าปรึกษา หากมีการทำประกัน เราได้รับค่าตอบแทนจากบริษัทประกัน คุณสอบถามเรื่องค่าตอบแทนของแผนที่เสนอได้', 'CoverMate does not charge for advice. If a policy is arranged, we receive commission from the insurer. You can ask us about the commission on a proposed plan.'],
  note: ['เบี้ยอาจต่างกันตามแผน เงื่อนไข ส่วนลด และช่องทางขาย ควรเปรียบเทียบใบเสนอราคาที่มีความคุ้มครองเดียวกัน', 'Premiums can differ by plan, terms, discounts and sales channel. Compare quotes with equivalent cover.']
});
row('fees', 'cmr-fees-items-ffe3af99e5ba45', 0, { label: ['ค่าตอบแทนคิดอย่างไร?', 'How does commission work?'], value: ['อัตราและช่วงเวลาจ่ายค่าตอบแทนขึ้นอยู่กับบริษัทและประเภทประกัน เราอธิบายรายละเอียดของแผนที่เสนอให้คุณได้', 'The rate and payment schedule depend on the insurer and product. We can explain the details of the plan we propose.'] });
row('fees', 'cmr-fees-items-cff7f23f079a48', 1, { label: ['ใช้ข้อมูลอะไรแนะนำแผน?', 'How do you compare plans?'], value: ['เราดูความคุ้มครองที่คุณต้องการ งบประมาณ และเงื่อนไขของแต่ละแผน พร้อมอธิบายข้อจำกัดที่ควรรู้', 'We consider the cover you need, your budget and the terms of each plan, including the limitations.'] });
row('fees', 'cmr-fees-items-df2560497c7640', 2, { label: ['ถามเรื่องค่าตอบแทนได้ไหม?', 'Can I ask about your commission?'], value: ['ได้ หากอยากทราบว่า CoverMate ได้รับค่าตอบแทนจากแผนที่เสนออย่างไร สอบถามเราได้โดยตรง', 'Yes. You can ask us directly how CoverMate is paid for a plan we propose.'] });
row('fees', 'cmr-fees-items-9fb3c674ffff4f', 3, { label: ['ถ้ายังไม่ซื้อประกันล่ะ?', "What if I'm not ready to buy?"], value: ['คุณยังถามหรือให้ช่วยอ่านกรมธรรม์เดิมได้ ไม่มีค่าปรึกษา และไม่จำเป็นต้องซื้อประกันเพิ่ม', 'You can still ask questions or have us review an existing policy. There is no consultation fee or need to buy additional insurance.'] });
row('fees', 'cmr-fees-cards-7c0d9ae28f534d', 0, { body: ['ชำระเบี้ยผ่านช่องทางรับชำระที่บริษัทกำหนด ไม่มีค่าปรึกษาแยกจาก CoverMate', "Pay through the company's designated payment channels. CoverMate does not add a consultation fee."] }, 'cards');
row('fees', 'cmr-fees-cards-a102b13bf81649', 1, { title: ['ค่าตอบแทนของ CoverMate', 'Our commission'], body: ['เมื่อมีการทำประกัน เราได้รับค่าตอบแทนตามข้อตกลงของบริษัทและผลิตภัณฑ์นั้น', 'When a policy is arranged, we receive commission under the terms for that insurer and product.'] }, 'cards');
row('fees', 'cmr-fees-cards-cadcccf29b284b', 2, { kicker: ['ก่อนเลือกแผน', 'Before choosing'], title: ['เทียบราคาและเงื่อนไข', 'Compare prices and terms'], body: ['ดูทั้งเบี้ย วงเงิน ข้อยกเว้น และค่าใช้จ่ายที่ต้องจ่ายเอง เราช่วยอ่านใบเสนอราคาเทียบกันได้', 'Compare premiums, limits, exclusions and costs you would pay yourself. We can help you read quotes side by side.'] }, 'cards');
// Privacy rights, retention and consent wording are deliberately not rewritten.
section('privacy', { title: ['ข้อมูลที่คุณส่งมา\nถูกใช้ทำอะไร?', 'How we use\nyour information'], body: ['ก่อนส่งข้อมูล คุณอ่านรายละเอียดได้ที่นี่ว่าเราเก็บ ใช้ และส่งต่อข้อมูลอย่างไร', 'Before sharing your details, you can read here how we collect, use and share them.'] });

fields('motorPage.hero', 'motorPage.hero', {
  kicker: ['ประกันรถยนต์กับ CoverMate', 'Car insurance with CoverMate'],
  title: ['ให้เราช่วยเทียบ\nประกันรถของคุณ', 'Compare insurance\nfor your car'],
  body: ['ส่งข้อมูลรถและบอกสิ่งที่อยากให้ช่วยดู เราจะเปรียบเทียบเบี้ยและความคุ้มครองจากบริษัทที่รับประกันรถของคุณ พร้อมอธิบายเรื่องซ่อมห้าง ซ่อมอู่ และค่าเสียหายส่วนแรก', "Tell us about your car and what you'd like to check. We compare quotes from insurers that can cover it, and explain repair options, excess and policy limits."],
  cta1: ['คุยเรื่องประกันรถทาง LINE', 'Ask about car insurance'],
  claimText: ['หากมีผู้เจ็บป่วยฉุกเฉิน โทร 1669', 'For a medical emergency in Thailand, call 1669.']
});
fields('motorPage.cover', 'motorPage.cover', {
  title: ['ประกันรถยนต์แต่ละชั้น\nคุ้มครองอะไรบ้าง?', 'What does each class\nof car insurance cover?'],
  body: ['ดูว่าแต่ละชั้นคุ้มครองอะไร แล้วค่อยเทียบวงเงินและเงื่อนไขของแผนที่สนใจ', 'Compare cover, limits and exclusions before choosing a policy.']
});
fields('motorPage.trust.items.@cmr-motor-trust-items-d41c7d35fee045', 'motorPage.trust.items.1', { label: ['ช่วยดูวงเงินและเงื่อนไข', 'Help with limits and terms'] });
fields('motorPage.trust.items.@cmr-motor-trust-items-d5b32a12120b45', 'motorPage.trust.items.2', { label: ['คุยสะดวกทาง LINE', 'Chat with us on LINE'] });
fields('motorPage.cover.items.@cmr-motor-cover-items-7c9f13fc08f64e', 'motorPage.cover.items.0', { sub: ['รวมการชนแบบไม่มีคู่กรณี', 'Includes single-vehicle accidents'], b2: ['พิจารณาร่วมกับมูลค่ารถ เงื่อนไขสัญญาเช่าซื้อ และงบประมาณ', 'Consider your car value, any finance requirements and your budget.'] });
fields('motorPage.cover.items.@cmr-motor-cover-items-b354f5ab2c1447', 'motorPage.cover.items.1', { sub: ['คุ้มครองรถตัวเองเมื่อชนกับยานพาหนะ', 'Own-car cover for vehicle collisions'], b3: ['ตรวจวงเงินและเงื่อนไขการชนให้ชัดเจนก่อนเลือก', 'Check collision limits and conditions before choosing a plan.'] });
fields('motorPage.cover.items.@cmr-motor-cover-items-26ac32372f934b', 'motorPage.cover.items.2', { sub: ['ความรับผิดต่อคู่กรณี', 'Third-party liability'], b3: ['ควรพิจารณาว่ารับผิดชอบค่าซ่อมรถตัวเองได้หรือไม่หากเกิดอุบัติเหตุ', 'Consider whether you could pay for repairs to your own car after an accident.'] });

global('seo.description', 'CoverMate ให้คำปรึกษาประกันชีวิตและสุขภาพ AIA พร้อมช่วยอ่านกรมธรรม์เดิมและเปรียบเทียบประกันรถยนต์ผ่านศรีกรุงโบรคเกอร์', 'Advice on AIA life and health insurance, help reviewing existing policies, and car insurance comparisons through Srikrung Broker.');
global('motorPage.seo.description', 'เปรียบเทียบเบี้ยและความคุ้มครองประกันรถยนต์กับ CoverMate พร้อมอธิบายเรื่องซ่อมห้าง ซ่อมอู่ และค่าเสียหายส่วนแรก', 'Compare car insurance premiums and cover with CoverMate, with help understanding repair options, excess and policy terms.');
global('contact.area', 'กรุงเทพฯ และปริมณฑล · นัดเจอหรือคุยออนไลน์ได้', 'Bangkok and surrounding areas · in-person or online appointments');
global('homeDesign.aboutTeaser', 'ช่วยอ่านกรมธรรม์เดิม อธิบายเงื่อนไข และเปรียบเทียบแผนที่คุณสนใจ', 'Help with existing policies, policy terms and plans you want to compare');
global('homeDesign.comparisonSubtitle', 'ดูความคุ้มครองหลักของแต่ละชั้น', 'Compare the main benefits of each class');
global('homeDesign.contactFormHelper', 'บอกเรื่องที่อยากให้ช่วย พร้อมช่องทางติดต่อกลับ', "Tell us what you'd like help with and how to reach you.");
global('homeDesign.contactReassurance', 'ปรึกษาได้โดยไม่มีค่าใช้จ่าย', 'No consultation fee');
for (const key of ['feesStatement', 'feesClosingStatement', 'privacyStatement', 'privacyClosingStatement', 'licenceStatement', 'comparisonStatement']) global(`homeDesign.${key}`, '', '');
global('publicCopy.tierBestLabel', 'ความคุ้มครองโดยสรุป', 'Cover summary');
global('publicCopy.contactName', 'ชื่อที่ให้เรียก', 'What should we call you?');
global('publicCopy.contactEmailHint', 'สำหรับรับข้อความยืนยันและติดต่อเรื่องที่คุณสอบถาม ไม่ใช่การสมัครรับข่าวสาร', 'For confirmation and replies about your enquiry, not a newsletter subscription.');
global('publicCopy.motorLogoNotice', 'โลโก้เป็นเครื่องหมายการค้าของแต่ละบริษัท · แสดงบริษัทที่เราช่วยเปรียบเทียบประกันรถยนต์ได้', 'Logos belong to their respective owners. These are insurers we can compare car insurance options from.');
global('publicCopy.renewalTitle', 'ขอให้ช่วยเตือนต่ออายุ', 'Request a renewal reminder');
global('publicCopy.renewalSubmit', 'ขอให้แจ้งเตือนต่ออายุ', 'Request a renewal reminder');
global('publicCopy.renewalSuccess', 'ได้รับคำขอแจ้งเตือนต่ออายุแล้ว', 'We have received your request for a renewal reminder.');
global('contactSubmission.successTitle', 'ได้รับข้อมูลแล้ว', "We've received your enquiry.");
global('contactSubmission.successBody', 'เราจะติดต่อกลับตามช่องทางที่คุณแจ้งไว้', "We'll reply using the contact details you provided.");
global('contactSubmission.successOptional', 'ส่งข้อมูลเรียบร้อยแล้ว ไม่จำเป็นต้องส่งซ้ำทาง LINE', 'Your enquiry has been submitted. You do not need to send it again on LINE.');
global('contactSubmission.successIntro', 'หากมีเรื่องอยากบอกเพิ่มเติม คุยต่อทาง LINE ได้', "If there's anything else you'd like to add, you can message us on LINE.");
global('ui.submitSuccess', 'ได้รับข้อมูลแล้ว เราจะติดต่อกลับตามช่องทางที่คุณแจ้งไว้', "We've received your enquiry and will reply using the details you provided.");
global('homeDesign.articlesTitle', 'บทความเรื่องประกัน', 'Insurance guides');
global('homeDesign.articlesIntro', 'คำอธิบายเรื่องความคุ้มครอง การเลือกประกัน และการเคลม', 'Guides to understanding cover, comparing policies and making a claim');
global('articlesPage.title', 'บทความเรื่องประกัน', 'Insurance guides');
global('articlesPage.intro', 'รวมคำอธิบายเรื่องความคุ้มครอง การเลือกประกัน และการเคลม ถ้าอ่านแล้วยังมีข้อสงสัย ถามเราได้', 'Read about cover, choosing a policy and making a claim. Ask us if you have questions.');
global('articlesPage.latestSort', 'ใหม่สุดก่อน', 'Newest first');
global('articlesPage.oldestSort', 'เก่าสุดก่อน', 'Oldest first');
global('articlesPage.ctaTitle', 'อ่านแล้วมีคำถามเพิ่มเติมไหม?', "Have a question about what you've read?");
global('articlesPage.ctaBody', 'ถามเรื่องที่ยังไม่เข้าใจ หรือให้ช่วยดูว่าข้อมูลนี้เกี่ยวกับกรมธรรม์ของคุณอย่างไรได้ทาง LINE ไม่มีค่าปรึกษา', "Ask us on LINE if anything is unclear or you'd like help relating it to your policy. There is no consultation fee.");
global('articlesPage.ctaLabel', 'คุยทาง LINE', 'Chat on LINE');
global('articleDetail.note', '', '');
global('articleDetail.saveHint', 'บันทึกบทความในเบราว์เซอร์นี้', 'Save this article in this browser');
global('articleDetail.savedMessage', 'บันทึกในเบราว์เซอร์นี้แล้ว', 'Saved in this browser');
global('footer.statement', '', '');
global('footer.categoryLine', 'LIFE · HEALTH · MOTOR', 'LIFE · HEALTH · MOTOR');
global('footer.navHeading', 'ข้อมูลเพิ่มเติม', 'More information');
global('footer.navHelper', '', '');
global('footer.contactHeading', 'ติดต่อเรา', 'Contact us');
global('footer.contactHelper', '', '');
global('errorPage.statement', '', '');
global('errorPage.unavailableTitle', 'หน้านี้เปิดไม่ได้ชั่วคราว', 'This page is temporarily unavailable');
