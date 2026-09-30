const { BRAND, FONT, escape, tableStyle, safeLogo } = require('./email-shared.cjs');
const ASSETS = 'https://covermateinsurance.com/assets/brand/';
const COLORS = Object.freeze({ background: '#f8f5ee', surface: '#ffffff', panel: '#faf6ef', icon: '#f3e9dc', ink: '#432b1c', muted: BRAND.muted, divider: '#e7dacb', green: '#367626', badge: '#e7efdd', action: BRAND.action });
const image = (name, width, height = width) => `<img src="${ASSETS}email-${name}.png" alt="" width="${width}" height="${height}" style="display:block;width:${width}px;height:${height}px;border:0;">`;

function icon(name, size = 60, glyph = 32) {
  return `<table role="presentation" align="center" width="${size}" cellpadding="0" cellspacing="0" style="${tableStyle}width:${size}px;"><tr><td align="center" valign="middle" width="${size}" height="${size}" bgcolor="${COLORS.icon}" style="width:${size}px;height:${size}px;background-color:${COLORS.icon};border-radius:50%;">${image(name, glyph)}</td></tr></table>`;
}

function detailColumns(rows) {
  // Fluid/hybrid: wraps without a media query. MSO gets the same content in
  // separate rows, avoiding Word's fixed two-column layout on a narrow pane.
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${COLORS.panel}" style="${tableStyle}width:100%;background-color:${COLORS.panel};border-radius:18px;"><tr><td align="center" style="font-size:0;text-align:center;">
<!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><![endif]-->
${rows.map(([label, value, emphasis], index) => `<!--[if mso]><tr><td><![endif]--><div class="receipt-detail" style="display:inline-block;width:100%;max-width:${rows.length === 1 ? '624' : '312'}px;vertical-align:middle;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${tableStyle}width:100%;"><tr><td class="receipt-detail-inner${index ? ' receipt-detail-divider' : ''}" style="padding:30px 18px;${index ? `border-left:1px solid ${COLORS.divider};` : ''}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${tableStyle}width:100%;table-layout:fixed;"><tr><td width="60" valign="middle" style="width:60px;">${icon(index ? 'clock' : 'file')}</td><td align="center" valign="middle" style="padding-left:12px;text-align:center;"><p style="margin:0 0 6px;color:${COLORS.muted};font-size:14px;line-height:22px;">${escape(label)}</p><p style="margin:0;color:${COLORS.ink};font-size:17px;line-height:27px;font-weight:${emphasis ? '700' : '500'};word-break:break-word;overflow-wrap:anywhere;">${escape(value)}</p></td></tr></table></td></tr></table></div><!--[if mso]></td></tr><![endif]-->`).join('')}
<!--[if mso]></table><![endif]-->
</td></tr></table>`;
}

function action(content) {
  const line = Boolean(content.actionIconUrl);
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="${tableStyle}margin:0 auto;"><tr><td align="center" bgcolor="${COLORS.action}" style="background-color:${COLORS.action};background-image:linear-gradient(110deg,#a14c21,${COLORS.action});border-radius:14px;">
<a class="receipt-cta" href="${escape(content.actionUrl)}" style="display:inline-block;padding:14px 24px;color:#ffffff;font-family:${FONT};font-size:21px;font-weight:700;line-height:44px;text-decoration:none;text-align:center;mso-padding-alt:0;">
<!--[if mso]><i style="mso-font-width:100%;mso-text-raise:18pt;" hidden>&emsp;</i><![endif]-->${line ? `<img src="${escape(safeLogo(content.actionIconUrl))}" alt="" width="44" height="44" style="display:inline-block;width:44px;height:44px;border:0;vertical-align:middle;"><span aria-hidden="true" style="display:inline-block;vertical-align:middle;height:38px;margin:0 18px;border-left:1px solid #d8a080;"></span>` : ''}<span style="display:inline-block;vertical-align:middle;">${escape(content.actionLabel)}</span><span aria-hidden="true" style="display:inline-block;vertical-align:middle;padding-left:14px;">${image('chevron', 10, 18)}</span><!--[if mso]><i style="mso-font-width:100%;mso-text-raise:18pt;" hidden>&emsp;</i><![endif]-->
</a></td></tr></table>`;
}

