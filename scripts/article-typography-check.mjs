import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {normalizeArticleDocument,renderArticleDocument} from '../article-document.mjs';
import {createArticleDraft,parseDraftBackup} from '../admin/articles/drafts.mjs';
import {startArticlesAdminPreview} from './articles-admin-preview.mjs';
import {startArticleDetailPreview} from './article-detail-preview.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';
import {articleCanvas,articleField,articleTool,closeSettings,revealArticleControl} from './lib/article-editor-ui.mjs';

const p=text=>({type:'paragraph',content:[{type:'text',text}]}),canonical=normalizeArticleDocument;
const style={fontSize:27.5,fontSizeMobile:18,lineHeight:1.65,spaceBefore:0,spaceAfter:14,padding:12};
const source={type:'doc',attrs:{titleStyle:style,excerptStyle:{fontSize:19,fontSizeMobile:16}},content:[
  ...Array.from({length:6},(_,index)=>({...p('Repeated heading'),type:'heading',attrs:{level:index+1,...style}})),
  {...p('Body with custom sizing'),attrs:style},
  {type:'blockquote',attrs:style,content:[{...p('Nested paragraph'),attrs:{fontSize:21,padding:0}}]},
  {type:'paragraph',content:[{type:'text',text:'Bold and sized',marks:[{type:'bold'},{type:'textStyle',attrs:{fontSize:23,fontSizeMobile:17}}]}]}
]};
const normalized=canonical(source),rendered=renderArticleDocument(source);
assert.deepEqual(canonical(normalized),normalized,'Typography normalization is idempotent');
assert.deepEqual(normalized.content.slice(0,6).map(node=>node.attrs.level),[1,2,3,4,5,6]);
assert.deepEqual(normalized.content[6].attrs,style,'Block styles preserve decimal sizing and zero spacing');
assert.equal(normalized.content[7].content[0].attrs.padding,0,'Nested block zero padding survives');
assert.deepEqual(normalized.attrs.titleStyle,style,'Actual article title styles persist in the document');
assert.equal(normalized.content[8].content[0].marks[1].attrs.fontSizeMobile,17);
assert.equal(rendered.toc.length,6);assert.equal(new Set(rendered.toc.map(item=>item.id)).size,6,'Repeated headings have unique TOC targets');
for(let level=1;level<=6;level++)assert.ok(rendered.html.includes(`<h${level} `),'Heading level '+level+' reaches the renderer');
for(const item of rendered.toc)assert.ok(rendered.html.includes(`id="${item.id}"`),'TOC target is present');
assert.ok(rendered.html.includes('<strong>'),'Custom sizes preserve rich-text marks');
assert.match(rendered.html,/style="[^"]*27\.5px/,'Renderer emits normalized numeric sizes');
const backup=createArticleDraft({id:'typography-boundary',translations:{th:{title:'Typography',document:source}}});
assert.deepEqual(parseDraftBackup(JSON.stringify(backup)).translations.th.document,normalized,'Backup import retains type hierarchy and styles');

