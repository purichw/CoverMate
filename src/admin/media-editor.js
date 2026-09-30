import Cropper from 'cropperjs';
import { mediaRequest, uploadOriginal } from './media-client.js';

const text = {
  en:{title:'Edit image',file:'Choose image',url:'Image path or HTTPS URL',load:'Load image',crop:'Crop',fit:'Fit whole image',save:'Use image in draft',cancel:'Cancel',clear:'Clear image',reset:'Reset crop',left:'Move left',right:'Move right',up:'Move up',down:'Move down',zoomIn:'Zoom in',zoomOut:'Zoom out',busy:'Saving image...',loading:'Loading image...',failed:'Cannot load this image for cropping. Choose a local file if the image host does not allow cross-origin access.',invalid:'Choose a PNG, JPEG, WebP or SVG image up to 8 MB.',large:'Image is too large. Use a source below 20 megapixels.',hint:'PNG, JPEG, WebP, SVG · 8 MB max',ratio:'Output',empty:'Choose an image',error:'Could not save. Your current image is unchanged.'},
  th:{title:'แก้ไขรูปภาพ',file:'เลือกรูปภาพ',url:'Path รูปหรือ HTTPS URL',load:'โหลดรูป',crop:'ครอป',fit:'แสดงรูปเต็ม',save:'ใช้รูปนี้ใน draft',cancel:'ยกเลิก',clear:'ล้างรูป',reset:'คืนค่าการครอป',left:'เลื่อนซ้าย',right:'เลื่อนขวา',up:'เลื่อนขึ้น',down:'เลื่อนลง',zoomIn:'ขยาย',zoomOut:'ย่อ',busy:'กำลังบันทึกรูป...',loading:'กำลังโหลดรูป...',failed:'โหลดรูปเพื่อครอปไม่ได้ หากเว็บไซต์ต้นทางไม่อนุญาต ให้เลือกไฟล์รูปจากเครื่องแทน',invalid:'เลือก PNG, JPEG, WebP หรือ SVG ขนาดไม่เกิน 8 MB',large:'รูปใหญ่เกินไป กรุณาใช้รูปไม่เกิน 20 ล้านพิกเซล',hint:'PNG, JPEG, WebP, SVG · ไม่เกิน 8 MB',ratio:'ขนาดรูป',empty:'เลือกรูปภาพ',error:'บันทึกไม่สำเร็จ รูปเดิมยังไม่เปลี่ยน'}
};

function element(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key,value] of Object.entries(props)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2),value);
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key,value);
  }
  node.append(...children);
  return node;
}

// This CMS-only wiring shares the dialog's existing lazy boundary. The host
// continues to own identity, stale-owner checks and draft/history persistence.
export async function editCmsMedia(host, path, options, cmsAdminMediaLabel) {
  if (!host.hasSession()) return;
  const {cmsImageSlots,cmsGet,cmsMedia,cmsSet} = window.CoverMateContract;
  const slot = cmsImageSlots(host.state.site,host.state.lang).find(item => item.path === path);
  if (!slot) return;
  const saved = host.state.site.mediaEdits?.[path];
  await editImage({slot:{...slot,label:cmsAdminMediaLabel(slot)},lang:'th',source:saved?.source || slot.value,
    sourceAsset:saved?.sourceAsset,crop:saved?.crop,provider:saved?.provider,initialFile:options.initialFile,initialUrl:options.initialUrl,
    getToken:async()=>{const firebase=await host.firebase();return firebase.getAdminIdToken(true);},
    onApply:result=>{
      if (!cmsImageSlots(host.state.site,host.state.lang).some(item=>item.path===path) || String(cmsGet(host.state.site,path) || '') !== slot.value) throw Error('รูปนี้ถูกเปลี่ยนระหว่างที่แก้ไข กรุณาปิดแล้วเปิดตัวแก้ไขรูปอีกครั้ง');
      if (result.url && !cmsMedia(result.url)) throw Error('URL รูปภาพไม่ถูกต้อง');
      host.upd(config=>{cmsSet(config,path,result.url);config.mediaEdits=config.mediaEdits || {};if(result.url)config.mediaEdits[path]={output:result.url,source:result.sourceUrl,provider:result.provider,sourceAsset:result.sourceAsset,crop:result.crop};else delete config.mediaEdits[path];});
    }
  });
}

