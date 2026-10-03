// Content-only preparation for an explicitly authorized Website Draft update.
// Never imported by visitor/admin startup code; this module performs no writes.
// One authored example set for legacy bundled placeholders. These describe
// possible preparation steps, never real customers, claim outcomes or cover.
export const CLAIM_GUIDANCE_EXAMPLES = {
  th: {
    section: {kicker:'ตัวอย่างการช่วยเหลือ',title:'เรื่องเคลม เริ่มจากขั้นตอนที่ชัดเจน',body:'ตัวอย่างสถานการณ์สำหรับเตรียมข้อมูลและคุยกับบริษัทประกัน ไม่ใช่ประสบการณ์ของลูกค้าจริง',note:'ขั้นตอน เอกสาร และผลพิจารณาขึ้นอยู่กับเงื่อนไขกรมธรรม์และบริษัทประกัน'},
    label:'ตัวอย่างสถานการณ์',valueNote:'ไม่ใช่เคสลูกค้าจริง',meta:'ตรวจสอบกับบริษัทประกัน',
    items:[
      ['แจ้งเหตุ','รถเกิดอุบัติเหตุ ไม่แน่ใจว่าควรเริ่มจากตรงไหน','ติดต่อบริษัทประกันตามช่องทางในกรมธรรม์ เตรียมเลขกรมธรรม์และข้อมูลเหตุการณ์ แล้วสอบถามขั้นตอนที่บริษัทกำหนด'],
      ['เตรียมเอกสาร','ต้องยื่นเคลมค่ารักษา แต่ยังไม่แน่ใจว่าต้องใช้เอกสารอะไร','ขอรายการเอกสารจากบริษัทประกัน ตรวจข้อมูลในใบเสร็จและเอกสารที่ได้รับจากสถานพยาบาล แล้วส่งตามช่องทางที่บริษัทแจ้ง'],
      ['ติดตามสถานะ','ส่งเรื่องเคลมแล้ว ต้องการทราบว่าขั้นตอนไปถึงไหน','เก็บเลขอ้างอิงและวันที่ส่งเอกสารไว้ ใช้ข้อมูลนี้สอบถามสถานะ เอกสารที่อาจต้องเพิ่ม และขั้นตอนถัดไปกับบริษัทประกัน']
    ]
  },
  en: {
    section:{kicker:'Illustrative support scenarios',title:'A clearer starting point for claims',body:'Examples of preparing information and speaking with an insurer. These are not real customer experiences.',note:'Steps, documents and decisions depend on the policy terms and the insurer.'},
    label:'Illustrative scenario',valueNote:'Not a real customer case',meta:'Confirm with your insurer',
    items:[
      ['Notify','A vehicle accident happens and you are unsure where to start','Contact the insurer using the details in your policy. Have your policy number and incident information ready, then ask about its next steps.'],
      ['Prepare','You need to submit a medical claim and are unsure which documents are required','Ask the insurer for its document checklist. Check the receipts and documents from the healthcare provider, then use the submission channel the insurer specifies.'],
      ['Follow up','A claim has been submitted and you want to check its progress','Keep the reference number and submission date. Use them to ask the insurer about the status, any further documents and the next step.']
    ]
  }
};