for(const key of ['fontSize','fontSizeMobile','lineHeight','spaceBefore','spaceAfter','padding']){
  for(const bad of ['',null,undefined,false,true,NaN,Infinity,-1,'24px','18;position:fixed',{},[]]){
    const checked=canonical({type:'doc',content:[{...p('Unsafe'),attrs:{[key]:bad,style:'display:none',fontFamily:'Comic Sans'}}]});
    assert.equal(checked.content[0].attrs?.[key],undefined,key+' strips '+String(bad));
    assert.equal(checked.content[0].attrs?.style,undefined);assert.equal(checked.content[0].attrs?.fontFamily,undefined);
  }
}
for(const [key,min,max] of [['fontSize',8,120],['fontSizeMobile',8,120],['lineHeight',1,3],['spaceBefore',0,160],['spaceAfter',0,160],['padding',0,120]]){
  for(const value of [min,max])assert.equal(canonical({type:'doc',content:[{...p('Boundary'),attrs:{[key]:value}}]}).content[0].attrs[key],value,key+' accepts boundary');
  for(const value of [min-0.01,max+0.01])assert.equal(canonical({type:'doc',content:[{...p('Outside'),attrs:{[key]:value}}]}).content[0].attrs?.[key],undefined,key+' strips out-of-range');
}
const hostile=renderArticleDocument({type:'doc',attrs:{titleStyle:{fontSize:'18;position:fixed',style:'display:none'}},content:[{type:'paragraph',attrs:{fontSize:'24px;background:url(https://example.com)',padding:12},content:[{type:'text',text:'Safe',marks:[{type:'textStyle',attrs:{fontSize:'16" onmouseover="alert(1)',fontSizeMobile:17,fontFamily:'Arial',style:'position:fixed'}}]}]}]});
assert.equal(/position|onmouseover|background:url|font-family|display:none/.test(hostile.html),false,'Arbitrary style and event text never reach rendered HTML');
assert.equal(hostile.document.content[0].content[0].marks[0].attrs.fontSize,undefined);
assert.equal(hostile.document.content[0].content[0].marks[0].attrs.fontSizeMobile,17,'Valid responsive value survives a malicious neighboring value');
console.log('PASS article typography boundary: H1–H6, safe numeric block/inline styles, zero spacing, nested styles, unique TOC IDs and backup round trip.');

