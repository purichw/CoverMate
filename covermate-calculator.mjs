// Shared by the visitor, lead boundary and tests. No storage or network effects.
const LEGACY_NEEDS_VERSION = 'home-needs-v1';
const LEGACY_NEEDS_FIELDS = {
  life: [
    {key:'monthlyNeed',unit:'perMonth',icon:'coins',required:true,example:50000,max:500000},
    {key:'otherMonthlyIncome',unit:'perMonth',icon:'people',required:true,example:20000,max:500000},
    {key:'yearsToSupport',unit:'years',icon:'clock',required:true,example:10,max:30,positive:true},
    {key:'debtToClear',unit:'baht',icon:'file',example:1000000,max:50000000},
    {key:'extraLumpSum',unit:'baht',icon:'file',example:500000,max:50000000},
    {key:'earmarkedAssets',unit:'baht',icon:'coins',example:300000,max:50000000},
    {key:'existingLifeCover',unit:'baht',icon:'shieldCheck',example:0,max:50000000}
  ],
  ci: [
    {key:'monthlyRecoveryNeed',unit:'perMonth',icon:'coins',required:true,example:50000,max:500000},
    {key:'recoveryMonths',unit:'months',icon:'clock',required:true,example:6,max:36,positive:true},
    {key:'otherSupportIncome',unit:'perMonth',icon:'people',example:0,max:500000},
    {key:'availableEmergencyFunds',unit:'baht',icon:'coins',example:0,max:20000000},
    {key:'existingCriticalIllnessCover',unit:'baht',icon:'shieldCheck',example:0,max:20000000},
    {key:'extraRecoveryBudget',unit:'baht',icon:'file',example:0,max:20000000}
  ],
  health: [
    {key:'roomReference',icon:'briefcase',choices:['','published','custom'],required:true},
    {key:'customRoomDaily',unit:'perDay',icon:'briefcase',required:true,example:10000,max:100000,when:'custom'},
    {key:'roomBenefit',unit:'perDay',icon:'shieldCheck',required:true,example:5000,max:100000},
    {key:'costSharing',icon:'file',choices:['','none','deductible','copay','both'],required:true},
    {key:'employerCover',icon:'briefcase',choices:['','yes','no'],required:true},
    {key:'personalCover',icon:'shieldCheck',choices:['','yes','no'],required:true},
    {key:'ownPayBudget',unit:'baht',icon:'coins',required:true,example:0,max:100000}
  ]
};

function legacyParseNeedsNumber(raw, positive = false) {
  const text = String(raw ?? '').trim().replace(/[๐-๙]/g, ch => String(ch.charCodeAt(0)-3664)).replace(/[,\s฿]/g,'');
  if (!text) return {value:null,invalid:false};
  if (!/^-?\d+(?:\.\d*)?$/.test(text)) return {value:null,invalid:true};
  const number = Math.max(0, Math.trunc(Number(text)));
  if (!Number.isSafeInteger(number)) return {value:null,invalid:true};
  return {value:positive ? Math.max(1,number) : number,invalid:false};
}

function legacyNeedsInitialInputs(mode) {
  return Object.fromEntries(LEGACY_NEEDS_FIELDS[mode].map(field => [field.key, field.choices ? '' :
    mode === 'life' && field.required || mode === 'ci' && field.required ? field.example.toLocaleString('en-US') :
    mode === 'health' ? '' : '0']));
}

function legacyNeedsFields(mode, raw) {
  return LEGACY_NEEDS_FIELDS[mode].filter(field => !field.when || raw.roomReference === field.when);
}

