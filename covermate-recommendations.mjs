// Deterministic screening only. Product records are supplied and approved by the owner.
export const NEEDS_CATALOG_VERSION = 'aia-candidates-v1';
const catalogNumber = value => Number.isSafeInteger(value) && value >= 0;
const catalogDate = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
const catalogUrl = value => {try {const u=new URL(value);return u.protocol==='https:' && !u.username && !u.password && (u.hostname==='aia.co.th' || u.hostname.endsWith('.aia.co.th'));}catch{return false;}};
function canonicalCatalog(value) {
  if(Array.isArray(value))return '['+value.map(canonicalCatalog).join(',')+']';
  if(value && typeof value==='object')return '{'+Object.keys(value).sort().filter(key=>key!=='review').map(key=>JSON.stringify(key)+':'+canonicalCatalog(value[key])).join(',')+'}';
  return JSON.stringify(value);
}
// An edit invalidates approval; this marker is not an authentication signature.
export function catalogFingerprint(record) {return canonicalCatalog(record);}
export function productReviewIssues(record, now = new Date()) {
  const issues=[],today=now.toISOString().slice(0,10),p=record || {};
  if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(p.id || ''))issues.push('id');
  if(typeof p.name?.th!=='string' || !p.name.th.trim() || typeof p.name?.en!=='string' || !p.name.en.trim())issues.push('name');
  if(p.insurer!=='AIA' || !['life','ci','health','pa'].includes(p.domain))issues.push('domain');
  if(p.benefitBasis!=={life:'all-cause-death',ci:'next-event-lump-sum',health:'annual-medical',pa:'accident-only'}[p.domain])issues.push('benefitBasis');
  if(p.salesStatus!=='active' || p.distributionAuthorized!==true)issues.push('availability');
  if(!catalogUrl(p.source?.url) || typeof p.source?.version!=='string' || !p.source.version.trim() || !catalogDate(p.source?.verifiedAt) || !catalogDate(p.source?.validUntil) || p.source.verifiedAt>today || p.source.validUntil<today || p.source.validUntil<p.source.verifiedAt)issues.push('source');
  const e=p.eligibility || {};
  if(!catalogNumber(e.minAge) || !catalogNumber(e.maxAge) || e.minAge>e.maxAge || e.maxAge>100)issues.push('age');
  if(!Array.isArray(e.occupationClasses) || e.occupationClasses.some(c=>!['class1','class2','class3','class4'].includes(c)))issues.push('occupation');
  if(!['standalone','rider'].includes(p.type) || !Array.isArray(e.compatibleBasePolicies) || p.type==='rider' && !e.compatibleBasePolicies.length)issues.push('attachment');
  if(!Array.isArray(e.residences) || !e.residences.length || e.residences.some(v=>!['thailand','other'].includes(v)))issues.push('residence');
  if(e.maxIncomeMultiple!==null && (!Number.isFinite(e.maxIncomeMultiple) || e.maxIncomeMultiple<=0 || e.maxIncomeMultiple>100))issues.push('incomeRule');
  if(p.domain==='pa' && typeof e.motorcycleCovered!=='boolean')issues.push('motorcycle');
  if(!Array.isArray(p.plans) || !p.plans.length || p.plans.length>100)issues.push('plans');
  else for(const plan of p.plans) {
    if(!plan || typeof plan!=='object'){issues.push('planTerms');continue;}
    if(!catalogNumber(plan.horizonYears) || !plan.horizonYears || (plan.premiumMonthly!==null && !catalogNumber(plan.premiumMonthly)))issues.push('planTerms');
    const keys=p.domain==='health'?['annualLimit','roomPerDay','deductible','copayPercent']:p.domain==='pa'?['death','medical','income']:['cover'];
    if(keys.some(key=>!catalogNumber(plan[key])) || plan.copayPercent>100)issues.push('benefits');
    if(p.domain==='health' && (plan.structure!=='annual' || !['thailand','worldwide'].includes(plan.territory) || typeof plan.opd!=='boolean'))issues.push('healthStructure');
  }
  return [...new Set(issues)];
}
export function reviewProduct(record, reviewer, now = new Date()) {
  if(typeof reviewer!=='string' || !reviewer.trim() || reviewer.length>120 || productReviewIssues(record,now).length)throw new TypeError('Product is not ready for approval');
  return {...record,review:{status:'approved',by:reviewer.trim(),at:now.toISOString(),fingerprint:catalogFingerprint(record)}};
}
export function needsProductApproved(record, now = new Date()) {
  return !productReviewIssues(record,now).length && record.review?.status==='approved' && !!record.review.by && record.review.fingerprint===catalogFingerprint(record);
}
export function createProductDraft(id) {
  return {id,insurer:'AIA',name:{th:'',en:''},domain:'life',benefitBasis:'',type:'standalone',salesStatus:'unknown',distributionAuthorized:false,
    source:{url:'',version:'',verifiedAt:'',validUntil:''},eligibility:{minAge:null,maxAge:null,occupationClasses:[],compatibleBasePolicies:[],residences:['thailand'],maxIncomeMultiple:null},
    plans:[],review:{status:'draft'}};
}
export function validateNeedsCatalog(value) {
  if(!value || value.version!==NEEDS_CATALOG_VERSION || !Array.isArray(value.products) || value.products.length>100)throw new TypeError('Invalid product catalog');
  const ids=new Set();
  for(const p of value.products) {
    if(!p || typeof p!=='object' || Array.isArray(p) || typeof p.id!=='string' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(p.id) || ids.has(p.id))throw new TypeError('Invalid or duplicate product ID');
    ids.add(p.id);
  }
  if(JSON.stringify(value).length>300000)throw new TypeError('Product catalog is too large');
  return JSON.parse(JSON.stringify(value));
}
export function matchNeedsProducts({domain,result,profile={},paResult,basePolicyId='',catalog,now=new Date()}) {
  const candidates=[],review=[],excluded=[];
  let products;
  try{products=validateNeedsCatalog(catalog).products;}catch{return {candidates,review,excluded,status:'awaitingCatalog'};}
  const domains=[domain,...(profile.paInterest==='yes'?['pa']:[])];
  for(const product of products) {
    if(!domains.includes(product.domain))continue;
    if(!needsProductApproved(product,now)){excluded.push({id:product.id,reasons:['unverifiedProduct']});continue;}
    const e=product.eligibility,missing=[],fail=[];
    if(!catalogNumber(profile.age))missing.push('age');else if(profile.age<e.minAge || profile.age>e.maxAge)fail.push('age');
    if(e.occupationClasses.length){if(!e.occupationClasses.includes(profile.occupationClass)) (profile.occupationClass==='unknown'||!profile.occupationClass?missing:fail).push('occupationClass');}
    if(!e.residences.includes(profile.residence))(profile.residence==='unknown'||!profile.residence?missing:fail).push('residence');
    if(product.type==='rider') {
      if(profile.basePolicy==='no')fail.push('basePolicy');
      else if(profile.basePolicy!=='yes' || !basePolicyId)missing.push('basePolicy');
      else if(!e.compatibleBasePolicies.includes(basePolicyId))fail.push('basePolicy');
    }
    if(!catalogNumber(profile.horizonYears) || profile.horizonYears===0)missing.push('horizonYears');
    if(e.maxIncomeMultiple!==null && !catalogNumber(profile.annualIncome))missing.push('annualIncome');
    if(product.domain==='pa' && !e.motorcycleCovered){if(profile.motorcycle==='yes')fail.push('motorcycle');else if(profile.motorcycle!=='no')missing.push('motorcycle');}
    const target=product.domain==='pa'?paResult:result;
    if(!target?.ready)missing.push('need');
    if(fail.length){excluded.push({id:product.id,reasons:fail});continue;}
    const fits=[];
    for(const [index,plan] of product.plans.entries()) {
      if(catalogNumber(profile.horizonYears) && plan.horizonYears<profile.horizonYears)continue;
      const checks=[],unknown=[];
      let excess=0;
      if(product.domain==='health') {
        const i=result.inputs;
        if(!catalogNumber(i.targetAnnualLimit) || result.roomDaily===null)unknown.push('healthTargets');
        else {checks.push(plan.annualLimit>=i.targetAnnualLimit,plan.roomPerDay>=result.roomDaily);excess=plan.annualLimit-i.targetAnnualLimit;}
        if(!catalogNumber(i.ownPayBudget))unknown.push('ownPayBudget');else checks.push(plan.deductible<=i.ownPayBudget);
        // Nonzero cost sharing requires adviser review, not an inferred tolerance.
        if(plan.copayPercent>0)unknown.push('costSharing');
        if(!['thailand','worldwide'].includes(i.territory))unknown.push('territory');else checks.push(i.territory==='thailand'||plan.territory==='worldwide');
        if(i.opdPreference==='unknown'||!i.opdPreference)unknown.push('opdPreference');else if(i.opdPreference==='yes')checks.push(plan.opd);
      } else if(product.domain==='pa') {
        if(!target || ![target.deathGap,target.medicalGap,target.incomeGap].every(catalogNumber))unknown.push('paNeed');
        else {checks.push(plan.death>=target.deathGap,plan.medical>=target.medicalGap,plan.income>=target.incomeGap);excess=plan.death-target.deathGap;}
      } else if(!catalogNumber(result.shortfall))unknown.push('existingCover');
      else if(result.shortfall===0)checks.push(false);
      else {checks.push(plan.cover>=result.shortfall);excess=plan.cover-result.shortfall;}
      const financialCover=product.domain==='pa'?plan.death:plan.cover;
      if(e.maxIncomeMultiple!==null && catalogNumber(profile.annualIncome) && catalogNumber(financialCover))checks.push(financialCover<=profile.annualIncome*e.maxIncomeMultiple);
      if(checks.includes(false))continue;
      if(unknown.length || missing.length){review.push({id:product.id,reasons:[...new Set([...missing,...unknown])]});continue;}
      const budgetKnown=catalogNumber(profile.monthlyBudget),priceKnown=catalogNumber(plan.premiumMonthly);
      fits.push({id:product.id,name:product.name,domain:product.domain,planIndex:index,plan,excess,source:product.source,
        reasons:['mechanismMatch','coverageFit','eligibilityScreened'],budgetStatus:!budgetKnown||!priceKnown?'budgetUnknown':plan.premiumMonthly<=profile.monthlyBudget?'withinBudget':'overBudget'});
    }
    fits.sort((a,b)=>a.excess-b.excess || (a.plan.premiumMonthly??Infinity)-(b.plan.premiumMonthly??Infinity));
    if(fits.length)candidates.push(fits[0]);
    else if(!review.some(row=>row.id===product.id))excluded.push({id:product.id,reasons:['coverageMismatch']});
  }
  candidates.sort((a,b)=>a.excess-b.excess || a.id.localeCompare(b.id));
  return {candidates,review,excluded,status:candidates.length?'candidates':review.length?'needsInformation':'awaitingCatalog'};
}