if(process.argv.includes('--browser')){
  const engine=process.env.BROWSER||'chromium',out='uat-results/article-typography';await fs.mkdir(out,{recursive:true});
  const server=await startArticlesAdminPreview(),pw=loadPlaywright();
  const browser=engine==='chromium'?await launchChromium(pw.chromium):await pw[engine].launch();
  const report={engine,environment:'Loopback UI with synthetic account and local IndexedDB; no production connections or writes',checks:[],defaults:[],styles:[],errors:[],passed:false};let page,reader;
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce'}),origins=new Set([server.baseUrl]);
    await context.route('**/*',route=>origins.has(new URL(route.request().url()).origin)?route.continue():route.abort());
    page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>report.errors.push(error.message));
    await page.goto(server.baseUrl+'/admin#articles');await page.locator('[data-article-state=ready]').waitFor();await page.locator('[data-article-action=create]').click();
    const body=()=>articleCanvas(page).locator('.ae-editor-host:not([hidden]) .tiptap');await body().waitFor();
    const tool=action=>articleTool(page,action),doc=async()=>canonical(await body().evaluate(el=>el.editor.getJSON()));
    const choose=async(selector,value)=>{
      const select=page.locator(selector),label=await select.locator(`option[value="${value}"]`).innerText(),trigger=select.locator('xpath=..').locator('.cm-select-trigger');
      if(await trigger.count()){await trigger.click();await page.getByRole('option',{name:label,exact:true}).click();}else await select.selectOption(value);
    };
    const editStyle=async(action,values)=>{await tool(action);const form=page.locator('.ae-modal-form');for(const [key,value] of Object.entries(values))await form.locator(`[data-field="${key}"]`).fill(String(value));await form.locator('[type=submit]').click();};
    const exported=async(name)=>{const pending=page.waitForEvent('download');await tool('export');const download=await pending,path=`${out}/${engine}-${name}.json`;await download.saveAs(path);return JSON.parse(await fs.readFile(path,'utf8'));};
    const save=async()=>{await tool('save');await page.locator('.ae-feedback').filter({hasText:'บันทึกฉบับร่างบนเครื่องแล้ว'}).waitFor();};
    await articleField(page,'title').fill('Typography controls QA');await articleField(page,'excerpt').fill('ชนิดข้อความและขนาดที่ตั้งเอง');await articleField(page,'slug').fill('typography-controls-qa');
    const lines=[...Array.from({length:6},(_,i)=>'Heading '+(i+1)),'Normal BOLD rest','Block spacing sample'];
    await body().fill(lines[0]);await body().press('End');
    for(const line of lines.slice(1)){await page.keyboard.press('Enter');await page.keyboard.insertText(line);}
    for(let level=1;level<=6;level++){await body().locator('p').filter({hasText:'Heading '+level}).click();await choose('select[data-format=block]','h'+level);assert.equal(await body().locator('h'+level).innerText(),'Heading '+level);}
    await body().locator('h6').click();await choose('select[data-format=block]','paragraph');assert.equal(await body().locator('h6').count(),0,'H6 can return to paragraph');await choose('select[data-format=block]','h6');
    assert.deepEqual((await doc()).content.slice(0,6).map(node=>node.attrs.level),[1,2,3,4,5,6]);
    const scale=()=>body().evaluate(el=>Object.fromEntries(['h1','h2','h3','h4','h5','h6','p'].map(tag=>{const css=getComputedStyle(el.querySelector(tag));return [tag,{size:parseFloat(css.fontSize),family:css.fontFamily,lineHeight:css.lineHeight}];})));
    for(const mode of ['desktop','mobile']){
      await page.locator(`[data-canvas-size=${mode}]`).click();await body().evaluate(el=>el.ownerDocument.fonts.ready);const actual=await scale();report.defaults.push({mode,...actual});
      for(const [tag,typography] of Object.entries(actual))assert.match(typography.family,/Google Sans/,mode+' '+tag+' uses Google Sans');
      assert.ok(actual.p.size<22,'Default body is reduced from the oversized 22px treatment');
      assert.deepEqual(Object.values(actual).map(item=>item.size),mode==='desktop'?[36,26,22,20,18,16,18]:[24,20,18,17,16,15,16],'Semantic default size hierarchy follows the article scale');
      const loaded=await body().evaluate(el=>[...el.ownerDocument.fonts].some(font=>font.family.replace(/["']/g,'').startsWith('Google Sans')&&font.status==='loaded'));
      assert.equal(loaded,true,'A local Google Sans FontFace actually loaded for '+mode);
    }
    report.checks.push('UI creates H1–H6 and P; compact semantic defaults and loaded Google Sans on desktop/mobile');
    await page.locator('[data-canvas-size=desktop]').click();
    const inline=()=>body().locator('p').filter({hasText:'Normal BOLD rest'});
    const mac=await page.evaluate(()=>/Mac/.test(navigator.platform));
    await inline().click();await page.keyboard.press(mac?'Meta+ArrowLeft':'Home');for(let i=0;i<7;i++)await page.keyboard.press('ArrowRight');for(let i=0;i<4;i++)await page.keyboard.press('Shift+ArrowRight');
    assert.equal(await body().evaluate(el=>el.ownerDocument.getSelection().toString()),'BOLD','Native keyboard selects the target word');
    await tool('bold');
    await (await revealArticleControl(page,'[data-text-size]')).fill('27.5');await (await revealArticleControl(page,'[data-text-size-mobile]')).fill('18.5');await tool('apply-text-size');
    let line=(await doc()).content.find(node=>node.content?.some(child=>child.text?.includes('BOLD')));
    let bold=line.content.find(node=>node.text==='BOLD');assert.ok(bold,'Only the intended word is selected');
    assert.ok(bold.marks.some(mark=>mark.type==='bold'),'Sizing preserves existing bold');assert.deepEqual(bold.marks.find(mark=>mark.type==='textStyle').attrs,{fontSize:27.5,fontSizeMobile:18.5});
    assert.equal(line.content.filter(node=>node.text!=='BOLD').some(node=>node.marks?.some(mark=>mark.type==='textStyle')),false,'Adjacent text stays at default size');
    const sized=await doc();await tool('reset-text-size');line=(await doc()).content.find(node=>node.content?.some(child=>child.text?.includes('BOLD')));bold=line.content.find(node=>node.text==='BOLD');assert.ok(bold.marks.some(mark=>mark.type==='bold'));assert.equal(bold.marks.some(mark=>mark.type==='textStyle'),false,'Inline reset leaves bold intact');
    await tool('undo');assert.deepEqual(await doc(),sized,'Inline reset is undoable');
    await body().locator('p').filter({hasText:'Block spacing sample'}).click();await editStyle('block-style',{fontSize:24,fontSizeMobile:19,lineHeight:1.8,spaceBefore:0,spaceAfter:14,padding:12});
    const styled=await doc(),block=styled.content.find(node=>node.content?.[0]?.text==='Block spacing sample');assert.deepEqual(Object.fromEntries(Object.keys(style).map(key=>[key,block.attrs[key]])),{fontSize:24,fontSizeMobile:19,lineHeight:1.8,spaceBefore:0,spaceAfter:14,padding:12});
    await tool('reset-block-style');assert.equal((await doc()).content.find(node=>node.content?.[0]?.text==='Block spacing sample').attrs?.fontSize,undefined);await tool('undo');assert.deepEqual(await doc(),styled,'Block style reset is undoable');
    await editStyle('title-style',{fontSize:36,fontSizeMobile:25,lineHeight:1.3});await editStyle('excerpt-style',{fontSize:19,fontSizeMobile:16,lineHeight:1.6});
    report.checks.push('Partial inline decimal sizing preserves bold and adjacent text; block/title/excerpt styles, zero spacing, reset and Undo');
    await closeSettings(page);await body().locator('p').filter({hasText:'Block spacing sample'}).click();await tool('add-paragraph');await page.keyboard.insertText('Card sizing sample');
    await (await revealArticleControl(page,'[data-ae=callout][data-kind=summary]')).click();await page.locator('.ae-modal-form [data-field=title]').fill('Card heading');await page.locator('.ae-modal-form [type=submit]').click();
    await editStyle('block-style',{fontSize:23,fontSizeMobile:17,lineHeight:1.8,padding:8});
    await tool('add-paragraph');await tool('table');await page.locator('[data-command=insertTable]').click();
    await body().locator('table p').first().click();await page.keyboard.insertText('Table sizing sample');
    await editStyle('block-style',{fontSize:21,fontSizeMobile:16,lineHeight:1.7,spaceBefore:0,spaceAfter:10,padding:8});
    assert.equal((await doc()).content.find(node=>node.type==='table').attrs.fontSize,21,'Table wrapper styles persist as table node attributes');
    await save();const first=await exported('saved');await page.reload();await page.locator('[data-article-state=ready]').waitFor();await page.locator('[name=query]').fill('Typography controls QA');await page.locator('[data-article-action=edit]').first().click();await body().waitFor();assert.deepEqual(await doc(),canonical(first.translations.th.document),'Save/reopen preserves typography');
    const reopened=await exported('reopened');assert.deepEqual(reopened.translations,first.translations,'Reopened export matches saved document and metadata');report.checks.push('Author → save local draft → reload → reopen → export equality');
    const published={...reopened,status:'published',translations:Object.fromEntries(Object.entries(reopened.translations).map(([lang,t])=>[lang,{...t,status:'published',publishedAt:'2026-09-01T00:00:00Z',author:reopened.authorName}]))};
    reader=await startArticleDetailPreview({feed:{available:true,sample:true,items:[published]},details:{sample:true,items:[published]}});origins.add(reader.baseUrl);const publicPage=await context.newPage();
    const samples=root=>root.evaluate(el=>{
      const prose=el.querySelector('.ae-editor-host:not([hidden]) .tiptap')||el.querySelector('cm-article-document');
      const pairs=[...Array.from({length:6},(_,i)=>['h'+(i+1),prose.querySelector('h'+(i+1))]),['inline',prose.querySelector('strong')],['block',[...prose.querySelectorAll('p')].find(node=>node.textContent==='Block spacing sample')],['card',prose.querySelector('.article-callout > div > p')],['cardTitle',prose.querySelector('.article-callout-title')],['tableWrapper',prose.querySelector('.article-table-scroll')],['table',prose.querySelector('table p')],['title',el.querySelector('.ad-header h1')],['excerpt',el.querySelector('.ad-deck')]];
      return Object.fromEntries(pairs.map(([key,node])=>{if(!node)throw Error('Missing '+key);const target=key==='inline'?node.querySelector('span')||node:node,css=getComputedStyle(target);return [key,{text:node.textContent,...Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','marginTop','marginBottom','paddingTop','paddingLeft'].map(key=>[key,css[key]]))}];}));
    });
    for(const mode of ['desktop','mobile']){
      await page.locator(`[data-canvas-size=${mode}]`).click();const canvas=articleCanvas(page).locator('.ad-page'),width=await canvas.evaluate(el=>el.ownerDocument.defaultView.innerWidth);
      await publicPage.setViewportSize({width,height:1000});await publicPage.goto(reader.baseUrl+'/articles/'+published.slug);await publicPage.locator('cm-article-document h6').waitFor();await publicPage.evaluate(()=>document.fonts.ready);await canvas.evaluate(el=>el.ownerDocument.fonts.ready);
      const actual=await samples(canvas);assert.deepEqual(actual,await samples(publicPage.locator('.ad-page')),mode+' authored typography matches public reader');
      assert.equal(actual.inline.fontSize,mode==='mobile'?'18.5px':'27.5px');assert.equal(actual.block.fontSize,mode==='mobile'?'19px':'24px');assert.equal(actual.block.paddingTop,'12px');assert.equal(actual.block.marginTop,'0px');assert.equal(actual.block.marginBottom,'14px');assert.equal(actual.title.fontSize,mode==='mobile'?'25px':'36px');assert.equal(actual.excerpt.fontSize,mode==='mobile'?'16px':'19px');
      assert.equal(actual.card.fontSize,mode==='mobile'?'17px':'23px');assert.equal(actual.cardTitle.fontSize,mode==='mobile'?'17px':'20px','Card heading keeps its own role scale');assert.equal(actual.table.fontSize,mode==='mobile'?'16px':'21px');assert.equal(actual.tableWrapper.paddingTop,'8px');assert.equal(actual.tableWrapper.marginTop,'0px');assert.equal(actual.tableWrapper.marginBottom,'10px');
      const ids=await publicPage.locator('.ad-toc nav a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));assert.equal(ids.length,6);assert.equal(new Set(ids).size,6);for(const id of ids)assert.equal(await publicPage.locator(id).count(),1,'Public TOC links to one unique heading');
      await tool('preview');const preview=page.frameLocator('.ae-preview-frame').locator('.ad-page');await preview.locator('h6').waitFor();await page.locator(`.ae-preview-modes [data-ae=${mode}]`).click();await preview.evaluate(el=>el.ownerDocument.fonts.ready);assert.deepEqual(actual,await samples(preview),mode+' Preview renders exactly the same typography');await page.locator('.ae-preview-dialog [data-ae=close]').click();
      await canvas.locator('.ad-prose').screenshot({path:`${out}/${engine}-canvas-${mode}.png`});await publicPage.locator('.ad-prose').screenshot({path:`${out}/${engine}-reader-${mode}.png`});report.styles.push({mode,...actual});
    }
    report.checks.push('Desktop/mobile inline/block/title/deck computed styles match Editor, Preview and public reader; all six TOC targets valid');
    await publicPage.close();assert.deepEqual(server.requests,[],'No public API writes');assert.deepEqual(report.errors,[]);report.passed=true;console.log('PASS article typography UI: '+engine);
  }catch(error){report.error=error.stack;if(page)await page.screenshot({path:`${out}/${engine}-failure.png`}).catch(()=>{});throw error;}
  finally{await fs.writeFile(`${out}/${engine}-report.json`,JSON.stringify(report,null,2));await browser.close();await new Promise(resolve=>server.server.close(resolve));if(reader)await new Promise(resolve=>reader.server.close(resolve));}
}
