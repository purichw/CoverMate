let handler;
module.exports = async function page(req, res) {
  handler ||= Promise.all([import('../server/seo-page.mjs'),import('../server/articles.mjs')]).then(([module,articles])=>{
    let repository;
    const repo=()=>repository ||= articles.createArticleRepository();
    return module.createPageHandler({readArticle:(site,slug)=>repo().detail(site,slug),readArticles:site=>repo().feed(site)});
  });
  return (await handler)(req, res);
};