function legacyCalculateNeeds(mode, raw = {}, reference = {}) {
  if (!LEGACY_NEEDS_FIELDS[mode]) throw new TypeError('Unknown calculator type');
  const inputs = {}, invalid = [], missing = [], warnings = [];
  for (const field of legacyNeedsFields(mode,raw)) {
    if (field.choices) {
      inputs[field.key] = field.choices.includes(raw[field.key]) ? raw[field.key] : '';
      if (!inputs[field.key]) missing.push(field.key);
    } else {
      const parsed = legacyParseNeedsNumber(raw[field.key],field.positive);
      if (parsed.invalid) invalid.push(field.key);
      if (parsed.value === null && field.required) missing.push(field.key);
      inputs[field.key] = parsed.value ?? 0;
      if (inputs[field.key] > field.max) warnings.push(field.key);
    }
  }
  const complete = !invalid.length && !missing.length;
  if (mode === 'life' || mode === 'ci') {
    const life = mode === 'life';
    const netMonthlyNeed = Math.max(0, life ? inputs.monthlyNeed-inputs.otherMonthlyIncome : inputs.monthlyRecoveryNeed-inputs.otherSupportIncome);
    const supportCost = netMonthlyNeed * (life ? 12*inputs.yearsToSupport : inputs.recoveryMonths);
    const shortfall = Math.max(0, supportCost + (life ? inputs.debtToClear+inputs.extraLumpSum-inputs.earmarkedAssets-inputs.existingLifeCover : inputs.extraRecoveryBudget-inputs.availableEmergencyFunds-inputs.existingCriticalIllnessCover));
    return {inputs,invalid,missing,warnings,complete:complete && Number.isSafeInteger(supportCost) && Number.isSafeInteger(shortfall),netMonthlyNeed,supportCost,shortfall:Number.isSafeInteger(shortfall)?shortfall:null};
  }
  const roomDaily = inputs.roomReference === 'custom' ? inputs.customRoomDaily : legacyParseNeedsNumber(reference.daily).value;
  const referenceDocumented = inputs.roomReference === 'custom' || /^https:\/\//.test(reference.sourceUrl||'') && /^\d{4}-\d{2}-\d{2}$/.test(reference.lastChecked||'');
  const hasReference = inputs.roomReference && roomDaily !== null && roomDaily > 0 && referenceDocumented;
  const ready = complete && !!hasReference;
  const roomGap = hasReference ? Math.max(0,roomDaily-inputs.roomBenefit) : null;
  // A room-only screening status is never a judgement that a whole policy is sufficient.
  const status = !ready ? 'incomplete' : roomGap > 0 || inputs.costSharing !== 'none' || (inputs.employerCover === 'no' && inputs.personalCover === 'no') ? 'review' : 'roomAligned';
  return {inputs,invalid,missing,warnings,complete:ready,roomDaily:hasReference?roomDaily:null,roomGap,status};
}

function legacyCreateNeedsSnapshot(mode, raw, reference, language, timestamp = new Date().toISOString()) {
  const result = legacyCalculateNeeds(mode,raw,reference);
  if (!result.complete) return null;
  return {version:LEGACY_NEEDS_VERSION,calculatorType:mode==='ci'?'critical-illness':mode,language:language==='en'?'en':'th',inputs:result.inputs,
    result:mode==='health'?{status:result.status,roomDaily:result.roomDaily,roomGap:result.roomGap}:{netMonthlyNeed:result.netMonthlyNeed,supportCost:result.supportCost,shortfall:result.shortfall},
    ...(mode==='health'&&raw.roomReference==='published'?{reference:{daily:reference.daily,name:String(reference.name||'').slice(0,160),sourceUrl:String(reference.sourceUrl||'').slice(0,500),lastChecked:String(reference.lastChecked||'').slice(0,10)}}:{}),
    timestamp,pagePath:'/',source:'home_needs_calculator'};
}

