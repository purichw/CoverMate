import Cropper from 'cropperjs';

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

export async function editImage({slot,source,lang = 'th',getToken,onApply}) {
  if (document.querySelector('.cm-media-dialog')) return;
  const t = text[lang] || text.en;
  for (const href of ['/admin/cropper.css','/admin/media-editor.css']) if (!document.querySelector(`link[href="${href}"]`)) document.head.append(element('link',{rel:'stylesheet',href}));
  const opener = document.activeElement;
  const dialog = element('dialog',{class:'cm-media-dialog','aria-labelledby':'cm-media-title'});
  let cropper, original, busy = false, generation = 0, objectUrl, mode = 'crop';
  const status = element('p',{class:'cm-media-status',role:'status','aria-live':'polite',text:t.empty});
  const error = element('p',{class:'cm-media-error',role:'alert'});
  const stage = element('div',{class:'cm-media-stage'});
  const image = element('img',{alt:'',crossorigin:'anonymous'});
  const fitPreview = element('canvas',{'aria-label':t.fit});
  stage.append(image,fitPreview);
  const save = element('button',{type:'button',class:'cm-media-primary',text:t.save});
  save.disabled = true;
  const close = () => { if (!busy) dialog.close(); };
  dialog.addEventListener('cancel',event=>{if (busy) event.preventDefault();});
  dialog.addEventListener('close',()=>{generation++;cropper?.destroy();if(objectUrl) URL.revokeObjectURL(objectUrl);dialog.remove();opener?.focus();},{once:true});
  const action = (name,symbol,fn) => element('button',{type:'button',title:name,'aria-label':name,text:symbol,onclick:fn});
  const toolbar = element('div',{class:'cm-media-toolbar',role:'group','aria-label':t.crop},[
    action(t.zoomOut,'−',()=>cropper?.zoom(-.1)),action(t.zoomIn,'+',()=>cropper?.zoom(.1)),
    action(t.left,'←',()=>cropper?.move(-10,0)),action(t.right,'→',()=>cropper?.move(10,0)),
    action(t.up,'↑',()=>cropper?.move(0,-10)),action(t.down,'↓',()=>cropper?.move(0,10)),
    action(t.reset,'↺',()=>cropper?.reset())
  ]);
  function showError(message) { error.textContent = lang === 'th' && message && !/[ก-๙]/.test(message) ? t.error : message; }
  function setBusy(value) {
    busy = value;
    dialog.querySelectorAll('button,input').forEach(node=>{node.disabled = value;});
    save.disabled = value || !original;
    status.textContent = value ? t.busy : (original ? `${t.ratio}: ${slot.width} × ${slot.height}` : t.empty);
  }
  function canvasForFit(sourceImage) {
    const canvas = document.createElement('canvas'); canvas.width=slot.width;canvas.height=slot.height;
    const scale = Math.min(canvas.width/sourceImage.width,canvas.height/sourceImage.height);
    const w = sourceImage.width*scale,h = sourceImage.height*scale;
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
  async function load(src) {
    const current = ++generation;
    cropper?.destroy();cropper=null;original=null;save.disabled=true;showError('');status.textContent=t.loading;
    try {
      const loaded = new Image();loaded.crossOrigin='anonymous';loaded.src=src;
      await loaded.decode();
      if (current !== generation) return;
      if (loaded.naturalWidth*loaded.naturalHeight > 20000000) throw Error(t.large);
      const canvas = document.createElement('canvas');
      const scale = Math.min(1,2048/loaded.naturalWidth,2048/loaded.naturalHeight);
      canvas.width=Math.max(1,Math.round(loaded.naturalWidth*scale));canvas.height=Math.max(1,Math.round(loaded.naturalHeight*scale));
      canvas.getContext('2d').drawImage(loaded,0,0,canvas.width,canvas.height);
      const data = canvas.toDataURL('image/png');
      original=canvas;image.src=data;
      await image.decode();
      if (current !== generation) return;
      cropper=new Cropper(image,{aspectRatio:slot.width/slot.height,viewMode:1,dragMode:'move',autoCropArea:1,background:true,checkCrossOrigin:false,rotatable:false,scalable:false,zoomOnWheel:false,ready(){
        save.disabled=false;status.textContent=`${t.ratio}: ${slot.width} × ${slot.height}`;updateMode();
      }});
    } catch (err) { if(current===generation) {original=null;save.disabled=true;status.textContent='';showError(err.message===t.large?t.large:t.failed);} }
  }
  const file = element('input',{type:'file',accept:'image/png,image/jpeg,image/webp,image/svg+xml','aria-label':t.file});
  file.addEventListener('change',()=>{
    const selected=file.files[0];
    if (!selected) return;
    if (selected.size>8*1024*1024 || !['image/png','image/jpeg','image/webp','image/svg+xml'].includes(selected.type)) {showError(t.invalid);return;}
    if(objectUrl) URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(selected);load(objectUrl);
  });
  const url = element('input',{type:'text',value:source || slot.value || '','aria-label':t.url});
  const loadButton = element('button',{type:'button',text:t.load,onclick:()=>{
    const value=url.value.trim();
    if (!/^(?:https:\/\/|\/?assets\/|\/?favicon\.(?:svg|ico)$)/i.test(value)) {showError(t.failed);return;}
    load(value.startsWith('assets/') || value.startsWith('favicon.') ? '/'+value:value);
  }});
  save.addEventListener('click',async()=>{
    if (busy || !original || !cropper) return;
    setBusy(true);showError('');
    try {
      const output = mode==='fit' ? canvasForFit(original) : cropper.getCroppedCanvas({width:slot.width,height:slot.height,imageSmoothingQuality:'high'});
      const imageData=output.toDataURL('image/png'),sourceData=original.toDataURL('image/png');
      if (imageData.length>2000000 || sourceData.length>2000000) throw Error(t.large);
      const token=await getToken();
      const {appendEnvironmentSearch} = await import('/covermate-environment.mjs');
      const response=await fetch(appendEnvironmentSearch('/api/media'),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({image:imageData,source:sourceData}),signal:AbortSignal.timeout(45000)});
      const result=await response.json();
      if(!response.ok) throw Error(result.message || t.error);
      if (!/^https:\/\//.test(result.url) || !/^https:\/\//.test(result.sourceUrl)) throw Error(t.error);
      await onApply(result);busy=false;dialog.close();
    } catch(err) {setBusy(false);showError(err.message || t.error);}
  });
  dialog.append(
    element('div',{class:'cm-media-head'},[element('div',{},[element('h2',{id:'cm-media-title',text:t.title}),element('p',{text:slot.label})]),action(t.cancel,'×',close)]),
    element('div',{class:'cm-media-body'},[
      element('div',{class:'cm-media-source'},[element('label',{},[document.createTextNode(t.file),file]),element('small',{text:t.hint}),element('label',{},[document.createTextNode(t.url),url]),loadButton]),
      modes,stage,toolbar,status,error
    ]),
    element('div',{class:'cm-media-actions'},[element('button',{type:'button',text:t.clear,onclick:async()=>{try{await onApply({url:'',sourceUrl:''});close();}catch(err){showError(err.message || t.error);}}}),element('button',{type:'button',text:t.cancel,onclick:close}),save])
  );
  document.body.append(dialog);dialog.showModal();
  if(source || slot.value) loadButton.click();
  file.focus();
}
