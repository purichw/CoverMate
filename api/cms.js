const {authorize} = require('./media.js');
const {json,readBody,reportFailure} = require('../server/http.cjs');
module.exports = async function cms(req,res) {
  try {
    if (req.method !== 'POST') { res.setHeader('Allow','POST'); return json(res,405,{error:'method_not_allowed'}); }
    const actor = await authorize(req);
    const body = await readBody(req,800000);
    const {mutateCms} = await import('../server/cms.mjs');
    return json(res,200,await mutateCms(actor,body));
  } catch (err) {
    const status = Number(err.status) || 503;
    if (status >= 500) reportFailure('cms',err);
    return json(res,status,{error:err.code || 'cms_unavailable',message:status >= 500 ? 'ยืนยันผลการบันทึกไม่ได้ งานของคุณยังอยู่ กรุณาลองบันทึกอีกครั้ง' : status === 403 ? 'บัญชีนี้ไม่มีสิทธิ์แก้ไขเว็บไซต์ในสภาพแวดล้อมนี้' : status === 401 ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง' : err.message,...(err.fields ? {fields:err.fields} : {})});
  }
};