function legacySanitizeNeedsSnapshot(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Invalid calculator summary');
  const mode = value.calculatorType === 'critical-illness' ? 'ci' : value.calculatorType;
  if (!LEGACY_NEEDS_FIELDS[mode] || value.version !== LEGACY_NEEDS_VERSION || value.source !== 'home_needs_calculator' || value.pagePath !== '/' || !['th','en'].includes(value.language)) throw new TypeError('Invalid calculator metadata');
  if (typeof value.timestamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value.timestamp) || !Number.isFinite(Date.parse(value.timestamp))) throw new TypeError('Invalid calculator timestamp');
  if (!value.inputs || typeof value.inputs !== 'object' || Array.isArray(value.inputs)) throw new TypeError('Invalid calculator inputs');
  for (const field of legacyNeedsFields(mode,value.inputs)) {
    const input = value.inputs[field.key];
    if (field.choices ? !field.choices.includes(input) : !Number.isSafeInteger(input) || input < (field.positive?1:0)) throw new TypeError('Invalid calculator field');
  }
  const reference = value.reference || {};
  if (mode==='health' && value.inputs.roomReference==='published') {
    if (!Number.isSafeInteger(reference.daily) || reference.daily <= 0 || reference.daily > 1000000000 || !/^https:\/\//.test(reference.sourceUrl||'') || !/^\d{4}-\d{2}-\d{2}$/.test(reference.lastChecked||'')) throw new TypeError('Invalid room reference');
  }
  const clean = legacyCreateNeedsSnapshot(mode,value.inputs,reference,value.language,value.timestamp);
  if (!clean) throw new TypeError('Incomplete calculator summary');
  return clean; // Recalculate; never trust a result supplied by a browser.
}

export const NEEDS_VERSION = 'home-needs-v2';
const amountField = (key, options = {}) => ({key, unit:'baht', icon:Object.values(LEGACY_NEEDS_FIELDS).flat().find(field=>field.key===key)?.icon || 'coins', max:50000000, ...options});
const choiceField = (key, choices, options = {}) => ({key, icon:'file', choices:['', ...choices], ...options});
export const NEEDS_FIELDS = {
  life: [
    amountField('monthlyNeed',{required:true,unit:'perMonth',example:50000,max:500000}),
    amountField('otherMonthlyIncome',{required:true,unit:'perMonth',example:20000,max:500000}),
    amountField('yearsToSupport',{required:true,unit:'years',example:10,positive:true,limit:60,max:30}),
    amountField('debtToClear',{example:1000000}),amountField('extraLumpSum',{example:500000}),
    amountField('earmarkedAssets',{example:300000}),amountField('existingLifeCover',{required:true,unknown:true}),
    choiceField('valuation',['simple','presentValue'],{initial:'simple',advanced:true}),
    amountField('inflationPercent',{unit:'percent',limit:20,max:10,advanced:true,when:{valuation:['presentValue']}}),
    amountField('returnPercent',{unit:'percent',limit:20,max:10,advanced:true,when:{valuation:['presentValue']}})
  ],
  ci: [
    amountField('monthlyRecoveryNeed',{required:true,unit:'perMonth',example:50000,max:500000}),
    amountField('otherSupportIncome',{required:true,unit:'perMonth',example:20000,max:500000}),
    amountField('recoveryMonths',{required:true,unit:'months',example:12,positive:true,limit:60,max:36}),
    amountField('extraRecoveryBudget'),amountField('availableEmergencyFunds'),
    amountField('existingCriticalIllnessCover',{required:true,unknown:true}),
    amountField('medicalOOPBuffer',{advanced:true})
  ],
  health: [
    choiceField('publicHealthScheme',['ucs','sso','civil','other','none','unknown'],{required:true}),
    choiceField('careSetting',['public','private','international','unknown'],{required:true}),
    choiceField('existingHealthStructure',['annual','itemized','none','unknown'],{required:true}),
    amountField('existingAnnualLimit',{required:true,unknown:true,when:{existingHealthStructure:['annual']}}),
    choiceField('roomReference',['unknown','published','custom'],{required:true}),
    amountField('customRoomDaily',{required:true,unknown:true,unit:'perDay',max:100000,when:{roomReference:['custom']}}),
    amountField('roomBenefit',{required:true,unknown:true,unit:'perDay',max:100000,when:{existingHealthStructure:['annual','itemized','unknown']}}),
    amountField('targetAnnualLimit',{unknown:true,advanced:true,initial:'unknown'}),
    choiceField('costSharing',['none','deductible','copay','both','unknown'],{initial:'unknown',advanced:true}),
    amountField('deductibleAmount',{required:true,unknown:true,advanced:true,when:{costSharing:['deductible','both']}}),
    amountField('copayPercent',{required:true,unknown:true,unit:'percent',limit:100,max:100,advanced:true,when:{costSharing:['copay','both']}}),
    choiceField('employerCover',['yes','no','unknown'],{initial:'unknown',advanced:true}),
    amountField('ownPayBudget',{unknown:true,initial:'unknown',advanced:true}),
    choiceField('opdPreference',['yes','no','unknown'],{initial:'unknown',advanced:true}),
    choiceField('territory',['thailand','worldwide','unknown'],{initial:'unknown',advanced:true}),
    choiceField('stressEnabled',['no','yes'],{initial:'no',advanced:true}),
    amountField('scenarioEligibleCost',{required:true,advanced:true,when:{stressEnabled:['yes']}}),
    amountField('scenarioRemainingLimit',{required:true,unknown:true,advanced:true,when:{stressEnabled:['yes']}})
  ],
  pa: [
    amountField('accidentDeathTarget',{required:true,unknown:true}),
    amountField('existingAccidentDeath',{required:true,unknown:true}),
    amountField('accidentMedicalTarget',{required:true,unknown:true}),
    amountField('existingAccidentMedical',{required:true,unknown:true}),
    amountField('accidentMonthlyNeed',{required:true,unit:'perMonth'}),
    amountField('accidentContinuingIncome',{required:true,unit:'perMonth'}),
    amountField('accidentRecoveryMonths',{required:true,unit:'months',positive:true,limit:60,max:36}),
    amountField('existingAccidentIncome',{required:true,unknown:true})
  ]
};

