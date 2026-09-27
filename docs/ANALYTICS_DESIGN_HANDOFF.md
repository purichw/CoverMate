# CoverMate Analytics — ข้อมูลสำหรับออกแบบ UI

อัปเดต: 28 กันยายน 2026 · ขอบเขต: โค้ดใน working tree ของงานออกแบบ Analytics รอบนี้

เอกสารนี้แยก **สิ่งที่ระบบอ่านได้จริง**, **สิ่งที่ UI คำนวณจากข้อมูลนั้นได้**, และ **สิ่งที่ยังไม่มีข้อมูลรองรับ** เพื่อส่งต่อให้ ChatGPT ออกแบบได้โดยไม่สร้างตัวเลขหรือปุ่มที่ไม่มีการทำงาน การปรับ UI รอบนี้เป็นงาน local; เอกสารนี้ไม่ได้ยืนยันว่า deploy แล้ว หรือ GA4 บน production ตั้งค่าครบแล้ว

## 1. มี Analytics สองส่วน แหล่งข้อมูลต่างกัน

| ส่วน | Route | แหล่งข้อมูล | ขอบเขต |
| --- | --- | --- | --- |
| สถิติเคสใน Admin Portal — หน้าที่ใช้ mockup รอบนี้ | `/admin#analytics` | `GET /api/ops/leads?limit=200` | สรุปเคสล่าสุดที่ระบบคืนให้ สูงสุด 200 รายการ; ไม่ใช่ยอดรวมตลอดอายุระบบ |
| รายงานผู้เข้าชมและฟอร์มเว็บไซต์ | `/admin/analytics` | `GET /api/analytics?days=30` สำหรับ GA4 และ `loadContactLeads(250)` สำหรับ Firestore | เป็นอีกหน้าหนึ่ง; สถิติ GA4 ใช้ได้เมื่อตั้งค่า server สำเร็จ ส่วนเคสอ่านสูงสุด 250 รายการ |

สองหน้าห้ามนำยอดมาเทียบกันโดยไม่ระบุช่วงเวลาและฐานข้อมูล โดยเฉพาะคำว่า “Conversion” ซึ่งมีความหมายต่างกันมากระหว่างการส่งฟอร์มกับการออกกรมธรรม์

## 2. ก่อนการปรับรอบนี้

หน้า Portal เคยแสดงจำนวนเคสทั้งหมด, ติดต่อแล้ว, ให้คำปรึกษา, เสนอราคา, ออกกรมธรรม์ และกราฟขั้นตอนจาก helper ของสถานะ lead เดิม ตัวกรองที่ไม่ได้เปลี่ยนข้อมูลถูกเอาออกไปในรอบ cleanup ก่อนหน้าแล้ว

ตัวนับเดิมไม่ถูกต้องสำหรับข้อมูล Cases ปัจจุบัน: ตัวอย่างเช่น `contacted` เดิมนับทุกสถานะที่ไม่ใช่ `new` และตัวนับกรมธรรม์ตรวจเฉพาะ `converted` ขณะที่ Cases ปัจจุบันใช้ `closed_completed` ซึ่งหมายถึง “ปิดเคส — ดำเนินการแล้ว” ไม่ได้ยืนยันว่าออกกรมธรรม์จริง จึงไม่ควรเก็บชื่อ KPI และ Funnel เดิมเพียงเพื่อให้เหมือน mockup

## 3. โครง UI ที่นำมาใช้ในรอบนี้

ใช้องค์ประกอบภาพจาก mockup: พื้นครีม, Sidebar เข้ม, สีส้มสำหรับ active/action, การ์ด KPI, กราฟแนวโน้ม, สัดส่วนบริการ, ตารางจัดอันดับ และกล่องสรุปข้อสังเกต บนมือถือจัดการ์ดและกราฟให้เลื่อน/อ่านได้ในพื้นที่แคบ โดยใช้ shell และ navigation ที่มีอยู่จริง ไม่คืนเมนู Settings ที่ผู้ใช้ให้เอาออก

