// Optional, localized public author information. Blank/hidden values must never
// become an invented biography, qualification or human-review claim.
export const ARTICLE_AUTHOR_LIMITS={authorBio:1200,authorUrl:2000,editorialNote:1200};
const text=value=>typeof value==='string'?value:'';
export function articleAuthorUrl(value) {
  try {
    const url=new URL(text(value).trim());
    return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';
  } catch {return '';}
}
export function normalizeArticleAuthorDetails(value={}) {
  return {...Object.fromEntries(Object.keys(ARTICLE_AUTHOR_LIMITS).map(key=>[key,text(value[key])])),authorDetailsEnabled:value.authorDetailsEnabled!==false};
}
export function projectArticleAuthorDetails(value={},lang='th') {
  const details=normalizeArticleAuthorDetails(value),visible=details.authorDetailsEnabled;
  const authorBio=visible?details.authorBio.trim():'',authorUrl=visible?articleAuthorUrl(details.authorUrl):'',editorialNote=visible?details.editorialNote.trim():'';
  return {authorBio,authorUrl,editorialNote,authorDetailsEnabled:visible,
    hasAuthorDetails:!!text(value.author).trim()&&!!(authorBio||authorUrl),
    authorSectionLabel:lang==='en'?'About the author':'เกี่ยวกับผู้เขียน',
    authorProfileLabel:lang==='en'?'View author profile':'ดูข้อมูลผู้เขียน',
    editorialNoteLabel:lang==='en'?'How this article was prepared':'การจัดทำบทความนี้'};
}
