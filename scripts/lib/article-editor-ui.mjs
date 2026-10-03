// Exercise inline disclosures or the optional settings sheet through real UI.
export const articleCanvas=page=>page.frameLocator('.ae-canvas-frame');
async function revealDetails(control){
  const closed=()=>control.locator('xpath=ancestor::details[not(@open)]');
  while(await closed().count())await closed().first().locator(':scope > summary').click();
}
async function ensureSettingsVisible(page){
  const settings=page.locator('.ae-settings');
  await settings.waitFor({state:'attached'});
  const dialog=page.locator('.ae-settings-dialog[open]');
  // The loading canvas can move this footer button between pointerdown/up.
  // Keyboard activation uses the real button without depending on its position.
  if(!await dialog.count())await page.locator('[data-ae=settings]:visible').press('Enter');
  await dialog.waitFor({state:'visible'});
  await settings.waitFor({state:'visible'});
}
export async function openSettings(page){
  await ensureSettingsVisible(page);
  const closed=()=>page.locator('.ae-settings details:not([open])');
  while(await closed().count())await closed().first().locator(':scope > summary').click();
}
export async function closeSettings(page){
  if(await page.locator('.ae-settings-dialog[open]').count())await page.locator('.ae-settings-dialog .ae-done').click();
  await page.locator('.ae-settings-dialog').waitFor({state:'detached'});
}
export async function revealArticleControl(page,selector){
  const control=(typeof selector==='string'?page.locator(selector):selector).first();
  await control.waitFor({state:'attached'});
  const readerPanel=await control.evaluate(el=>el.closest('.ae-reader-fields > [data-panel]')?.dataset.panel);
  if(readerPanel){
    await closeSettings(page);
    const trigger=page.locator(`[data-reader-panel="${readerPanel}"]`);
    if(await trigger.getAttribute('aria-expanded')!=='true')await trigger.click();
    await revealDetails(control);
    return control;
  }
  if(await control.evaluate(el=>Boolean(el.closest('.ae-settings,.ae-settings-panel'))))await ensureSettingsVisible(page);
  else{
    await closeSettings(page);
    if(await control.evaluate(el=>Boolean(el.closest('.ae-canvas')))&&await page.locator('.ae-reader-panels:visible').count())await page.locator('[data-ae=close-reader]').click();
    if(await control.locator('xpath=ancestor::*[contains(concat(" ",normalize-space(@class)," ")," ae-basic ")]').count()&&await page.locator('[data-ae=toggle-basic]').getAttribute('aria-expanded')==='false')await page.locator('[data-ae=toggle-basic]').click();
  }
  await revealDetails(control);
  return control;
}
export function articleField(page,key){
  const locator=()=>page.locator(`[data-field="${key}"]`);
  return new Proxy({}, {get(_,method){
    if(['fill','clear','check','uncheck','selectOption','click','focus','press','pressSequentially','setInputFiles','scrollIntoViewIfNeeded'].includes(method))return async(...args)=>{
      const alreadyOpen=await page.locator('.ae-settings-dialog[open]').count();
      const control=await revealArticleControl(page,locator());
      const result=await control[method](...args);if(!alreadyOpen)await closeSettings(page);return result;
    };
    return (...args)=>locator()[method](...args);
  }});
}
export async function articleTool(page,action){
  const visible=page.locator(`[data-ae="${action}"]:visible`);
  const control=await revealArticleControl(page,await visible.count()?visible:page.locator(`[data-ae="${action}"]`));
  await control.click();
  if(['clear-cover','add-source'].includes(action))await closeSettings(page);
}