| องค์ประกอบ | ข้อมูลและพฤติกรรม |
| --- | --- |
| หัวข้อ Analytics | ระบุว่าสรุป “เคสลูกค้าใน CoverMate”; ไม่อ้างว่าเป็นรายงานยอดขายหรือกรมธรรม์ |
| ช่วงเวลา | 7 / 30 / 90 วัน / ทั้งหมดที่โหลด; ใช้วันที่รับเคส `createdAt` ตามวันใน `Asia/Bangkok` |
| มุมมอง | ภาพรวม / สถานะ / บริการ / แหล่งที่มา — เปลี่ยนชุดเนื้อหาจริง ไม่ใช่แท็บตกแต่ง |
| KPI 6 ใบ | เคสทั้งหมดในช่วงที่เลือก, เคสใหม่, กำลังดำเนินการ, ติดต่อได้แล้ว, ดำเนินการแล้ว, สัดส่วนดำเนินการแล้ว |
| สถานะเคส | แสดงการกระจายของสถานะปัจจุบัน 6 สถานะ ไม่ใช้รูป Funnel ที่สื่อว่าทุกเคสผ่านทุกขั้นมาแล้ว |
| แนวโน้ม | 7/30 วันแสดงรายวัน, 90 วันจัดกลุ่มทุก 7 วัน, ทั้งหมดแสดงรายเดือนสูงสุด 120 เดือนล่าสุด พร้อมบอกจำนวนเคสที่เก่ากว่าช่วงกราฟ |
| ประเภทบริการ | จำนวนและสัดส่วนตาม `interestKey`; แสดงเป็น donut/legend และอันดับบริการ |
| แหล่งที่มา | 3 กลุ่ม: แบบฟอร์มเว็บไซต์ / เพิ่มโดยผู้ดูแล / อื่น ๆ หรือไม่ระบุ; ไม่อนุมาน Google หรือ Facebook จากการเป็นฟอร์มเว็บไซต์ |
| ข้อสังเกต | บริการที่พบมากที่สุด, เคสที่ยังติดต่อไม่ได้, เคสเปิดที่เลยเวลานัดติดตาม; การเทียบจำนวนเคสเข้าช่วงก่อนหน้าอยู่ที่การ์ดเคสทั้งหมดและซ่อนเมื่อชนเพดาน 200 รายการ |
| รายงาน GA4 | ลิงก์ “ดูสถิติผู้เข้าชมเว็บไซต์” ไป `/admin/analytics` พร้อมรักษา `cm_env=uat` เมื่ออยู่ UAT; ไม่แสดงตัวเลข GA4 ปลอมใน Portal |
| สถานะข้อมูล | มี loading / error พร้อม retry / ไม่มีข้อมูล / ไม่มีเคสในช่วงที่เลือก / คำเตือนเมื่อชนเพดานข้อมูล |

### ความหมายของ KPI

| KPI | วิธีคำนวณ | ข้อจำกัดที่ต้องสื่อให้ถูก |
| --- | --- | --- |
| เคสทั้งหมด | จำนวนรายการที่เข้าเงื่อนไขช่วงวันที่รับเคส | จำกัดอยู่ในชุดล่าสุดที่โหลด ไม่ใช่ customer unique count |
| เคสใหม่ | สถานะปัจจุบัน `new` | ไม่ได้หมายถึงจำนวนเคสที่เกิดวันนี้ |
| กำลังดำเนินการ | สถานะปัจจุบัน `in_progress` | ไม่ได้แปลว่าให้คำปรึกษาหรือเสนอราคาแล้ว |
| ติดต่อได้แล้ว | สถานะปัจจุบัน `contacted_reachable` | ไม่ใช่จำนวนสะสมของคนที่เคยติดต่อได้ทั้งหมด |
| ดำเนินการแล้ว | สถานะปัจจุบัน `closed_completed` | ไม่เท่ากับจำนวนกรมธรรม์ ไม่เท่ากับยอดขาย |
| สัดส่วนดำเนินการแล้ว | `closed_completed / เคสทั้งหมดในช่วง × 100` | เป็นสัดส่วนสถานะของเคสที่รับเข้ามาในช่วง ไม่ใช่อัตรา conversion ระหว่างขั้นหรือผลงานที่ปิดในเดือนนั้น |

