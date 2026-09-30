const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function openPinOrder({items,settings,repository,load,onSaved,onRefresh,opener,icon}) {
  let rows=[],baseline=[],revision=settings.revision,busy=false,conflict=false,message='',pendingPosition=false;
  const dialog=document.createElement('dialog');
  dialog.className='article-dialog article-pin-dialog';
  dialog.setAttribute('aria-labelledby','articlePinTitle');
  const dirty=()=>pendingPosition||rows.some((row,index)=>row.id!==baseline[index]);
  const canLeave=()=>!busy&&(!dirty()||window.confirm('ยังไม่ได้บันทึกลำดับ ออกโดยไม่บันทึก?'));
  function reset(items,settings) {
    const rank=new Map((settings.pinnedOrder||[]).map((id,index)=>[id,index]));
    rows=items.filter(item=>item.pinned||item.publishedPinned).sort((a,b)=>(rank.get(a.id)??Infinity)-(rank.get(b.id)??Infinity)||b.publishedAt-a.publishedAt||a.id.localeCompare(b.id));
    baseline=rows.map(row=>row.id);revision=settings.revision;pendingPosition=false;
  }
  function render(focus) {
    dialog.innerHTML=`<header><h2 id="articlePinTitle">ลำดับบทความปักหมุด</h2><button type="button" class="article-button" data-pin="close" aria-label="ปิดลำดับปักหมุด" title="ปิด">${icon('close')}</button></header>
      <div class="article-dialog-body"><p id="articlePinHelp">ลำดับนี้ใช้กับ carousel ในหน้ารวมบทความ บทความร่างและบทความที่ยังไม่ถึงวันเผยแพร่จะยังไม่แสดงบนเว็บไซต์</p>
      ${rows.length?`<ol class="article-pin-list" aria-describedby="articlePinHelp">${rows.map((row,index)=>`<li data-pin-id="${esc(row.id)}">
        <label class="article-pin-position"><span class="article-sr">ลำดับ: ${esc(row.title)}</span><input type="number" min="1" max="${rows.length}" step="1" value="${index+1}" data-pin="position" inputmode="numeric"></label>
        <div class="article-pin-copy"><strong>${esc(row.title)}</strong><small>${row.status==='scheduled'?'รอวันเผยแพร่':row.publishedPinned?(row.pinned?'ปักหมุดในฉบับเผยแพร่':'ฉบับเผยแพร่ยังปักหมุด · ร่างเปลี่ยนเป็นไม่ปักหมุด'):'ปักหมุดในฉบับร่าง'}</small></div>
        <div class="article-pin-move"><button type="button" class="article-button" data-pin="up" aria-label="เลื่อนขึ้น: ${esc(row.title)}" title="เลื่อนขึ้น" ${index===0?'disabled':''}>${icon('up')}</button><button type="button" class="article-button" data-pin="down" aria-label="เลื่อนลง: ${esc(row.title)}" title="เลื่อนลง" ${index===rows.length-1?'disabled':''}>${icon('down')}</button></div></li>`).join('')}</ol>`:'<p class="article-pin-empty">ยังไม่มีบทความปักหมุด</p>'}</div>
      <footer class="article-pin-footer"><p role="status" aria-live="polite" data-pin-status ${conflict?'data-error="true"':''}>${esc(message||`${rows.length} บทความ${dirty()?' · ยังไม่ได้บันทึก':''}`)}</p><div>${conflict?'<button type="button" class="article-button" data-pin="reload">โหลดรายการล่าสุด</button>':''}<button type="button" class="article-button" data-pin="close">ปิด</button><button type="button" class="article-button article-create" data-pin="save" ${!dirty()||conflict?'disabled':''}>บันทึกลำดับ</button></div></footer>`;
    if(busy)dialog.querySelectorAll('button,input').forEach(el=>el.disabled=true);
    if(focus)dialog.querySelector(`[data-pin-id="${CSS.escape(focus.id)}"] [data-pin="${focus.action}"]:not(:disabled)`)?.focus({preventScroll:true});
  }
  function destroy(){window.removeEventListener('beforeunload',beforeUnload);dialog.close();dialog.remove();if(opener?.isConnected)opener.focus({preventScroll:true});}
  function close(){if(canLeave())destroy();}
  function beforeUnload(event){if(busy||dirty()){event.preventDefault();event.returnValue='';}}
  function move(id,target,action) {
    pendingPosition=false;
    const from=rows.findIndex(row=>row.id===id);
    if(Number.isSafeInteger(target)&&target>=0&&target<rows.length)rows.splice(target,0,rows.splice(from,1)[0]);
    message='';
    // Preserve the footer DOM: blurring a position input must not swallow Save's click.
    const list=dialog.querySelector('.article-pin-list');
    rows.forEach((row,index)=>{
      const item=list.querySelector(`[data-pin-id="${CSS.escape(row.id)}"]`);
      list.append(item);item.querySelector('input').value=index+1;
      item.querySelector('[data-pin=up]').disabled=index===0;
      item.querySelector('[data-pin=down]').disabled=index===rows.length-1;
    });
    dialog.querySelector('[data-pin=save]').disabled=!dirty()||conflict;
    if(!conflict)dialog.querySelector('[data-pin-status]').textContent=`${rows.length} บทความ${dirty()?' · ยังไม่ได้บันทึก':''}`;
    if(action){const item=list.querySelector(`[data-pin-id="${CSS.escape(id)}"]`);(item.querySelector(`[data-pin="${action}"]:not(:disabled)`)||item.querySelector('input')).focus({preventScroll:true});}
  }
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('input',event=>{if(!busy&&event.target.dataset.pin==='position'){pendingPosition=true;dialog.querySelector('[data-pin=save]').disabled=conflict||!event.target.validity.valid;}});
  dialog.addEventListener('change',event=>{if(!busy&&event.target.dataset.pin==='position')move(event.target.closest('[data-pin-id]').dataset.pinId,Number(event.target.value)-1,document.activeElement===event.target?'position':null);});
  dialog.addEventListener('click',async event=>{
    const button=event.target.closest('button[data-pin]');if(!button||busy)return;
    const action=button.dataset.pin,id=button.closest('[data-pin-id]')?.dataset.pinId;
    if(action==='close'){close();return;}
    if(action==='up'||action==='down'){move(id,rows.findIndex(row=>row.id===id)+(action==='up'?-1:1),action);return;}
    if(action==='reload'&&!window.confirm('โหลดลำดับล่าสุดแทนลำดับที่ยังไม่ได้บันทึก?'))return;
    if(action==='save'&&(!dirty()||conflict))return;
    busy=true;message=action==='save'?'กำลังบันทึกลำดับ...':'กำลังโหลดรายการ...';render();
    try {
      if(action==='save') {
        const saved=await repository.reorderPins(rows.map(row=>row.id),revision);
        baseline=rows.map(row=>row.id);revision=saved.revision;onSaved(saved);message='บันทึกลำดับแล้ว';
      } else if(action==='reload') {
        const latest=await load();reset(latest.items,latest.settings);onRefresh(latest);conflict=false;message='โหลดรายการล่าสุดแล้ว';
      }
    } catch(error){message=error.message||'บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง';conflict=error.status===409||conflict;}
    finally {busy=false;render();dialog.querySelector(`[data-pin="${conflict?'reload':'close'}"]`)?.focus({preventScroll:true});}
  });
  reset(items,settings);render();document.body.append(dialog);dialog.showModal();window.addEventListener('beforeunload',beforeUnload);
  return {canLeave:()=>!dialog.isConnected||canLeave(),destroy};
}
