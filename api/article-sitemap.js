function createArticleSitemapHandler({readFeed}={}) {
let dependencies;
return async function sitemap(req,res) {
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('Content-Type','application/xml; charset=utf-8');
  try {
    dependencies ||= Promise.all([import('../server/articles.mjs'),import('../covermate-environment.mjs'),import('../covermate-seo.mjs')]);
    const [articles,environment,seo]=await dependencies;
    const host=req.headers.host,search=new URL(req.url,'https://covermateinsurance.com').search;
    const env=environment.resolveCoverMateEnvironment({host,search,vercelEnv:process.env.VERCEL_ENV});
    if(env.isUat){res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');res.end('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');return;}
    const feed=await (readFeed ? readFeed(env.siteId) : articles.createArticleRepository().feed(env.siteId));
    const paths=['/','/motor','/health','/life','/?lang=en','/motor?lang=en','/health?lang=en','/life?lang=en'];
    if(feed.settings.enabled) {
      for(const lang of seo.articleIndexLanguages(feed))paths.push('/articles'+(lang==='en'?'?lang=en':''));
      for(const item of feed.items)for(const lang of Object.keys(item.translations))paths.push('/articles/'+item.slug+(lang==='en'?'?lang=en':''));
    }
    const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
    res.end('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(path=>'<url><loc>'+escape('https://covermateinsurance.com'+path)+'</loc></url>').join('')+'</urlset>');
  }catch{res.statusCode=503;res.setHeader('Retry-After','60');res.end('<?xml version="1.0"?><error>Temporarily unavailable</error>');}
};
}
module.exports=createArticleSitemapHandler();
module.exports.createArticleSitemapHandler=createArticleSitemapHandler;
