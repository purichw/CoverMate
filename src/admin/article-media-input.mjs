import {articleUrl} from '../../article-document.mjs';

export function articleImageSize(media={}) {
  const known=['width','height'].every(key=>Number.isSafeInteger(media[key])&&media[key]>0);
  const width=known?media.width:1600,height=known?media.height:900;
  const scale=Math.min(1,2048/width,2048/height);
  return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}

// The clipboard/drop boundary never inserts remote or data images directly.
// Keep pasted prose, then let the shared image dialog own source import/crop.
export function articleImageTransfer(transfer, doc) {
  if(!transfer)return null;
  const files=[...(transfer.files || [])].filter(file=>file.type.startsWith('image/'));
  if(files.length)return {initialFile:files[0],count:files.length};
  const html=transfer.getData('text/html');
  if(html) {
    const template=doc.createElement('template');template.innerHTML=html;
    const images=[...template.content.querySelectorAll('img')];
    const image=images.find(node=>articleUrl(node.getAttribute('src'),true));
    if(image)return {initialUrl:articleUrl(image.getAttribute('src'),true),alt:image.alt || '',caption:image.closest('figure')?.querySelector('figcaption')?.textContent || '',count:images.length};
    if(images.some(image=>/^(data:|blob:)/i.test(image.getAttribute('src') || '')))return {unsupported:true};
  }
  const value=transfer.getData('text/plain').trim();
  const url=articleUrl(value,true);
  return url&&/\.(png|jpe?g|webp|svg)(?:[?#]|$)/i.test(url)?{initialUrl:url,count:1}:null;
}

export function stripArticleClipboardImages(html,doc) {
  const template=doc.createElement('template');template.innerHTML=html;
  template.content.querySelectorAll('img').forEach(image=>image.remove());
  template.content.querySelectorAll('figure').forEach(figure=>figure.replaceWith(...figure.childNodes));
  return template.innerHTML;
}
