# SEO reporting

Created October 2, 2026 in CoverMate GA4 property `547278377`.

## Saved report

[Open SEO — หน้าเข้าและการติดต่อ](https://analytics.google.com/analytics/web/#/a402413350p547278377/reports/explorer?params=_u..nav%3Dmaui%26_r.explorerCard..columnFilters%3D%7B%22event%22:%22line_click%22,%22conversionEvent%22:%22quote_submit_success%22%7D&collectionId=search-console&r=15944571093&discardConfirmed=true)

This saved copy of the Google organic search traffic report groups results by
landing page. It retains search clicks, impressions, CTR and average position,
plus GA4 engagement. The link selects `line_click` under Event count and
`quote_submit_success` under Key events. Reloading the link preserves both
selections. Opening the report without those URL parameters defaults the two
selectors to all events; select them again before interpreting contact totals.
The standard Google report remains unchanged. Access still requires an
authorized Google account; the link does not grant access.

## Google-only contact report

[Open SEO — การติดต่อจาก Google](https://analytics.google.com/analytics/web/#/a402413350p547278377/reports/explorer?params=_u..nav%3Dmaui%26_r.explorerCard..columnFilters%3D%7B%22event%22:%22line_click%22,%22conversionEvent%22:%22quote_submit_success%22,%22sessionConversionRate%22:%22quote_submit_success%22%7D&collectionId=business-objectives&discardConfirmed=true&r=15945871144)

This separate saved Landing page report has a persistent **Session source /
medium matches regex `^google / organic$`** filter. It includes sessions,
engagement, Event count, Key events and Session key event rate. The link selects
LINE clicks, successful form submissions and the session rate for successful
form submissions, respectively. Reloading the link was verified to preserve
the filter and all three event selections. No Google organic sessions were
available for the selected period at setup; the report does not fabricate data.

## How to use it

1. Choose the same completed date range in GA4 and Search Console.
2. Use Search Console's Queries report for actual search terms and its Pages
   report for landing-page search performance.
3. Use the saved report to compare page-level visibility with recorded LINE
   clicks and successful contact submissions. Inspect mobile versus desktop
   where the report permits compatible dimensions.
4. Prioritize pages with impressions but weak CTR, useful pages with declining
   engagement, or landing pages with contact interest. Change titles/content to
   better answer that intent rather than adding repetitive keyword text.

Search Console and GA4 have different populations and processing times. GA4
requires the visitor's analytics consent and can be blocked. The associated
GA4 columns must not be described as an exact join between a search query and
a particular lead, or assumed to contain only Google organic visitors. For
Google-only contact attribution, use the second saved report above. Its session
key event rate is the share of Google organic sessions with a successful form
submission; it is not a sales conversion rate. Do not divide totals from the
two reports into a claimed SEO conversion rate.

LINE clicks are actions, not unique customers, conversations or sales. A
successful form event is an acknowledged submission, not a policy purchase.
Do not submit fake leads to populate reports. Zero rows immediately after the
Search Console link or a recent publication do not establish zero demand.

At setup the Search Console columns had no processed data for the selected
28-day window. Existing GA4 history was present. This is setup evidence, not a
ranking or customer-acquisition result. No recurring automation was created.

References: [Google organic search traffic report](https://support.google.com/analytics/answer/13682863),
[Search Console integration](https://support.google.com/analytics/answer/10737381).