กรณีไม่มีเคส model คืนสัดส่วนเป็น 0 เพื่อให้คำนวณได้ปลอดภัย แต่ UI แสดง “—” สำหรับสัดส่วนดำเนินการแล้ว พร้อมข้อความไม่มีข้อมูลในแผงรายงาน ไม่อ้างประสิทธิภาพจากฐานศูนย์ การเทียบ intake ไม่มีเปอร์เซ็นต์เมื่อช่วงก่อนหน้าเป็นศูนย์

### สถานะปัจจุบัน 6 สถานะ

| Key | ความหมาย |
| --- | --- |
| `new` | เคสใหม่ |
| `in_progress` | กำลังดำเนินการ |
| `contacted_reachable` | ติดต่อได้แล้ว |
| `contacted_no_answer` | ยังติดต่อไม่ได้ |
| `closed_completed` | ปิดเคส — ดำเนินการแล้ว |
| `closed_declined` | ปิดเคส — ไม่ดำเนินการต่อ |

ข้อมูลเก่าใช้ mapping เดียวกับ Cases: `contacting/consultation/quotation/considering/later → in_progress`, `contacted → contacted_reachable`, `converted → closed_completed`, `notinterested/lost → closed_declined` การ map เป็นการจัดกลุ่มรายงาน ไม่ใช่การแก้หรือ migrate เอกสารที่เก็บไว้

ถ้ามีสถานะที่ไม่รู้จัก แสดงกลุ่ม “สถานะไม่ระบุ / ไม่รู้จัก” แยกและคงรายการไว้ในยอดรวม ไม่เดาว่าเป็นเคสใหม่หรือเคสที่ดำเนินการแล้ว

## 4. Fields ที่รายงานเคสอ่านได้จริง

`/api/ops/leads` คืน `rows`, `total`, `source`, `environment` โดย `total` เป็นจำนวนที่คืนในผลลัพธ์หลังกรอง ไม่ใช่ total count จากฐานข้อมูลทั้งหมด Query เรียง `createdAt` ล่าสุดก่อน และจำกัดสูงสุด 200; ไม่มี pagination cursor ใน endpoint นี้

| กลุ่มข้อมูล | Fields ในผลลัพธ์ | ใช้กับ Analytics |
| --- | --- | --- |
| ตัวอ้างอิง | `id`, `revision`, `displayId`, `canonicalCase` | อ้างอิงรายการ ไม่ควรนำชื่อ/ข้อมูลส่วนตัวไปเป็น label ในกราฟรวม |
| เวลา | `createdAt`, `updatedAt` | แนวโน้มจำนวนเคสเข้า; `updatedAt` ไม่ใช่เวลาที่เปลี่ยนสถานะทุกขั้น |
| สถานะ | `status` | การกระจายสถานะปัจจุบัน |
| ความสนใจ | `interestKey`, `interestLabel` | ประเภทประกัน/บริการที่สนใจ |
| ที่มา | `source`, `sourcePath` | ที่มาที่บันทึกไว้; canonical case คืน `Website` หรือ `Manual` |
| ข้อมูลติดต่อ | `name`, `phone`, `lineId`, `email`, `contact` | สำหรับงานเคส ไม่จำเป็นต้องแสดงในรายงาน aggregate |
| บริบทงาน | `message`, `preferredContact`, `followUpAt`, `nextAction`, `assigneeId`, `assigneeName` | มีใน compatibility projection แต่ความครบถ้วนต่างกันระหว่าง legacy และ canonical case; ไม่ใช้เป็น KPI งาน/ผู้ดูแลโดยอัตโนมัติ |
| ข้อมูลประกอบ | `consent`, `read`, `timeline`, `audit`, `ops` | ไม่ใช่ warehouse ประวัติสถานะที่ครบและเทียบกันได้ทุกเคส |

ประเภทบริการใน Cases รองรับ `motor`, `life`, `health`, `accident`, `savings`, `unsure`, `other` ถ้าไม่รู้ค่าควรจัดเป็นไม่ระบุ/อื่น ๆ โดยไม่ทิ้งเคสนั้นออกจากยอดรวม

ข้อจำกัดสำคัญของช่วงเวลา:

