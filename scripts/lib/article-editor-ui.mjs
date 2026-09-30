// Exercise the visible settings sheet; never fill a hidden field with force.
export const articleCanvas=page=>page.frameLocator('.ae-canvas-frame');
export async function openSettings(page){
  if(!await page.locator('.ae-settings-dialog').count())await page.locator('.ae-actions [data-ae=settings]').click();
}
export async function closeSettings(page){
  if(await page.locator('.ae-settings-dialog[open]').count())await page.locator('.ae-settings-dialog .ae-done').click();
  await page.locator('.ae-settings-dialog').waitFor({state:'detached'});
}
export function articleField(page,key){
  const locator=()=>page.locator(`.ae-settings [data-field="${key}"]`);
  return new Proxy({}, {get(_,method){
    if(['fill','check','uncheck','selectOption'].includes(method))return async(...args)=>{
      const alreadyOpen=await page.locator('.ae-settings-dialog').count();await openSettings(page);
      const result=await locator()[method](...args);if(!alreadyOpen)await closeSettings(page);return result;
    };
    if(method==='scrollIntoViewIfNeeded')return async()=>{await openSettings(page);await locator().scrollIntoViewIfNeeded();};
    return (...args)=>locator()[method](...args);
  }});
}
export async function articleTool(page,action){
  if(['cover','clear-cover','add-source','title-style','excerpt-style'].includes(action)){
    await openSettings(page);await page.locator(`[data-ae="${action}"]:visible`).first().click();
    if(['clear-cover','add-source'].includes(action))await closeSettings(page);return;
  }
  await closeSettings(page);await page.locator(`[data-ae="${action}"]:visible`).first().click();
}