export function referenceReviewIssues(record, now=new Date()) {
  const p=record || {},issues=[],today=now.toISOString().slice(0,10);
  if(typeof p.id!=='string' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(p.id))issues.push('id');
  if(typeof p.name?.th!=='string' || !p.name.th.trim() || typeof p.name?.en!=='string' || !p.name.en.trim())issues.push('name');
  if(!catalogNumber(p.daily) || p.daily===0)issues.push('daily');
  try {const u=new URL(p.sourceUrl);if(u.protocol!=='https:'||u.username||u.password)issues.push('sourceUrl');}catch{issues.push('sourceUrl');}
  if(!catalogDate(p.lastChecked)||!catalogDate(p.validUntil)||p.lastChecked>today||p.validUntil<today||p.validUntil<p.lastChecked)issues.push('dates');
  return issues;
}
export function needsReferenceApproved(record,now=new Date()) {
  return !referenceReviewIssues(record,now).length && record.review?.status==='approved' && !!record.review.by && record.review.fingerprint===catalogFingerprint(record);
}
export function reviewNeedsReference(record,reviewer,now=new Date()) {
  if(typeof reviewer!=='string'||!reviewer.trim()||reviewer.length>120||referenceReviewIssues(record,now).length)throw new TypeError('Reference is not ready for approval');
  return {...record,review:{status:'approved',by:reviewer.trim(),at:now.toISOString(),fingerprint:catalogFingerprint(record)}};
}
export function validateNeedsReferences(value) {
  if(!Array.isArray(value)||value.length>100||JSON.stringify(value).length>150000)throw new TypeError('Invalid reference catalog');
  const ids=new Set();
  for(const item of value){if(!item || typeof item.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,79}$/.test(item.id)||ids.has(item.id))throw new TypeError('Invalid or duplicate reference ID');ids.add(item.id);}
  return JSON.parse(JSON.stringify(value));
}
