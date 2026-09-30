import {closeHistory} from '@tiptap/pm/history';

const labels={paragraph:'ย่อหน้า',heading:'หัวข้อ',bulletList:'รายการ',orderedList:'รายการลำดับ',blockquote:'คำพูด',callout:'กล่องข้อความ',figure:'รูปภาพ',horizontalRule:'เส้นคั่น',table:'ตาราง',video:'วิดีโอ',takeaway:'สรุปประเด็นสำคัญ',quoteCard:'Quote card'};
export function articleBlocks(editor){
  const result=[];editor.state.doc.forEach((node,pos,index)=>result.push({node,pos,index,label:`${index+1}. ${labels[node.type.name] || node.type.name}${node.attrs.title || node.textContent?' · '+(node.attrs.title || node.textContent).slice(0,50):''}`}));return result;
}
export function selectedArticleBlock(editor){
  return articleBlocks(editor)[Math.min(editor.state.selection.$from.index(0),editor.state.doc.childCount-1)];
}
function commit(editor,mutate){
  let position=0;
  return editor.chain().focus().command(({tr})=>{closeHistory(tr);position=mutate(tr);tr.setDocAttribute('layout','blocks');return true;}).command(({commands})=>commands.setNodeSelection(position)).run();
}
export function insertArticleBlock(editor,json,{flag,placement='body'}={}){
  const current=selectedArticleBlock(editor),node=editor.schema.nodeFromJSON({...json,attrs:{...json.attrs,placement}});
  return commit(editor,tr=>{
    const empty=current?.node.type.name==='paragraph'&&!current.node.content.size;
    const pos=!current?0:empty?current.pos:current.pos+current.node.nodeSize;
    if(empty)tr.replaceWith(pos,pos+current.node.nodeSize,node);else tr.insert(pos,node);
    if(flag)tr.setDocAttribute(flag,true);return pos;
  });
}
export function changeArticleBlock(editor,action,value){
  const current=selectedArticleBlock(editor),all=articleBlocks(editor);
  if(!current)return false;
  if(action==='select'){const target=all[Number(value)];return target&&editor.chain().focus().setNodeSelection(target.pos).run();}
  if(action==='placement')return commit(editor,tr=>{tr.setNodeMarkup(current.pos,undefined,{...current.node.attrs,placement:value});return current.pos;});
  if(action==='replace')return commit(editor,tr=>{tr.replaceWith(current.pos,current.pos+current.node.nodeSize,editor.schema.nodeFromJSON(value));return current.pos;});
  if(action==='duplicate')return commit(editor,tr=>{const pos=current.pos+current.node.nodeSize;tr.insert(pos,current.node);return pos;});
  if(action==='delete')return commit(editor,tr=>{
    if(all.length===1){tr.replaceWith(0,current.node.nodeSize,editor.schema.nodes.paragraph.create());return 0;}
    tr.delete(current.pos,current.pos+current.node.nodeSize);return all[current.index+1]?current.pos:all[current.index-1].pos;
  });
  const offset=action==='up'?-1:action==='down'?1:0,target=all[current.index+offset];
  if(!offset||!target)return false;
  return commit(editor,tr=>{tr.delete(current.pos,current.pos+current.node.nodeSize);const pos=offset<0?target.pos:target.pos+target.node.nodeSize-current.node.nodeSize;tr.insert(pos,current.node);return pos;});
}
export function takeawayContent(value){return [{type:'bulletList',content:value.split('\n').map(text=>text.trim()).filter(Boolean).map(text=>({type:'listItem',content:[{type:'paragraph',content:[{type:'text',text}]}]}))}];}
export function quoteContent(value){return value.split('\n').map(text=>({type:'paragraph',...(text.trim()?{content:[{type:'text',text:text.trim()}]}:{})}));}
export function blockPlainText(node){return node.type.name==='takeaway' ? [...node.content.content].flatMap(child=>child.type.name==='bulletList'||child.type.name==='orderedList'?child.content.content.map(item=>item.textContent):[child.textContent]).join('\n') : node.content.content.map(child=>child.textContent).join('\n');}
