# FinTrack — คู่มือ Deploy

## สิ่งที่ต้องทำ 2 อย่าง
1. สร้าง Firebase project (database ฟรี)
2. สร้าง GitHub repo แล้ว push ขึ้นไป

---

## ขั้นตอนที่ 1 — สร้าง Firebase Project

1. ไปที่ https://console.firebase.google.com
2. กด **"Add project"** → ตั้งชื่อ เช่น `fintrack`
3. ปิด Google Analytics → กด **Continue**
4. รอสักครู่ → กด **Continue**

### เปิด Firestore Database
5. เมนูซ้าย → **Firestore Database** → **Create database**
6. เลือก **Start in test mode** → กด **Next**
7. เลือก region ใดก็ได้ → กด **Enable**

### เอา Config มา
8. เมนูซ้าย → กดไอคอน **⚙️ Project settings**
9. เลื่อนลงมาหาส่วน **"Your apps"** → กด **</>** (Web)
10. ตั้งชื่อ App → กด **Register app**
11. จะเห็น code แบบนี้:
```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "fintrack-xxx.firebaseapp.com",
  projectId: "fintrack-xxx",
  storageBucket: "fintrack-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```
12. **คัดลอก config นี้** แล้วเอาไปแทนที่ใน `src/firebase.js`

---

## ขั้นตอนที่ 2 — Push ขึ้น GitHub

### ติดตั้ง Git (ถ้ายังไม่มี)
- Windows: https://git-scm.com/download/win
- Mac: `brew install git`

### สร้าง GitHub Repo
1. ไปที่ https://github.com → กด **New repository**
2. ตั้งชื่อ repo ว่า `fintrack` (ต้องตรงกับ vite.config.js)
3. เลือก **Public** → กด **Create repository**

### Push โค้ด
เปิด Terminal แล้วรัน:
```bash
cd fintrack-deploy          # เข้าโฟลเดอร์โปรเจกต์
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/ชื่อuser/fintrack.git
git push -u origin main
```

### เปิด GitHub Pages
1. ใน repo → ไปที่ **Settings** → **Pages** (เมนูซ้าย)
2. Source: เลือก **GitHub Actions**
3. รอ 1-2 นาที → เว็บจะขึ้นที่ `https://ชื่อuser.github.io/fintrack/`

---

## เสร็จแล้ว! 🎉

เว็บจะอยู่ที่:
```
https://ชื่อuser.github.io/fintrack/
```

สมัครสมาชิกได้เลย — ข้อมูลเก็บใน Firebase แยกตาม user อัตโนมัติ

---

## หมายเหตุ
- Firebase ฟรี tier รองรับ 50,000 reads และ 20,000 writes ต่อวัน — เกินพอสำหรับ 2 คน
- ข้อมูลไม่หายแน่นอน เพราะเก็บใน Firebase Cloud
- Admin mode: พิมพ์ `110126.06051999.12082006` ในช่อง input ใดก็ได้แล้วกด Enter