- ตัวกรองวันที่ทำงานกับ 200 รายการที่โหลดแล้ว การเลือก “90 วัน” ไม่ได้สั่งฐานข้อมูลให้นับทุกเคสใน 90 วัน
- ถ้าโหลดครบ 200 รายการ ให้แจ้งว่าอาจมีเคสเก่าที่ไม่อยู่ในรายงาน ไม่ฟันธงว่าเป็นข้อมูลทั้งหมด
- ช่วงก่อนหน้าอาจถูกตัดออกเพราะเพดานนี้ เมื่อโหลดครบ 200 รายการ UI ซ่อนข้อความเปรียบเทียบ intake ทั้งหมด ไม่แสดงการเติบโตจากข้อมูลที่อาจไม่ครบ การเลือก “ทั้งหมดที่โหลด” ไม่คำนวณช่วงเปรียบเทียบ
- 7/30/90 วันนับวันปฏิทิน Bangkok โดยรวมวันนี้ และไม่นับ timestamp ที่อยู่หลังเวลาปัจจุบันหรือวันที่ไม่ถูกต้อง ช่วงก่อนหน้าใช้จำนวนวันเท่ากันติดกับช่วงปัจจุบัน
- วันที่รับเคสหาย/ไม่ถูกต้อง และวันที่อยู่ในอนาคตยังรวมในยอดของ “ทั้งหมดที่โหลด” พร้อมคำเตือน แต่ไม่อยู่ในกราฟใด ๆ หรือยอดของช่วง 7/30/90 วัน
- กราฟ 90 วันแบ่งช่วงละ 7 วันจากวันเริ่มช่วงที่เลือก ไม่ใช่สัปดาห์จันทร์–อาทิตย์ ช่วงสุดท้ายอาจไม่ครบ 7 วัน
- กราฟทั้งหมดแสดงรายเดือนจนถึงเดือนปัจจุบัน สูงสุด 120 เดือน รายการก่อนช่วงนี้ยังอยู่ในยอดรวม แต่แสดงจำนวนที่ไม่ได้รวมในกราฟผ่าน `omittedOlderCount`
- Parser รองรับ ISO, epoch milliseconds และ Firestore timestamp; ISO ที่ไม่มี timezone ใช้ Bangkok และปฏิเสธวันที่ผิดปฏิทิน ไม่เลื่อนวันที่ให้อัตโนมัติ
- ข้อมูลเป็น snapshot จากการอ่าน API ไม่ใช่ stream แบบ realtime เพียงเพราะมีป้ายเชื่อมต่อแล้ว

## 5. รายงานผู้เข้าชม `/admin/analytics` ที่มีอยู่แยกต่างหาก

หน้าปัจจุบันขอ GA4 ที่ `days=30` แบบคงที่ และอ่าน Firestore ล่าสุดสูงสุด 250 รายการ ในหน้านี้มี:

- Sessions, active users, page views, engagement rate, จำนวนแสดงความสนใจติดต่อ
- เคสที่บันทึก, ยังไม่อ่าน, เคสในช่วง 30 วัน และกราฟจำนวนเคสรายวัน
- Funnel แสดงยอดรวม ดูหน้าเว็บ → สนใจติดต่อ → เริ่มฟอร์ม → บันทึกเคส
- การจัดกลุ่มเรื่องที่ปรึกษา (`qtype`) และประกันที่สนใจ (`coverage`)
- รายการเคสล่าสุดสูงสุด 8 รายการ: วันที่, ชื่อ, ช่องทางติดต่อ, เรื่องที่ปรึกษา, ประเภทประกัน
- ตาราง acquisition ตาม GA4 channel group, สัดส่วนอุปกรณ์, top pages
- “อัตราเปลี่ยนเป็นเคส” = เคส Firestore ในช่วง / GA4 sessions ในช่วง ไม่ใช่อัตราออกกรมธรรม์

**ข้อควรระวังของหน้านี้:** Firestore reader ยังอ่าน fields แบบฟอร์มเดิม (`name/contact/qtype/coverage/status/read/createdAt`) ไม่ได้ project จาก `caseRecord` เหมือน Portal จึงไม่ควรนำไปอ้างเป็นแหล่งรายงาน canonical Cases ที่ครบถ้วน ส่วน conversion/funnel ผสมแหล่งข้อมูล aggregate คนละระบบ และ tracking ต้อง opt-in จึงไม่ใช่ cohort ของคนกลุ่มเดียวกันที่ยืนยันว่าเดินครบทุกขั้น ตัวกรองวันใน helper นี้ยังใช้การคำนวณเดิม ไม่ควรอ้างว่าตรงกับปฏิทิน Bangkok ของ Portal โดยอัตโนมัติ