export async function editImage({slot,source,sourceAsset,crop,provider,initialFile,initialUrl,lang = 'th',getToken,onApply}) {
  if (document.querySelector('.cm-media-dialog')) return;
  const t = text[lang] || text.en;
  for (const href of ['/admin/cropper.css','/admin/media-editor.css']) if (!document.querySelector(`link[href="${href}"]`)) document.head.append(element('link',{rel:'stylesheet',href}));
  const opener = document.activeElement;
  const dialog = element('dialog',{class:'cm-media-dialog','aria-labelledby':'cm-media-title'});
  const extra = lang === 'th'
    ? {uploading:'กำลังอัปโหลดต้นฉบับ...',importing:'กำลังนำรูปเข้า Cloudinary...',ready:'เก็บต้นฉบับแล้ว จัดกรอบก่อนใช้รูป',original:'ต้นฉบับ',kept:'เก็บรูปต้นฉบับเต็มไว้ เพื่อกลับมาปรับกรอบได้',url:'URL รูปจาก Cloudinary หรือเว็บไซต์อื่น',load:'ใช้ URL และจัดกรอบ',ratio:'สัดส่วน',unavailable:'อัปโหลดต้นฉบับไม่สำเร็จ รูปเดิมยังไม่เปลี่ยน ลองเลือกไฟล์หรือใช้ URL อีกครั้ง'}
    : {uploading:'Uploading original...',importing:'Importing image...',ready:'Original saved. Adjust the frame before using this image.',original:'Original',kept:'The full original is kept so you can crop it again later.',url:'Image URL from Cloudinary or another website',load:'Use URL and crop',ratio:'Ratio',unavailable:'Could not upload the original. Your current image is unchanged. Choose the file or URL again to retry.'};
  let cropper, original, busy = false, generation = 0, mode = crop?.mode === 'fit' ? 'fit' : 'crop', activeSource = source || slot.value || '', activeAsset = sourceAsset, activeProvider = provider || '', requestController;
  const status = element('p',{class:'cm-media-status',role:'status','aria-live':'polite',text:t.empty});
  const error = element('p',{class:'cm-media-error',role:'alert'});
  const sourceInfo = element('p',{class:'cm-media-origin'});
  const stage = element('div',{class:'cm-media-stage'});
  const image = element('img',{alt:'',crossorigin:'anonymous'});
  const fitPreview = element('canvas',{'aria-label':t.fit});
  stage.append(image,fitPreview);
  const save = element('button',{type:'button',class:'cm-media-primary',text:t.save});
  save.disabled = true;
  const close = () => dialog.close();
  dialog.addEventListener('close',()=>{generation++;requestController?.abort();cropper?.destroy();dialog.remove();opener?.focus();},{once:true});
  const action = (name,symbol,fn) => element('button',{type:'button',title:name,'aria-label':name,text:symbol,onclick:fn});
  const toolbar = element('div',{class:'cm-media-toolbar',role:'group','aria-label':t.crop},[
    action(t.zoomOut,'−',()=>cropper?.zoom(-.1)),action(t.zoomIn,'+',()=>cropper?.zoom(.1)),
    action(t.left,'←',()=>cropper?.move(-10,0)),action(t.right,'→',()=>cropper?.move(10,0)),
    action(t.up,'↑',()=>cropper?.move(0,-10)),action(t.down,'↓',()=>cropper?.move(0,10)),
    action(t.reset,'↺',()=>cropper?.reset())
  ]);
  function showError(message) { error.textContent = lang === 'th' && message && !/[ก-๙]/.test(message) ? t.error : message; }
  function setBusy(value, message = t.busy) {
    busy = value;
    dialog.querySelectorAll('button,input').forEach(node=>{node.disabled = value && !node.hasAttribute('data-media-cancel');});
    save.disabled = value || !original;
    status.textContent = value ? message : (original ? `${t.ratio}: ${slot.width} × ${slot.height}` : t.empty);
  }
  function canvasForFit(sourceImage) {
    const canvas = document.createElement('canvas'); canvas.width=slot.width;canvas.height=slot.height;
    const sw=sourceImage.naturalWidth || sourceImage.width,sh=sourceImage.naturalHeight || sourceImage.height;
    const scale = Math.min(canvas.width/sw,canvas.height/sh);
    const w = sw*scale,h = sh*scale;
    canvas.getContext('2d').drawImage(sourceImage,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
    return canvas;
  }
  function updateMode() {
    const fit = mode === 'fit';
    stage.classList.toggle('cm-media-fit',fit);
    toolbar.hidden = fit;
    if (original && fit) {
      const canvas = canvasForFit(original); fitPreview.width=canvas.width;fitPreview.height=canvas.height;
      fitPreview.getContext('2d').drawImage(canvas,0,0);
    }
  }
  const modes = element('fieldset',{class:'cm-media-modes'},[element('legend',{text:t.crop})]);
  for (const value of ['crop','fit']) {
    const radio = element('input',{type:'radio',name:'cm-media-mode',value});radio.checked=value===mode;
    radio.addEventListener('change',()=>{mode=value;updateMode();});
    modes.append(element('label',{},[radio,document.createTextNode(t[value])]));
  }
  async function load(src, metadata = {}, savedCrop, current = ++generation) {
    save.disabled=true;showError('');status.textContent=t.loading;
    try {
      const loaded = new Image();loaded.crossOrigin='anonymous';loaded.src=src;
      await loaded.decode();
      if (current !== generation) return;
      if (loaded.naturalWidth*loaded.naturalHeight > 20000000) throw Error(t.large);
      // Keep full source resolution. Only the final derivative is resized.
      cropper?.destroy();cropper=null;original=loaded;image.src=src;
      await image.decode();
      if (current !== generation) return;
      activeSource=src;activeAsset=metadata.sourceAsset;activeProvider=metadata.provider || (new URL(src,location.origin).hostname==='res.cloudinary.com'?'cloudinary':'external');
      url.value=src;
      sourceInfo.textContent=`${extra.original}: ${loaded.naturalWidth} × ${loaded.naturalHeight} · ${activeProvider === 'cloudinary' ? 'Cloudinary' : activeProvider === 'external' ? (lang==='th'?'URL รูปภาพ':'Image URL') : activeProvider}`;
      mode=savedCrop?.mode==='fit'?'fit':'crop';
      modes.querySelectorAll('input').forEach(radio=>{radio.checked=radio.value===mode;});
      cropper=new Cropper(image,{aspectRatio:slot.width/slot.height,viewMode:1,dragMode:'move',autoCropArea:1,background:true,checkCrossOrigin:false,rotatable:false,scalable:false,zoomOnWheel:false,ready(){
        if(current!==generation)return;
        if(savedCrop?.mode==='crop' && savedCrop.sourceWidth===loaded.naturalWidth && savedCrop.sourceHeight===loaded.naturalHeight) cropper.setData(savedCrop);
        setBusy(false);updateMode();
      }});
    } catch (err) { if(current===generation) {setBusy(false);showError(err.message===t.large?t.large:t.failed);} }
  }
  async function importSource({selected,remoteUrl}) {
    const current=++generation;
    requestController?.abort();requestController=new AbortController();
    setBusy(true,selected?extra.uploading:extra.importing);showError('');
    const controller=requestController, timeout=setTimeout(()=>controller.abort(),90000);
    try {
      if(selected) {
        if(selected.size>8000000 || !['image/png','image/jpeg','image/webp','image/svg+xml'].includes(selected.type)) throw Error(t.invalid);
        const local=URL.createObjectURL(selected);
        try { const check=new Image();check.src=local;await check.decode();if(check.naturalWidth*check.naturalHeight>20000000)throw Error(t.large); }
        finally { URL.revokeObjectURL(local); }
      }
      if(current!==generation)return;
      const result=await uploadOriginal({file:selected,remoteUrl,getToken,signal:requestController.signal});
      if(current!==generation)return;
      if(!/^https:\/\//.test(result.sourceUrl || ''))throw Error(t.error);
      await load(result.sourceUrl,result,undefined,current);
    } catch(err) {if(current===generation){setBusy(false);showError([t.invalid,t.large].includes(err.message)?err.message:extra.unavailable);}}
    finally {clearTimeout(timeout);}
  }
  const file = element('input',{type:'file',accept:'image/png,image/jpeg,image/webp,image/svg+xml','aria-label':t.file});
  file.addEventListener('change',()=>{
    const selected=file.files[0];
    if (!selected) return;
    importSource({selected});file.value='';
  });
  const url = element('input',{type:'text',value:initialUrl || source || slot.value || '','aria-label':extra.url});
  const loadButton = element('button',{type:'button',text:extra.load,onclick:()=>{
    const value=url.value.trim();
    if (!/^(?:https:\/\/|\/?assets\/|\/?favicon\.(?:svg|ico)$)/i.test(value)) {showError(t.failed);return;}
    const normalized=value.startsWith('assets/') || value.startsWith('favicon.') ? '/'+value:value;
    let parsed;
    try { parsed=new URL(normalized,location.origin);if(parsed.username || parsed.password)throw Error(); }
    catch {showError(t.failed);return;}
    // Cloudinary URLs already have CORS-enabled originals. Other providers can
    // be imported without turning this application into an arbitrary URL proxy.
    if(normalized.startsWith('/') || parsed.hostname==='res.cloudinary.com') {
      requestController?.abort();setBusy(true,t.loading);load(normalized);
    } else importSource({remoteUrl:normalized});
  }});
  save.addEventListener('click',async()=>{
    if (busy || !original || !cropper) return;
    setBusy(true);showError('');
    const current=++generation;requestController?.abort();requestController=new AbortController();
    const controller=requestController, timeout=setTimeout(()=>controller.abort(),60000);
    try {
      const output = mode==='fit' ? canvasForFit(original) : cropper.getCroppedCanvas({width:slot.width,height:slot.height,imageSmoothingQuality:'high'});
      const imageData=output.toDataURL('image/png');
      if (imageData.length>2000000) throw Error(t.large);
      const geometry=mode==='fit'?{x:0,y:0,width:original.naturalWidth,height:original.naturalHeight,rotate:0,scaleX:1,scaleY:1}:cropper.getData();
      const cropData={rotate:0,scaleX:1,scaleY:1,...geometry,mode,sourceWidth:original.naturalWidth,sourceHeight:original.naturalHeight};
      const result=await mediaRequest({action:'crop',image:imageData,sourceUrl:activeSource,sourceAsset:activeAsset,provider:activeProvider,crop:cropData},getToken,requestController.signal);
      if(current!==generation)return;
      if (!/^https:\/\//.test(result.url) || !result.sourceUrl) throw Error(t.error);
      await onApply(result);busy=false;dialog.close();
    } catch(err) {if(current===generation){setBusy(false);showError(err.message || t.error);}}
    finally {clearTimeout(timeout);}
  });
  const gcd=(a,b)=>b?gcd(b,a%b):a, divisor=gcd(slot.width,slot.height);
  const cancelButton=()=>element('button',{type:'button','data-media-cancel':'',text:t.cancel,onclick:close});
  const closeButton=action(t.cancel,'×',close);closeButton.setAttribute('data-media-cancel','');
  dialog.append(
    element('div',{class:'cm-media-head'},[element('div',{},[element('h2',{id:'cm-media-title',text:t.title}),element('p',{text:slot.label}),element('small',{class:'cm-media-ratio',text:`${extra.ratio} ${slot.width/divisor}:${slot.height/divisor} · ${slot.width} × ${slot.height}`})]),closeButton]),
    element('div',{class:'cm-media-body'},[
      element('div',{class:'cm-media-source'},[element('label',{},[document.createTextNode(t.file),file]),element('small',{text:t.hint}),element('label',{},[document.createTextNode(extra.url),url]),loadButton]),
      element('p',{class:'cm-media-preserved',text:extra.kept}),sourceInfo,modes,stage,toolbar,status,error
    ]),
    element('div',{class:'cm-media-actions'},[element('button',{type:'button',text:t.clear,onclick:async()=>{try{await onApply({url:'',sourceUrl:''});close();}catch(err){showError(err.message || t.error);}}}),cancelButton(),save])
  );
  document.body.append(dialog);dialog.showModal();
  if(initialFile) importSource({selected:initialFile});
  else if(initialUrl) loadButton.click();
  else if(source || slot.value) {const value=source || slot.value;setBusy(true,t.loading);load(value.startsWith('assets/') || value.startsWith('favicon.')?'/'+value:value,{sourceAsset,provider},crop);}
  file.focus();
}
