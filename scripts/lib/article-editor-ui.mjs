// Exercise the visible settings sheet; never fill a hidden field with force.
export const articleCanvas=page=>page.frameLocator('.ae-canvas-frame');
export async function openSettings(page){
  await page.locator('.ae-settings').waitFor({state:'attached'});
  if(!await page.locator('.ae-settings').isVisible())await page.locator('.ae-actions [data-ae=settings]').click();
  while(await page.locator('.ae-settings details:not([open])').count())await page.locator('.ae-settings details:not([open]) > summary').first().click();
}
export async function closeSettings(page){
  if(await page.locator('.ae-settings-dialog[open]').count())await page.locator('.ae-settings-dialog .ae-done').click();
  await page.locator('.ae-settings-dialog').waitFor({state:'detached'});
}
export function articleField(page,key){
  const locator=()=>page.locator(`[data-field="${key}"]`);
  return new Proxy({}, {get(_,method){
    if(['fill','check','uncheck','selectOption'].includes(method))return async(...args)=>{
      await locator().waitFor({state:'attached'});
      const basic=await page.locator(`.ae-basic [data-field="${key}"]`).count();
      const alreadyOpen=await page.locator('.ae-settings-dialog').count();
      if(basic){await closeSettings(page);if(!await locator().isVisible())await page.locator('[data-ae=toggle-basic]').click();}else await openSettings(page);
      const result=await locator()[method](...args);if(!alreadyOpen)await closeSettings(page);return result;
    };
    if(method==='scrollIntoViewIfNeeded')return async()=>{await openSettings(page);await locator().scrollIntoViewIfNeeded();};
    return (...args)=>locator()[method](...args);
  }});
}
export async function articleTool(page,action){
  if(['cover','clear-cover','title-style','excerpt-style'].includes(action)){
    await closeSettings(page);if(!await page.locator(`[data-ae="${action}"]`).isVisible())await page.locator('[data-ae=toggle-basic]').click();
    await page.locator(`[data-ae="${action}"]:visible`).first().click();return;
  }
  if(['cover','clear-cover','add-source','title-style','excerpt-style'].includes(action)){
    await openSettings(page);await page.locator(`[data-ae="${action}"]:visible`).first().click();
    if(['clear-cover','add-source'].includes(action))await closeSettings(page);return;
  }
  await closeSettings(page);await page.locator(`[data-ae="${action}"]:visible`).first().click();
}