### GA4 API: metric names ที่คืนจริง

| JSON field ใน `metrics` | ความหมาย |
| --- | --- |
| `sessions` | Sessions |
| `activeUsers` | Active users |
| `screenPageViews` | Page views |
| `eventCount` | Event count รวม |
| `engagementRate` | Engagement rate จาก GA4 |
| `contactIntent` | `line_click + phone_click + email_click` เป็นจำนวน event ไม่ใช่จำนวนคน |
| `formStarts` | จำนวน `form_start` |
| `quoteSubmits` | จำนวน `quote_submit` |
| `leadSubmitSuccess` | จำนวน `quote_submit_success` |
| `submitErrors` | จำนวน `quote_submit_error` |

`conversions`, รายได้, ภาษา, campaign และ policy conversion ไม่ได้อยู่ใน response ของ API นี้ แม้ metadata helper เก่าบางแห่งจะมีชื่อ `conversions` หรือ `language` ก็ตาม ให้ยึด API จริง

### GA4 API: ชุดข้อมูลและเพดาน

| Field | Fields ในแต่ละแถว | Query limit ปัจจุบัน |
| --- | --- | --- |
| `timeline` | `date`, `label`, `sessions`, `activeUsers`, `pageViews`, `contactIntent`, `formStarts`, `leadSubmitSuccess` | รวมผลรายวันกับ event timeline; event timeline จำกัด 1,000 แถว |
| `events` | `eventName`, `count` | จำกัด 25 แถว และ whitelist 10 event names |
| `acquisition` | `channel`, `sessions`, `activeUsers`, `pageViews`, `eventCount` | 12 channel groups เรียง sessions มากก่อน |
| `devices` | `device`, `sessions`, `activeUsers` | 8 device categories เรียง sessions มากก่อน |
| `topPages` | `path`, `pageViews`, `activeUsers` | 10 page paths เรียง views มากก่อน |

Response ยังมี `measurementId`, `propertyId` เมื่อ live, `source: ga4_data_api`, `status`, `message`, `range`, `actor`, `environment`, `siteId` ค่า `days` รับ 1–90, default 30, ปัดเป็นจำนวนเต็มและ clamp ขอบเขต ปัจจุบันส่ง GA4 date range แบบ `NdaysAgo` ถึง `today` ซึ่งรวมปลายทั้งสองด้าน จึงอาจครอบคลุม N+1 วันปฏิทิน; อย่าออกแบบหรือทดสอบโดยสมมติว่าเท่ากับ “N วันรวมวันนี้” ของ Portal

Event ที่อ่านได้: `page_view`, `line_click`, `phone_click`, `email_click`, `language_change`, `calculator_interaction`, `form_start`, `quote_submit`, `quote_submit_success`, `quote_submit_error` ใน UI เดิมไม่ได้แสดงทุก raw metric/table ที่ API คืน จึงเป็นข้อมูลที่พร้อมนำไปออกแบบเพิ่มเติมเมื่อเชื่อมต่อ GA4 ได้จริง

### การเชื่อมต่อและสิทธิ์

