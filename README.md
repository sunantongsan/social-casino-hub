# รุ่นทดสอบภายใน 0.2.0

อ่าน `docs/INTERNAL-TEST.md` สำหรับระบบออนไลน์และ Android รุ่นปัจจุบัน ด้านล่างเป็นคู่มือโครงต้นแบบเดิม

# Social Casino Hub — starter 0.1

ต้นแบบ full-stack ภาษาไทย: Vite + React + Tailwind, Node.js + Socket.IO,
Supabase Auth + PostgreSQL, Capacitor Android. ใช้ชิปจำลองเท่านั้น ไม่มีซื้อขายชิป
ถอนเงิน แลกเงินจริง หรือของรางวัลที่มีมูลค่าจริง

## ขอบเขตที่ทำแล้ว
- ไฮโล: ต่ำ 4–10 / สูง 11–17 / ตอง; ตองทำให้สูงและต่ำแพ้
- เซิร์ฟเวอร์สุ่มด้วย node:crypto; เดิมพัน 1–1,000 ชิป หนึ่งรายการต่อคนต่อรอบ
- รอบรับเดิมพัน 20 วินาที แสดงผล 7 วินาที; ผลและชิปตัดสินบนเซิร์ฟเวอร์
- สูง/ต่ำกำไร 1:1; ตองกำไร 30:1; เงินคืนรวมทุนคือ 2x / 31x
- บอตแสดงป้ายชัดเจน เติมที่ว่างเป้าหมาย 4 คน (สูงสุด 3 บอต) หน่วง 1.5–6.5 วินาที
- ของขวัญหักผู้ส่งเต็มจำนวน ผู้รับกดแปลงได้ floor(50%); ไม่จ่ายซ้ำ
- idempotency keys, transaction rollback, concurrent debit protection
- Supabase email/password login สำหรับบัญชีที่ผู้ดูแลสร้างไว้; ชิปเริ่มต้น 1,000 ครั้งเดียว
- Rewarded Ads interface และ mock เฉพาะ local; โฆษณาจริงยังไม่เชื่อม
- ไพ่ผสมสิบ / รัมมี่ / ป๊อกเด้ง / เก้าเก / Roulette เป็นรายการ “เร็ว ๆ นี้” ยังเล่นไม่ได้

## โครงสร้าง
| Path | หน้าที่ |
|---|---|
| apps/client/src | React UI, connection, ads adapter |
| apps/server/src/index.mjs | Auth, socket commands, room clock |
| apps/server/src/store.mjs | Memory demo / PostgreSQL atomic snapshot |
| apps/server/src/bot.mjs | IDLE → THINKING → WAIT_RESULT |
| packages/game-core | Rules, wallet, gifts, rewards |
| tests | Dice enumeration, accounting, concurrency, replay tests |
| infra/schema.sql | Private database state and least-privilege grants |
| infra/Dockerfile | Separate persistent game-server process |
| .github/workflows | CI, Vercel deploy, signed Android bundle |
| docs | Deployment, Android, ads integration |

## เริ่มบนเครื่อง (Node 22.12+)
```sh
npm ci
cp .env.example .env
cp apps/client/.env.example apps/client/.env
npm test
npm run dev:server
```
เปิด terminal อีกหน้าต่าง:
```sh
npm run dev:client
```
เปิด http://localhost:5173 กดเข้าเล่นแบบทดลอง ชิป 1,000
ทดสอบ 2 คนผ่านคนละ browser profile / incognito (หลายแท็บ profile เดียวคือคนเดียว)
โหมด memory ทำยอดหายเมื่อ restart; ห้ามใช้ DEV_AUTH บนเซิร์ฟเวอร์สาธารณะ

## โปรไฟล์ฐานข้อมูลจริง
ใช้ Supabase Auth users เป็น identity; wallet/gift/ledger อยู่ใน private DB state.
สร้างผู้ทดสอบที่ยืนยันอีเมลแล้วใน Supabase Auth และรัน `infra/schema.sql`.
ตั้ง dedicated DB backend role ตามท้าย SQL. เปิด TLS พร้อมตรวจ certificate.
ตั้ง DATABASE_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY ฝั่ง server และ DEV_AUTH=false.
ตั้ง VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SERVER_URL และ VITE_DEV_AUTH=false ฝั่ง client.
Auth token เก็บในหน่วยความจำ; ชุดนี้ยังไม่มีสมัครสมาชิก/ลืมรหัส/refresh token UI.
เซิร์ฟเวอร์ตัด socket หลัง 15 นาที ให้เข้าสู่ระบบใหม่; ทุกคำสั่งเปลี่ยนยอดตรวจ Auth อีกครั้ง.

## ข้อจำกัดต้นแบบที่ต้องทราบ
- หนึ่งห้อง หนึ่ง server replica เท่านั้น; ไม่ใช่ระบบหลายห้อง production scale
- DB เก็บ snapshot ทั้งห้องและ ledger ใน JSONB พร้อม row lock: atomic และ restart recovery
  แต่โตตามประวัติ ต้องแยก wallets/ledger/rounds/bets/gifts เป็น relational tables ก่อนผู้ใช้จำนวนมาก
- ไม่เปิด DB state ผ่าน Data API; public schema ไม่เก็บยอด และ client ไม่มี DB password
- Bot state ใน process; deploy แบบหยุด instance เก่าก่อนเริ่ม instance ใหม่
- ยังไม่มีบัญชีโปรไฟล์แก้ชื่อ, account deletion, abuse/IP limiting, observability หรือ UI privacy policy
- ยังไม่ทดสอบจริงบน Supabase/Android/อุปกรณ์ low RAM; ดู VALIDATION.md สำหรับสิ่งที่ทดสอบแล้ว
- ไม่รับรองการอนุมัติ Google Play; ชุดนี้คือฐานโค้ดสำหรับพัฒนาต่อก่อนส่ง Closed Testing

ดู `docs/DEPLOYMENT.md`, `docs/ANDROID.md`, `docs/ADS.md` ตามลำดับ
