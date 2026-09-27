// The article repository and its server-side authorization are a later stage.
// No fixture, localStorage seed, or query-string auth bypass belongs here.
export async function loadArticleCatalog() {
  return { available: false };
}

// Full article read is intentionally unavailable until the authorized API exists.
// Never open an existing article using only its list summary as the body.
export async function loadArticleForEditor() { return null; }
