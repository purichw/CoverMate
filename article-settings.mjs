export const DEFAULT_ARTICLE_SETTINGS = Object.freeze({enabled:false,showHome:true,showNavigation:true,revision:0});

export function articleSettings(value) {
  return {...DEFAULT_ARTICLE_SETTINGS,
    enabled:value?.enabled === true,
    showHome:value?.showHome !== false,
    showNavigation:value?.showNavigation !== false,
    revision:Number.isSafeInteger(value?.revision) ? value.revision : 0};
}
