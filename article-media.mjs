// Delivery variants share the saved crop; the private original stays untouched.
import {LOCAL_ARTICLE_IMAGES} from './article-image-assets.mjs';
export const ARTICLE_IMAGE_PROFILES = Object.freeze([
  {label:'Mobile thumbnail',width:320},
  {label:'Desktop thumbnail',width:640},
  {label:'Mobile banner',width:800},
  {label:'Desktop banner',width:1600}
]);

export function articleImageDelivery(media = {}, role = 'thumbnail') {
  const src=typeof media==='string'?media:media?.src || '';
  const fallback={src,srcset:''};
  const local=src.startsWith('/')&&!src.startsWith('//')?LOCAL_ARTICLE_IMAGES[src.split(/[?#]/)[0]]:null;
  if(local){
    const variants=local.variants,target=role==='banner'?1600:640;
    return {src:(variants.find(image=>image.width>=target)||variants.at(-1)).src,srcset:variants.map(image=>image.src+' '+image.width+'w').join(', '),maxWidth:variants.at(-1).width};
  }
  let url;
  try {url=new URL(src);} catch {return fallback;}
  // Only unsigned, versioned assets from our upload pipeline can be rewritten.
  const path=/^(\/[^/]+\/image\/upload\/)(v\d+\/covermate\/cms-media\/.+)$/.exec(url.pathname);
  if(url.origin!=='https://res.cloudinary.com'||url.username||url.password||url.search||url.hash||!path)return fallback;
  const max=Number.isSafeInteger(media?.width)&&media.width>0?Math.min(media.width,1600):1600;
  const widths=[...new Set([320,640,800,1280,1600].map(width=>Math.min(width,max)))];
  const variant=width=>url.origin+path[1]+'c_limit,w_'+width+',f_auto,q_auto/'+path[2];
  return {src:variant(Math.min(role==='banner'?1600:640,max)),srcset:widths.map(width=>variant(width)+' '+width+'w').join(', '),maxWidth:max};
}
