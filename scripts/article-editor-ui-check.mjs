import assert from 'node:assert/strict';
import {articleTool} from './lib/article-editor-ui.mjs';
import {loadPlaywright,launchChromium} from './lib/playwright.mjs';

const playwright=loadPlaywright();
for(const engine of (process.env.COVERMATE_ARTICLES_BROWSER||'chromium,webkit').split(',')){
  const browser=engine==='chromium'?await launchChromium(playwright.chromium,{headless:true}):await playwright[engine].launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    page.setDefaultTimeout(1500);
    // The real editor reveals its 740px writing frame asynchronously above the
    // footer Settings button. Reproduce that geometry change between down/up.
    await page.setContent(`<style>[hidden]{display:none!important}body{overflow-anchor:none}#canvas{height:740px}dialog{width:300px}</style>
      <div class="ae-workspace"><div id="canvas" hidden></div>
      <button type="button" data-ae="settings">Settings</button>
      <aside class="ae-settings" hidden><details open><summary>Publication</summary>
      <button type="button" data-ae="unpublish">Unpublish article</button></details></aside></div>
      <script>
      window.actions={settings:0,unpublish:0};
      const trigger=document.querySelector('[data-ae=settings]'),panel=document.querySelector('.ae-settings');
      for(const event of ['pointerdown','keydown'])trigger.addEventListener(event,()=>document.querySelector('#canvas').hidden=false,{once:true});
      trigger.onclick=()=>{window.actions.settings++;const dialog=document.createElement('dialog');dialog.className='ae-settings-dialog';document.body.append(dialog);panel.hidden=false;dialog.append(panel);dialog.showModal();};
      panel.querySelector('[data-ae=unpublish]').onclick=()=>window.actions.unpublish++;
      </script>`);
    await articleTool(page,'unpublish');
    assert.equal(await page.locator('#canvas').isVisible(),true,'Canvas reveal really changed the layout during activation');
    assert.deepEqual(await page.evaluate(()=>window.actions),{settings:1,unpublish:1},'The visible control is activated after opening its actual settings dialog');
    assert.equal(await page.locator('.ae-settings-dialog[open]').isVisible(),true);
    await articleTool(page,'unpublish');
    assert.deepEqual(await page.evaluate(()=>window.actions),{settings:1,unpublish:2},'An already-open settings dialog is reused');
    await page.locator('[data-ae=unpublish]').evaluate(button=>button.hidden=true);
    page.setDefaultTimeout(250);
    await assert.rejects(articleTool(page,'unpublish'),/Timeout/,'An unavailable action must still fail, never force-click');
    assert.equal(await page.evaluate(()=>window.actions.unpublish),2);
    console.log(`PASS ${engine}: settings activation survives canvas layout changes, reuses the open dialog and rejects unavailable actions.`);
  }finally{await browser.close();}
}