export function parseNeedsNumber(raw, positive = false) {
  const text = String(raw ?? '').trim().replace(/[๐-๙]/g,ch=>String(ch.charCodeAt(0)-3664)).replace(/[,\s฿]/g,'');
  if (!text) return {value:null,invalid:false};
  if (!/^\d+$/.test(text)) return {value:null,invalid:true};
  const value = Number(text);
  return Number.isSafeInteger(value) && value >= (positive ? 1 : 0) ? {value,invalid:false} : {value:null,invalid:true};
}
export function needsInitialInputs(mode) {
  return Object.fromEntries(NEEDS_FIELDS[mode].map(field=>[field.key,field.initial ?? (field.required || field.choices ? '' : '0')]));
}
export function needsFields(mode, raw = {}) {
  return (NEEDS_FIELDS[mode] || []).filter(field=>!field.when || Object.entries(field.when).every(([key,values])=>values.includes(raw[key])));
}
const knownAmount = value => Number.isSafeInteger(value) && value >= 0;
const exactDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
export function needsReferenceValid(reference, now = new Date()) {
  return knownAmount(reference?.daily) && reference.daily > 0 && /^https:\/\//.test(reference.sourceUrl || '') && exactDate(reference.lastChecked) && reference.lastChecked <= now.toISOString().slice(0,10);
}
export function calculateNeeds(mode, raw = {}, reference = {}) {
  if (!Object.hasOwn(NEEDS_FIELDS,mode)) throw new TypeError('Unknown calculator type');
  const inputs = {}, invalid = [], missing = [], unknown = [], warnings = [], notes = [];
  for (const field of needsFields(mode,raw)) {
    const value = Object.hasOwn(raw,field.key) ? raw[field.key] : field.initial ?? (field.required || field.choices ? '' : 0);
    if (value === 'unknown' && (field.unknown || field.choices?.includes('unknown'))) {
      inputs[field.key] = 'unknown'; unknown.push(field.key); continue;
    }
    if (field.choices) {
      inputs[field.key] = field.choices.includes(value) ? value : '';
      if (value && !field.choices.includes(value)) invalid.push(field.key);
      if (field.required && !inputs[field.key]) missing.push(field.key);
      continue;
    }
    const parsed = parseNeedsNumber(value,field.positive);
    inputs[field.key] = parsed.value ?? (field.required || field.unknown ? null : 0);
    if (parsed.invalid || parsed.value > (field.limit ?? Number.MAX_SAFE_INTEGER)) invalid.push(field.key);
    if (parsed.value === null && field.required) missing.push(field.key);
    if (parsed.value > field.max) warnings.push(field.key);
  }
  const ready = !invalid.length && !missing.length;
  const base = {inputs,invalid,missing,unknown,warnings,notes,ready,complete:ready && !unknown.length,calculationStatus:ready ? unknown.length ? 'partial' : 'complete' : 'incomplete'};
  const n = key => knownAmount(inputs[key]) ? inputs[key] : 0;
  if (mode === 'life' || mode === 'ci') {
    const life = mode === 'life', existingKey = life ? 'existingLifeCover' : 'existingCriticalIllnessCover';
    const netMonthlyNeed = Math.max(0,n(life?'monthlyNeed':'monthlyRecoveryNeed')-n(life?'otherMonthlyIncome':'otherSupportIncome'));
    let supportCost = netMonthlyNeed * (life ? 12*n('yearsToSupport') : n('recoveryMonths'));
    // Annual needs at the start of each year; rates are user assumptions, never forecasts.
    if (life && inputs.valuation === 'presentValue') {
      supportCost = Math.round(Array.from({length:Math.min(60,n('yearsToSupport'))},(_,year)=>netMonthlyNeed*12*Math.pow((1+n('inflationPercent')/100)/(1+n('returnPercent')/100),year)).reduce((a,b)=>a+b,0));
      notes.push('valuationNote');
    }
    const grossNeed = supportCost + (life ? n('debtToClear')+n('extraLumpSum') : n('extraRecoveryBudget')+n('medicalOOPBuffer'));
    const provisionalGap = Math.max(0,grossNeed-n(life?'earmarkedAssets':'availableEmergencyFunds'));
    const numericSafe = [supportCost,grossNeed,provisionalGap].every(Number.isSafeInteger);
    if (!numericSafe) {base.invalid.push('arithmetic');base.ready=false;base.complete=false;base.calculationStatus='incomplete';}
    const shortfall = base.ready && inputs[existingKey] !== 'unknown' ? Math.max(0,provisionalGap-n(existingKey)) : null;
    if (life && n('debtToClear')>0) notes.push('debtDoubleCount');
    if (life && n('earmarkedAssets')>0 && n('otherMonthlyIncome')>0) notes.push('assetDoubleCount');
    if (!life) notes.push('ciNextEvent');
    if (netMonthlyNeed===0 && ready) notes.push('incomeCoversSpending');
    return {...base,netMonthlyNeed:numericSafe?netMonthlyNeed:null,supportCost:numericSafe?supportCost:null,grossNeed:numericSafe?grossNeed:null,provisionalGap:base.ready?provisionalGap:null,shortfall};
  }
  if (mode === 'pa') {
    const gap = (target,current)=>knownAmount(inputs[target]) && knownAmount(inputs[current]) ? Math.max(0,inputs[target]-inputs[current]) : null;
    const incomeNeed = Math.max(0,n('accidentMonthlyNeed')-n('accidentContinuingIncome'))*n('accidentRecoveryMonths');
    if (!Number.isSafeInteger(incomeNeed)) {base.ready=false;base.complete=false;base.calculationStatus='incomplete';base.invalid.push('arithmetic');}
    return {...base,deathGap:ready?gap('accidentDeathTarget','existingAccidentDeath'):null,medicalGap:ready?gap('accidentMedicalTarget','existingAccidentMedical'):null,incomeGap:base.ready && knownAmount(inputs.existingAccidentIncome)?Math.max(0,incomeNeed-inputs.existingAccidentIncome):null};
  }
  const hasNoCover = inputs.existingHealthStructure === 'none';
  const comparable = hasNoCover || inputs.existingHealthStructure === 'annual' && knownAmount(inputs.existingAnnualLimit);
  const annualGap = comparable && knownAmount(inputs.targetAnnualLimit) ? Math.max(0,inputs.targetAnnualLimit-(hasNoCover?0:inputs.existingAnnualLimit)) : null;
  const roomDaily = inputs.roomReference === 'custom' && knownAmount(inputs.customRoomDaily) ? inputs.customRoomDaily : inputs.roomReference === 'published' && needsReferenceValid(reference) ? reference.daily : null;
  const roomGap = roomDaily !== null && (hasNoCover || knownAmount(inputs.roomBenefit)) ? Math.max(0,roomDaily-(hasNoCover?0:inputs.roomBenefit)) : null;
  if (inputs.roomReference === 'published' && roomDaily === null) {base.missing.push('reference');base.ready=false;}
  const sharingKnown = ['none','deductible','copay','both'].includes(inputs.costSharing);
  const deductible = ['deductible','both'].includes(inputs.costSharing) ? inputs.deductibleAmount : 0;
  const copay = ['copay','both'].includes(inputs.costSharing) ? inputs.copayPercent : 0;
  let scenarioOwnPay = null;
  if (inputs.stressEnabled === 'yes' && sharingKnown && [inputs.scenarioEligibleCost,inputs.scenarioRemainingLimit,deductible,copay].every(knownAmount)) {
    const reimbursed = Math.min(inputs.scenarioRemainingLimit,Math.max(0,inputs.scenarioEligibleCost-deductible)*(1-copay/100));
    scenarioOwnPay = Math.round(Math.max(0,inputs.scenarioEligibleCost-reimbursed));
  }
  notes.push('healthNotAdditive','employerContext');
  if (inputs.existingHealthStructure==='itemized') notes.push('itemizedNote');
  if (inputs.stressEnabled==='yes') notes.push('stressNote');
  if (inputs.roomReference==='published') notes.push('datedReference');
  const status = !base.ready ? 'incomplete' : annualGap===null || roomGap===null || !sharingKnown || inputs.existingHealthStructure==='itemized' ? 'reviewRequired' : annualGap>0 || roomGap>0 || inputs.costSharing!=='none' ? 'review' : 'dimensionsAligned';
  return {...base,complete:base.ready && status==='dimensionsAligned',calculationStatus:base.ready?'review_required':'incomplete',status,roomDaily,roomGap,annualGap,scenarioOwnPay,
    scenarioBudgetGap:scenarioOwnPay!==null && knownAmount(inputs.ownPayBudget)?Math.max(0,scenarioOwnPay-inputs.ownPayBudget):null};
}

