const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function articleLifecycleActions(item) {
  const inactive=['archived','trashed'].includes(item.lifecycle);
  return [
    ...(!inactive&&item.basePublished?[{action:'unpublish',label:item.status==='scheduled'?'Cancel schedule':'Unpublish',icon:'eyeOff'}]:[]),
    ...(!inactive?[{action:'archive',label:'Archive',icon:'archive'}]:[{action:'restore',label:'Restore to Draft',icon:'restore'}]),
    ...(item.lifecycle!=='trashed'?[{action:'trash',label:'Move to Trash',icon:'trash'}]:[])
  ];
}

export function openArticleLifecycle({item,action,repository,opener,onChanged,onReload,onClose,icon}) {
  const copy={
    unpublish:{title:item.status==='scheduled'?'Cancel schedule':'Unpublish article',description:'นำทุกภาษาออกจากเว็บไซต์ รวมถึงบทความที่ตั้งเวลาไว้ เก็บเนื้อหาฉบับร่างไว้ให้แก้ไขและเผยแพร่ใหม่ได้',confirm:item.status==='scheduled'?'Cancel schedule':'Unpublish'},
    archive:{title:'Archive article',description:'นำทุกภาษาออกจากเว็บไซต์และรายการ Active พร้อมถอนหมุด Home และหน้ารวมบทความ เนื้อหายังเก็บไว้ กู้คืนเป็น Draft ได้',confirm:'Archive'},
    trash:{title:'Move article to Trash',description:'นำทุกภาษาออกจากเว็บไซต์ พร้อมถอนหมุดทั้งหมด บทความจะอยู่ใน Trash และกู้คืนได้ ยังไม่ลบข้อมูลหรือรูปภาพถาวร',confirm:'Move to Trash'},
    restore:{title:'Restore article to Draft',description:'นำกลับมาในรายการ Active โดยยังไม่เผยแพร่และไม่ปักหมุด กรุณาตรวจเนื้อหาและยืนยัน Publish จาก Editor เมื่อต้องการนำขึ้นเว็บไซต์',confirm:'Restore to Draft'}
  }[action];
  let busy=false,conflict=false;
  const dialog=document.createElement('dialog');
  dialog.className='article-dialog article-lifecycle-dialog';
  dialog.setAttribute('aria-labelledby','articleLifecycleTitle');
  dialog.setAttribute('aria-describedby','articleLifecycleDescription');
  dialog.innerHTML=`<header><h2 id="articleLifecycleTitle">${copy.title}</h2><button type="button" class="article-button" data-lifecycle="cancel" aria-label="ปิด" title="ปิด">${icon('close')}</button></header>
    <div class="article-dialog-body"><h3>${esc(item.title)}</h3><p id="articleLifecycleDescription">${copy.description}</p><p class="article-lifecycle-error" role="alert" hidden></p><p class="article-lifecycle-progress" role="status"></p></div>
    <footer class="article-lifecycle-footer"><button type="button" class="article-button" data-lifecycle="cancel">ยกเลิก</button><button type="button" class="article-button article-create" data-lifecycle="confirm">${copy.confirm}</button><button type="button" class="article-button" data-lifecycle="reload" hidden>โหลดรายการล่าสุด</button></footer>`;
  function destroy(){window.removeEventListener('beforeunload',beforeUnload);dialog.close();dialog.remove();onClose?.();if(opener?.isConnected)opener.focus({preventScroll:true});}
  function close(){if(!busy)destroy();}
  function beforeUnload(event){if(busy){event.preventDefault();event.returnValue='';}}
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('click',async event=>{
    const button=event.target.closest('[data-lifecycle]');if(!button||busy)return;
    if(button.dataset.lifecycle==='cancel'){close();return;}
    if(button.dataset.lifecycle==='reload'){destroy();await onReload();return;}
    if(conflict)return;
    busy=true;dialog.setAttribute('aria-busy','true');
    dialog.querySelectorAll('button').forEach(node=>node.disabled=true);
    dialog.querySelector('.article-lifecycle-error').hidden=true;
    dialog.querySelector('[role=status]').textContent='กำลังดำเนินการ…';
    try {
      await repository[action](item.id,item.revision);
      busy=false;destroy();await onChanged(action);
    } catch(error) {
      busy=false;dialog.setAttribute('aria-busy','false');
      conflict=[401,403,409].includes(error.status);
      dialog.querySelectorAll('button').forEach(node=>node.disabled=false);
      dialog.querySelector('[data-lifecycle=confirm]').disabled=conflict;
      dialog.querySelector('[data-lifecycle=reload]').hidden=!conflict;
      const message=dialog.querySelector('[role=alert]');message.hidden=false;message.textContent=error.message||'ทำรายการไม่สำเร็จ กรุณาลองอีกครั้ง';
      dialog.querySelector('[role=status]').textContent='';
      dialog.querySelector(`[data-lifecycle=${conflict?'reload':'confirm'}]`).focus();
    }
  });
  document.body.append(dialog);dialog.showModal();dialog.querySelector('footer [data-lifecycle=cancel]').focus();
  window.addEventListener('beforeunload',beforeUnload);
  return {canLeave:()=>!busy,destroy};
}
