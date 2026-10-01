// Exercise inline disclosures or the optional settings sheet through real UI.
export const articleCanvas=page=>page.frameLocator('.ae-canvas-frame');
async function revealDetails(control){
  const closed=()=>control.locator('xpath=ancestor::details[not(@open)]');
  while(await closed().count())await closed().first().locator(':scope > summary').click();
}
async function ensureSettingsVisible(page){
  const settings=page.locator('.ae-settings');
  await settings.waitFor({state:'attached'});
  // Narrow layouts move the same panels into reading/tab order outside the aside.
  if(!await page.locator('.ae-settings-panel:visible').count()&&!await settings.locator(':scope > :visible').count())await page.locator('[data-ae=settings]:visible').click();
}
export async function openSettings(page){
  await ensureSettingsVisible(page);
  const closed=()=>page.locator('.ae-settings details:not([open]), .ae-settings-panel:not([open]), .ae-settings-panel details:not([open])');
  while(await closed().count())await closed().first().locator(':scope > summary').click();
}
export async function closeSettings(page){
  if(await page.locator('.ae-settings-dialog[open]').count())await page.locator('.ae-settings-dialog .ae-done').click();
  await page.locator('.ae-settings-dialog').waitFor({state:'detached'});
}
export async function revealArticleControl(page,selector){
  const control=(typeof selector==='string'?page.locator(selector):selector).first();
  await control.waitFor({state:'attached'});
  if(await control.evaluate(el=>Boolean(el.closest('.ae-settings,.ae-settings-panel'))))await ensureSettingsVisible(page);
  else{
    await closeSettings(page);
    if(await control.locator('xpath=ancestor::*[contains(concat(" ",normalize-space(@class)," ")," ae-basic ")]').count()&&!await control.isVisible())await page.locator('[data-ae=toggle-basic]').click();
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