export const NEEDS_PROFILE_FIELDS = [
  amountField('age',{max:100,limit:100,unit:'years',unknown:true,initial:'unknown'}),
  choiceField('occupationClass',['class1','class2','class3','class4','unknown'],{initial:'unknown'}),
  choiceField('basePolicy',['yes','no','unknown'],{initial:'unknown'}),
  {key:'basePolicyId',text:true,icon:'file',initial:'',when:{basePolicy:['yes']}},
  amountField('horizonYears',{unit:'years',max:60,limit:100,unknown:true,initial:'unknown'}),
  amountField('monthlyBudget',{unit:'perMonth',unknown:true,initial:'unknown'}),
  amountField('annualIncome',{unit:'perYear',unknown:true,initial:'unknown'}),
  choiceField('residence',['thailand','other','unknown'],{initial:'unknown'}),
  choiceField('paInterest',['no','yes'],{initial:'no'}),
  choiceField('motorcycle',['yes','no','unknown'],{initial:'unknown',when:{paInterest:['yes']}})
];
export function needsInitialProfile() {return Object.fromEntries(NEEDS_PROFILE_FIELDS.map(field=>[field.key,field.initial]));}
export function sanitizeNeedsProfile(raw = {}) {
  if(!raw || typeof raw!=='object' || Array.isArray(raw))throw new TypeError('Invalid eligibility profile');
  const out = {};
  for (const field of NEEDS_PROFILE_FIELDS) {
    if (field.when && !Object.entries(field.when).every(([key,values])=>values.includes(raw[key]))) continue;
    const value = raw[field.key] ?? field.initial;
    const invalid=()=>Object.assign(new TypeError('Invalid eligibility field'),{field:field.key});
    if (field.text) {if(typeof value!=='string' || value.length>80 || value && !/^[A-Za-z0-9 _()./-]+$/.test(value))throw invalid();out[field.key]=value;}
    else if (field.choices) {if (!field.choices.includes(value) || value==='') throw invalid();out[field.key]=value;}
    else if (value==='unknown') out[field.key]=value;
    else {const parsed=parseNeedsNumber(value);if(parsed.invalid || parsed.value===null || parsed.value>(field.limit??Number.MAX_SAFE_INTEGER))throw invalid();out[field.key]=parsed.value;}
  }
  return out;
}
export function createNeedsSnapshot(mode, raw, reference = {}, language = 'th', timestamp = new Date().toISOString(), handoff) {
  const result = calculateNeeds(mode,raw,reference);
  if (!result.ready || mode==='pa') return null;
  const {inputs,...output} = result;
  const snapshot = {version:NEEDS_VERSION,calculatorType:mode==='ci'?'critical-illness':mode,language:language==='en'?'en':'th',inputs,result:output,timestamp,pagePath:'/',source:'home_needs_calculator'};
  if(mode==='health' && inputs.roomReference==='published') snapshot.reference={daily:reference.daily,name:String(reference.name||'').slice(0,160),sourceUrl:String(reference.sourceUrl||'').slice(0,500),lastChecked:reference.lastChecked};
  if (handoff?.profile) {
    snapshot.profile=sanitizeNeedsProfile(handoff.profile);
    if (snapshot.profile.paInterest==='yes' && handoff.pa) {
      const pa=calculateNeeds('pa',handoff.pa);
      if (!pa.ready) return null;
      snapshot.pa={inputs:pa.inputs,result:pa};
    }
  }
  return snapshot;
}
export function sanitizeNeedsSnapshot(value) {
  if(value?.version===LEGACY_NEEDS_VERSION)return legacySanitizeNeedsSnapshot(value);
  if(!value || typeof value!=='object' || Array.isArray(value))throw new TypeError('Invalid calculator summary');
  const mode=value.calculatorType==='critical-illness'?'ci':value.calculatorType;
  if(!['life','ci','health'].includes(mode) || value.version!==NEEDS_VERSION || value.source!=='home_needs_calculator' || value.pagePath!=='/' || !['th','en'].includes(value.language))throw new TypeError('Invalid calculator metadata');
  if(typeof value.timestamp!=='string' || !/^\d{4}-\d{2}-\d{2}T/.test(value.timestamp) || !Number.isFinite(Date.parse(value.timestamp)))throw new TypeError('Invalid calculator timestamp');
  const validateInputs=(type,inputs)=>{
    if(!inputs || typeof inputs!=='object' || Array.isArray(inputs))throw new TypeError('Invalid calculator inputs');
    for(const field of needsFields(type,inputs)) {
      const v=inputs[field.key];
      if(v===null && field.unknown && !field.required)continue;
      if(v==='unknown' && (field.unknown || field.choices?.includes('unknown')))continue;
      if(field.choices ? !field.choices.includes(v) || v==='' : !Number.isSafeInteger(v) || v<(field.positive?1:0) || v>(field.limit??Number.MAX_SAFE_INTEGER))throw new TypeError('Invalid calculator field');
    }
  };
  validateInputs(mode,value.inputs);
  if(value.pa){if(!value.profile || value.profile.paInterest!=='yes')throw new TypeError('Unexpected PA summary');validateInputs('pa',value.pa.inputs);}
  const clean=createNeedsSnapshot(mode,value.inputs,value.reference,value.language,value.timestamp,value.profile?{profile:value.profile,pa:value.pa?.inputs}:undefined);
  if(!clean)throw new TypeError('Incomplete calculator summary');
  return clean;
}