- ทั้งสองหน้าต้องมี Firebase session ที่ตรวจสอบแล้วและ active Admin allowlist; localStorage อย่างเดียวไม่ใช่สิทธิ์เข้าถึง
- Operations read gate และ GA4 API รองรับ `owner`, `advisor`, `ops`, `readonly` พร้อม role aliases แต่ canonical Cases และข้อมูล canonical ใน Firestore มี owner-only gate แยกอยู่ การออกแบบห้ามทำให้ role อื่นดูเหมือนมีสิทธิ์อ่าน Cases ได้แล้ว
- GA4 service account ใช้บน server เท่านั้น ต้องมี numeric property ID, client email และ private key พร้อมสิทธิ์ที่ GA4 property
- Production ใช้ `COVERMATE_GA4_PROPERTY_ID`, `COVERMATE_GA4_CLIENT_EMAIL`, `COVERMATE_GA4_PRIVATE_KEY`; UAT ใช้ `COVERMATE_UAT_GA4_*` แยกกัน ไม่ fallback ไปใช้ production credentials
- `status: not_configured` คืน HTTP 200 พร้อม metric เป็น `null` และ array ว่าง; ต้องแสดง “รอตั้งค่า” ไม่ใช่เลขศูนย์ที่สื่อว่าธุรกิจไม่มีผู้เข้าชม
- HTTP 401/403 เป็นปัญหาสิทธิ์; OAuth/GA4 error เป็นสถานะโหลดไม่สำเร็จ ต้องแยกจาก empty data
- Visitor analytics ส่งหลังผู้ใช้ยินยอม, ไม่ส่งชื่อ เบอร์โทร LINE อีเมล หรือข้อความอิสระไป GA4 และปิด tracking บน Admin/editor/preview จึงห้าม join traffic aggregates เข้ากับตัวลูกค้ารายบุคคลจากการคาดเดา

## 6. สิ่งใน mockup ที่ยังไม่มีข้อมูลรองรับ

| สิ่งที่อยากแสดง | ทำไมยังสรุปจริงไม่ได้ | ต้องมีเพิ่มก่อน |
| --- | --- | --- |
| Funnel เคส → ติดต่อ → ปรึกษา → เสนอราคา → กรมธรรม์ | Canonical Cases เก็บสถานะ 6 แบบ ไม่มีขั้น consultation/quotation/issued และไม่มี stage history ที่รายงานนี้อ่านครบ | แบบข้อมูลขั้นธุรกิจ, transition timestamps และนิยาม cohort |
| จำนวนกรมธรรม์/อัตราออกกรมธรรม์ | `closed_completed` เป็นผลปิดเคส ไม่ใช่หลักฐานกรมธรรม์ | policy record ที่ยืนยันแล้ว + relation กับ case |
| รายได้, เบี้ยประกัน, ค่าคอมมิชชัน, ROI/ROAS | ไม่มี fields/aggregate สำหรับรายงานนี้ | financial records และค่าใช้จ่ายที่เชื่อถือได้ |
| การเติบโตเทียบเดือนก่อนทุก KPI | ไม่มีประวัติ snapshot ของแต่ละสถานะ; ชุดล่าสุดมีเพดาน | aggregate ครบช่วง/ประวัติการเปลี่ยนสถานะและนิยามช่วงเทียบ |
| Google Search / Facebook / LINE เป็นแหล่งของเคสแต่ละราย | Canonical source แยก website/manual; GA channel group เป็นข้อมูลผู้เข้าชมรวม | attribution ที่เก็บอย่างชัดเจนตามความยินยอมและผูกกับเคสได้จริง |
| ค่าเฉลี่ยอุตสาหกรรม 20–22% | ไม่มีแหล่ง benchmark หรือนิยามที่เปรียบเทียบได้ | แหล่งอ้างอิงและ methodology ที่ตรวจสอบแล้ว |
| ระยะเวลาตอบกลับ/ปิดเคส, SLA, ผลงานรายพนักงาน | Fields บางส่วนอยู่คนละ contract และประวัติไม่ครบในรายงานนี้ | เวลาเหตุการณ์และ assignee model ที่ครอบคลุมทุกเคส |
| Export รายงาน Analytics, ตั้งเวลาส่ง report, custom date range, drill-down ทุกจุด | ยังไม่ใช่ flow ของหน้า Analytics ที่ทำในรอบนี้ | ออกแบบ + implement endpoint/control และตรวจสิทธิ์จริง |
| Realtime active visitors | ใช้ GA4 `runReport` ปกติ ไม่ใช่ Realtime API | API/data contract ที่รองรับ realtime |

อย่าแสดงปุ่ม disabled หรือแท็บที่ไม่มีผลไว้เผื่ออนาคต ผู้ใช้ให้เอา stubs ออกจาก Admin Portal แล้ว สามารถเสนอเป็น phase ถัดไปในเอกสารได้ แต่ไม่ทำให้ดูเหมือนพร้อมใช้งานใน UI

## 7. ข้อกำหนดสำหรับส่งต่อ ChatGPT

