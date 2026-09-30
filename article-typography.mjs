// Whitelisted numeric presentation only. Arbitrary CSS never enters a document.
export const ARTICLE_TYPE_LIMITS={fontSize:[8,120],fontSizeMobile:[8,120],lineHeight:[1,3],spaceBefore:[0,160],spaceAfter:[0,160],padding:[0,120]};
const variable=key=>'--article-'+key.replace(/[A-Z]/g,letter=>'-'+letter.toLowerCase());
export function normalizeArticleTypography(input,{inline=false}={}){
  const attrs={};
  for(const [key,[min,max]] of Object.entries(ARTICLE_TYPE_LIMITS)){
    if(inline&&!['fontSize','fontSizeMobile'].includes(key))continue;
    const value=input?.[key];
    if(typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max)attrs[key]=Math.round(value*100)/100;
  }
  return attrs;
}
const styleFor=attrs=>Object.entries(attrs).map(([key,value])=>`${variable(key)}:${value}${key==='lineHeight'?'':'px'}`).join(';');
export function articleTypographyStyle(input,options){return styleFor(normalizeArticleTypography(input,options));}
export function articleTypographyAttributes(input,options){
  const attrs=normalizeArticleTypography(input,options),style=styleFor(attrs);
  return style?{'data-article-style':Object.keys(attrs).join(' '),style}:{};
}
export function parseArticleTypography(element,key){
  const value=element.style.getPropertyValue(variable(key)).trim();
  if(!value)return null;
  const number=Number(value.replace(/px$/,''));
  return normalizeArticleTypography({[key]:number})[key]??null;
}
