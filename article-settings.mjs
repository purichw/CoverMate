export const DEFAULT_ARTICLE_SETTINGS = Object.freeze({enabled:false,showHome:true,showNavigation:true,revision:0});

export function articleSettings(value) {
  return {...DEFAULT_ARTICLE_SETTINGS,
    enabled:value?.enabled === true,
    showHome:value?.showHome !== false,
    showNavigation:value?.showNavigation !== false,
    pinnedOrder:Array.isArray(value?.pinnedOrder) ? [...new Set(value.pinnedOrder.filter(id=>typeof id==='string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id)))] : [],
    revision:Number.isSafeInteger(value?.revision) ? value.revision : 0};
}