function renderCustomerEmailFrame(content) {
  const en = content.language === 'en';
  const logo = safeLogo(content.logoUrl);
  const brandNote = en ? 'Care today.<br>Confidence tomorrow.' : 'ดูแลวันนี้<br>เพื่ออนาคตที่ดีกว่า';
  return `<!doctype html>
<html lang="${en ? 'en' : 'th'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(content.subject)}</title>
<style>
@media screen and (max-width:700px) {
  .receipt-detail{max-width:100% !important;}
  .receipt-detail-inner{padding:18px !important;}
  .receipt-detail-divider{border-left:0 !important;border-top:1px solid ${COLORS.divider} !important;}
}
@media screen and (max-width:480px) {
  .receipt-outer{padding:16px 10px !important;}
  .receipt-body{padding:0 18px !important;}
  .receipt-header{padding:26px 0 20px !important;background-size:84px auto !important;}
  .receipt-title{font-size:27px !important;line-height:38px !important;}
  .receipt-intro{font-size:16px !important;line-height:27px !important;}
  .receipt-brand-note{font-size:10px !important;line-height:17px !important;padding-right:8px !important;}
  .receipt-cta{padding:12px 18px !important;font-size:20px !important;}
  .receipt-note{padding:16px 12px !important;}
  .receipt-footer{padding:24px 26px 90px !important;background-image:url('${ASSETS}email-footer-garden-mobile.png') !important;background-size:100% auto !important;}
  .receipt-footer-note{display:none !important;}
}
</style></head>
<body style="margin:0;padding:0;width:100%;background-color:${COLORS.background};color:${COLORS.ink};font-family:${FONT};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escape(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${COLORS.background}" style="${tableStyle}width:100%;"><tr><td class="receipt-outer" align="center" style="padding:28px 16px;">
<!--[if mso]><table role="presentation" width="680" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${COLORS.surface}" style="${tableStyle}width:100%;max-width:680px;background-color:${COLORS.surface};border-radius:24px;box-shadow:0 8px 28px #ede6da;">
<tr><td class="receipt-header" align="center" style="padding:32px 0 24px;background-image:url('${ASSETS}email-header-leaves.png');background-repeat:no-repeat;background-position:left center;background-size:108px auto;border-radius:24px 24px 0 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${tableStyle}width:100%;table-layout:fixed;"><tr><td width="22%" style="width:22%;">&nbsp;</td><td align="center" width="56%" style="width:56%;">${logo ? `<img src="${escape(logo)}" alt="CoverMate" width="228" style="display:block;margin:0 auto;width:100%;max-width:228px;height:auto;border:0;color:${COLORS.ink};font-family:${FONT};font-size:20px;">` : ''}</td><td class="receipt-brand-note" align="center" width="22%" valign="bottom" style="width:22%;padding-right:16px;color:#9b7255;font-size:12px;line-height:20px;font-family:'Sriracha',Georgia,serif;font-style:italic;">${brandNote}<br><span aria-hidden="true" style="color:#b88d6d;">──── ♡</span></td></tr></table>
</td></tr>
<tr><td class="receipt-body" align="center" style="padding:0 28px;">
<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="${tableStyle}margin:0 auto 16px;"><tr><td align="center" bgcolor="${COLORS.badge}" style="padding:9px 16px;background-color:${COLORS.badge};border-radius:999px;"><table role="presentation" cellpadding="0" cellspacing="0" style="${tableStyle}"><tr><td valign="middle">${image('check', 22)}</td><td valign="middle" style="padding-left:10px;color:${COLORS.green};font-size:16px;font-weight:700;line-height:25px;">${escape(content.eyebrow)}</td></tr></table></td></tr></table>
<h1 class="receipt-title" style="margin:0 0 10px;font-size:32px;line-height:44px;font-weight:700;color:${COLORS.ink};text-align:center;">${escape(content.heading)}</h1>
<p class="receipt-intro" style="margin:0 0 24px;font-size:17px;line-height:29px;color:${COLORS.muted};text-align:center;">${escape(content.intro)}</p>
${detailColumns(content.detailRows)}
${content.actionIntro ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${tableStyle}width:100%;margin-top:24px;"><tr><td width="18%" valign="middle"><div style="border-top:1px solid ${COLORS.divider};"></div></td><td align="center" style="padding:0 12px;"><h2 style="margin:0;color:${COLORS.ink};font-size:22px;line-height:32px;">${escape(content.actionIntro)}</h2></td><td width="18%" valign="middle"><div style="border-top:1px solid ${COLORS.divider};"></div></td></tr></table><p style="max-width:460px;margin:12px auto 18px;color:${COLORS.muted};font-size:16px;line-height:27px;text-align:center;">${escape(content.actionDescription)}</p>` : '<div style="height:24px;line-height:24px;">&nbsp;</div>'}
${action(content)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${COLORS.panel}" style="${tableStyle}width:100%;margin-top:22px;background-color:${COLORS.panel};border-radius:16px;"><tr><td class="receipt-note" style="padding:16px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${tableStyle}width:100%;table-layout:fixed;"><tr><td width="42" valign="middle" style="width:42px;">${icon('shield', 42, 24)}</td><td align="left" style="padding-left:14px;text-align:left;font-size:14px;line-height:24px;color:${COLORS.muted};">${escape(content.note)}</td></tr></table></td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${tableStyle}width:100%;margin-top:24px;border-top:1px solid ${COLORS.divider};border-bottom:1px solid ${COLORS.divider};"><tr><td align="center" style="padding:20px 12px;"><table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" style="${tableStyle}width:100%;max-width:380px;table-layout:fixed;"><tr><td width="42" style="width:42px;">${icon('link', 42, 24)}</td><td align="left" style="padding-left:14px;text-align:left;"><p style="margin:0 0 4px;color:${COLORS.muted};font-size:13px;line-height:22px;">${escape(content.fallbackLabel)}</p><a href="${escape(content.actionUrl)}" style="color:${COLORS.action};font-size:15px;line-height:24px;font-weight:600;word-break:break-all;overflow-wrap:anywhere;text-decoration:underline;">${escape(content.actionUrl)}</a></td></tr></table></td></tr></table>
</td></tr>
<tr><td class="receipt-footer" align="center" style="padding:24px 28px 66px;background-image:url('${ASSETS}email-footer-garden.png');background-repeat:no-repeat;background-position:center bottom;background-size:100% auto;border-radius:0 0 24px 24px;color:${COLORS.muted};text-align:center;"><p style="max-width:500px;margin:0 auto;font-size:12px;line-height:21px;">${escape(content.footerLabel)}</p><p class="receipt-footer-note" style="margin:12px 0 0;text-align:right;color:#9b7255;font-size:12px;line-height:19px;font-family:'Sriracha',Georgia,serif;font-style:italic;">${en ? 'Confidence starts<br>today.' : 'ชีวิตที่มั่นใจ<br>เริ่มได้วันนี้'}</p></td></tr>
</table><!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
}

module.exports = { renderCustomerEmailFrame };
