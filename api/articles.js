const {authorize} = require('./media.js');
const {json,readBody,error,reportFailure} = require('../server/http.cjs');
let repository;
const repo = () => repository ||= import('../server/articles.mjs').then(m=>m.createArticleRepository());

module.exports = async function articles(req,res) {
  try {
    if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return json(res,405,{error:'method_not_allowed'});}
    const url=new URL(req.url,'https://covermateinsurance.com'),action=url.searchParams.get('action')||'catalog';
    const actor=await authorize(req),store=await repo(),site=actor.env.siteId;
    if(req.method==='GET') {
      if(action==='catalog')return json(res,200,await store.catalog(site));
      if(action==='read')return json(res,200,await store.get(site,url.searchParams.get('id')));
      throw error(404,'not_found','ไม่พบรายการ');
    }
    const body=await readBody(req,750000);
    if(!body||typeof body!=='object')throw error(422,'invalid_body','ข้อมูลไม่ถูกต้อง');
    if(action==='settings')return json(res,200,await store.changeSettings(site,body.settings,body.expectedRevision,actor.uid));
    if(!['save','publish','unpublish'].includes(action))throw error(404,'not_found','ไม่พบรายการ');
    return json(res,200,await store.mutate(site,action,action==='save'?body.article:body,body.expectedRevision,actor.uid));
  } catch(err) {
    const status=Number(err.status)||503;
    if(status>=500)reportFailure('articles',err);
    const message=status===401?'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง':status===403?'บัญชีนี้ไม่มีสิทธิ์จัดการบทความในสภาพแวดล้อมนี้':status>=500?'เชื่อมต่อคลังบทความไม่ได้ เนื้อหายังอยู่ กรุณาลองโหลดข้อมูลใหม่':err.message;
    return json(res,status,{error:err.code||'articles_unavailable',message});
  }
};