export function fillClaimGuidanceExamples(config) {
  const next = structuredClone(config);
  const changedPaths = [];
  const section = (next?.sections || []).find(entry=>entry?.id==='voices' && ['stories','testimonials'].includes(entry.type));
  if (!Array.isArray(section?.items) || !section.items.length) return { config: next, changedPaths };
  const exact = (value, old) => value && typeof value==='object' && !Array.isArray(value) && Object.keys(value).length===Object.keys(old).length && Object.keys(old).every(key=>value[key]===old[key]);
  const replacement = (lang,index) => {
    const copy = CLAIM_GUIDANCE_EXAMPLES[lang], [value,title,body] = copy.items[index];
    return {label:copy.label,value,valueNote:copy.valueNote,title,body,meta:copy.meta};
  };
  const itemPath = (item,index,lang) => 'sections.@voices.items.' + (item.id ? '@' + item.id : index) + '.' + lang;
  if (section.type === 'testimonials') {
    // The old testimonial presentation must only change when ALL copy matches.
    // Partial translations or any authored/blank/extra locale field keep it intact.
    const legacy = {
      th:{section:{kicker:'เสียงจากลูกค้า',title:'ยังไม่ได้ใส่รีวิวจริง',body:'สามช่องนี้เป็นตัวอย่างให้เห็นโครง เปลี่ยนข้อความและรูปได้ในแอดมิน',note:'ทุกเคสต้องขออนุญาตลูกค้าก่อนเผยแพร่ ไม่ระบุชื่อ ไม่ใช้รูปจริง และตัวเลขต้องตรงกับเอกสารเคลม — เคสของคนอื่นไม่ได้แปลว่าเคสคุณจะออกมาเหมือนกัน'},name:'⟨ชื่อลูกค้า⟩',meta:'⟨อาชีพ · ประกันที่ทำ⟩',quotes:['⟨ใส่คำรีวิวจริงตรงนี้ — 1 ถึง 2 ประโยคจะอ่านง่ายที่สุด⟩','⟨ใส่คำรีวิวจริงตรงนี้⟩']},
      en:{section:{kicker:'Client voices',title:'Real reviews not added yet',body:'These three are placeholders showing the shape. Swap the words and photos in the admin portal.',note:'Every case needs the client’s permission before it goes up: no names, no real photographs, and figures that match the claim documents. Another person’s outcome is not a promise about yours.'},name:'⟨Client name⟩',meta:'⟨Occupation · policy held⟩',quotes:['⟨Paste a real quote here — one or two sentences reads best⟩','⟨Paste a real quote here⟩']}
    };
    const untouched = section.items.length === 3 && ['th','en'].every(lang =>
      exact(section[lang],legacy[lang].section) && section.items.every((item,index) => exact(item?.[lang],{
        quote:legacy[lang].quotes[index===0?0:1],name:legacy[lang].name,meta:legacy[lang].meta
      }))
    );
    if (!untouched) return { config: next, changedPaths };
    section.type = 'stories';
    changedPaths.push('sections.@voices.type');
    for (const lang of ['th','en']) {
      section[lang] = {...CLAIM_GUIDANCE_EXAMPLES[lang].section};
      changedPaths.push('sections.@voices.' + lang);
      section.items.forEach((item,index) => {
        item[lang] = replacement(lang,index);
        changedPaths.push(itemPath(item,index,lang));
      });
    }
    return { config: next, changedPaths };
  }
  const oldCopy = {
    th:{section:{kicker:'ประสบการณ์จากลูกค้า',title:'ความคิดเห็นจากลูกค้า',body:'เราจะเผยแพร่ความคิดเห็นจากลูกค้าที่ได้รับอนุญาตให้นำมาใช้ โดยไม่เปิดเผยข้อมูลส่วนบุคคลเกินความจำเป็น',note:'ความคิดเห็นและผลลัพธ์ของแต่ละกรณีแตกต่างกัน และไม่ถือเป็นการรับประกันผลลัพธ์สำหรับกรณีอื่น'},item:{label:'รอความคิดเห็นจริง',value:'เผยแพร่เมื่อได้รับอนุญาต',valueNote:'ไม่เปิดเผยข้อมูลเกินจำเป็น',title:'ความคิดเห็นจากลูกค้าจะเผยแพร่ที่นี่เมื่อได้รับอนุญาต',body:'เราจะไม่ใช้ชื่อ รูปภาพ หรือรายละเอียดส่วนบุคคลโดยไม่ได้รับความยินยอม',meta:'ตัวอย่างโครงสร้าง'}},
    en:{section:{kicker:'Client experiences',title:'What clients say',body:'Client feedback will be published here only with permission and with appropriate protection of personal information.',note:'Individual experiences and outcomes vary and do not guarantee the same result in another case.'},item:{label:'Awaiting real feedback',value:'Published with permission',valueNote:'Personal details protected',title:'Client feedback will appear here once permission is granted.',body:'We will not use names, photographs or personal details without consent.',meta:'Placeholder structure'}}
  };
  for (const lang of ['th','en']) {
    const copy = CLAIM_GUIDANCE_EXAMPLES[lang];
    let replaced = false;
    section.items.slice(0,copy.items.length).forEach((item,index)=>{
      if (!exact(item?.[lang],oldCopy[lang].item)) return;
      item[lang] = replacement(lang,index);
      changedPaths.push(itemPath(item,index,lang));
      replaced = true;
    });
    if (replaced && exact(section[lang],oldCopy[lang].section)) {
      section[lang] = {...copy.section};
      changedPaths.push('sections.@voices.' + lang);
    }
  }
  return { config: next, changedPaths };
}
