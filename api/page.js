let handler;
module.exports = async function page(req, res) {
  handler ||= import('../server/seo-page.mjs').then(module => module.createPageHandler());
  return (await handler)(req, res);
};
