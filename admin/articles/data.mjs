export function createCloudArticleRepository({request}={}) {
  const call=request||async function(action,body,id) {
    const {appendEnvironmentSearch}=await import('/covermate-environment.mjs');
    if(!window.CoverMateFirebase)await import('/covermate-firebase.js');
    const cm=window.CoverMateFirebase;
    const user=cm.auth?.currentUser || await cm.waitForAuth();
    if(!user)throw Object.assign(Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง'),{status:401});
    const path='/api/articles?action='+action+(id?'&id='+encodeURIComponent(id):'');
    const url=appendEnvironmentSearch(path,cm.environment);
    const response=await fetch(url,{method:body?'POST':'GET',cache:'no-store',signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+await user.getIdToken(),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    const result=await response.json();
    if(!response.ok)throw Object.assign(Error(result.message||'โหลดข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง'),{status:response.status,code:result.error,fields:result.fields});
    return result;
  };
  return {cloud:true,catalog:()=>call('catalog'),feed:()=>call('feed'),get:id=>call('read',null,id),
    save:(article,expectedRevision)=>call('save',{article,expectedRevision}),
    publish:(id,expectedRevision,languages)=>call('publish',{id,expectedRevision,languages}),
    unpublish:(id,expectedRevision)=>call('unpublish',{id,expectedRevision}),
    reorderPins:(order,expectedRevision)=>call('pin-order',{order,expectedRevision}),
    settings:(settings,expectedRevision)=>call('settings',{settings,expectedRevision})};
}
const repository=createCloudArticleRepository();
export const loadArticleCatalog=()=>repository.catalog();
export const loadPublishedArticleFeed=()=>repository.feed();
export const loadArticleForEditor=id=>repository.get(id);