> ออกแบบ CoverMate Analytics จากข้อมูลจริงตามเอกสารนี้ ใช้ mockup ที่ให้เป็น visual direction แต่แก้ชื่อ KPI และกราฟให้ตรงกับ contract ปัจจุบัน ใช้ภาษาไทยที่อ่านง่ายและคงคำมาตรฐาน เช่น Analytics, Sessions, Admin, GA4 มี desktop และ mobile ใช้ Sidebar/shell เดิมที่ไม่มี Settings พร้อม loading/empty/error/partial-data states ทุก filter ต้องมีพฤติกรรมจริง แสดงที่มา ช่วงวันที่ และเพดานข้อมูล อย่าใส่ตัวเลขตัวอย่างเป็นข้อมูล live อย่าเรียก closed_completed ว่าออกกรมธรรม์ อย่าใส่เปอร์เซ็นต์เติบโตหรือ benchmark ถ้าไม่มีข้อมูลรองรับ และแยกแนวคิดเพิ่มเติมที่ต้องพัฒนา backend ออกจากหน้าที่ทำได้ตอนนี้

## 8. Source of truth สำหรับผู้พัฒนา

- Portal integration: `admin/ops/app.js`
- Aggregate model, วันที่, การจัดกลุ่มและคำเตือน: `admin/analytics-model.mjs`
- UI, มุมมอง, KPI และกราฟ: `admin/analytics-view.js`, `admin/analytics.css`
- Lead API/projection/เพดาน 200: `server/legacy-ops-service.cjs`
- Canonical status/legacy mapping: `server/cases-contract.cjs`
- API authorization: `api/ops.js`, `server/ops-access.cjs`, `firestore.rules`
- รายงาน GA4 เดิม: `admin/analytics/index.html`, `admin/analytics-data.js`
- GA4 response contract: `api/analytics.js` — ให้ยึด query/response จริงเหนือ metadata ที่บอกความสามารถเกิน API
- Firestore lead reader เพดาน 250: `covermate-firebase.js`
- Visitor consent/events: `covermate-analytics.js`, `docs/ANALYTICS_EVENT_INVENTORY.md`

## 9. ขอบเขตการตรวจงาน local

ตรวจ source และทดสอบ local แล้ว:

- `npm run check:admin-analytics` ผ่าน: สถานะเก่า/ใหม่, ขอบเขตวันไทย, สัดส่วน, เพดานข้อมูล, นัดเก่าที่เสร็จแล้ว, privacy ของข้อมูล aggregate และ empty/error states
- Browser ใช้งาน tab, ช่วง 7/30/90 วัน/ทั้งหมด, refresh/retry, คีย์บอร์ด, การเลื่อน KPI และลิงก์ Cases/Back/GA4 ที่รักษา UAT; ตรวจ layout และ scoped axe ที่ 320/390/768/1024/1448 px
- Shared-shell check ผ่านทั้งห้าโมดูล รวม legacy Settings fallback และเมนูมือถือ; เก็บรายละเอียด CSS ของตัวเลือกวันที่ Analytics บนมือถือภายหลัง แล้วรันชุด Analytics อีกครั้งผ่าน
- Generated bundle parity, JavaScript syntax และ `git diff --check` ผ่าน

หลักฐานภาพและ source hashes: `uat-results/analytics-design/report.json`; ภาพเทียบ reference/development อยู่ที่ `comparison-desktop.png` และ `comparison-mobile.png` ในโฟลเดอร์เดียวกัน ภาพใช้ข้อมูลสังเคราะห์และ session fixture ใน local; ตัวเลขในภาพไม่ใช่ข้อมูลลูกค้าจริง

รอบนี้ไม่ส่งอีเมล ไม่เปลี่ยน production data ไม่เปลี่ยน backend/auth และไม่ยืนยัน production GA4 configuration จาก fixture ไม่รัน whole-site/emulator/release suite เพราะไม่มีการแก้ API หรือ deploy

เอกสารนี้เป็น capability/design handoff ไม่ใช่ผลทดสอบ production ผลทดสอบและภาพจริงให้ยึดรายงานของงาน implementation ที่แนบเมื่อเสร็จ; การ deploy และการเปิดบริการภายนอกเป็นคนละขั้นตอน
