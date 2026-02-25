import { useState, useEffect, useRef, useCallback } from "react";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db } from "./firebase.js";

const ADMIN_CODE = "110126.06051999.12082006";

function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatTHB(n) {
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
}

function getMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const FREQ_LABELS = {
  weekly: "รายสัปดาห์",
  biweekly: "ทุก 2 สัปดาห์",
  monthly: "รายเดือน",
  quarterly: "รายไตรมาส",
  yearly: "รายปี",
  custom: "กำหนดเอง"
};

function getNextDue(startDate, freq, customDays) {
  const now = new Date();
  let d = new Date(startDate);
  while (d <= now) {
    if (freq === "weekly") d.setDate(d.getDate() + 7);
    else if (freq === "biweekly") d.setDate(d.getDate() + 14);
    else if (freq === "monthly") d.setMonth(d.getMonth() + 1);
    else if (freq === "quarterly") d.setMonth(d.getMonth() + 3);
    else if (freq === "yearly") d.setFullYear(d.getFullYear() + 1);
    else if (freq === "custom") d.setDate(d.getDate() + (customDays || 30));
    else break;
  }
  return d;
}

function getMonthlyAmount(item) {
  switch (item.freq) {
    case "weekly": return item.amount * 4.33;
    case "biweekly": return item.amount * 2.17;
    case "monthly": return item.amount;
    case "quarterly": return item.amount / 3;
    case "yearly": return item.amount / 12;
    case "custom": return item.amount * (30 / (item.customDays || 30));
    default: return item.amount;
  }
}

// ─── Firebase helpers ─────────────────────────────────────────────────────────

async function loadUsers() {
  try {
    const snap = await getDoc(doc(db, "system", "users"));
    return snap.exists() ? snap.data() : {};
  } catch { return {}; }
}

async function saveUsers(users) {
  try { await setDoc(doc(db, "system", "users"), users); } catch (e) { console.error(e); }
}

async function loadUserData(username) {
  try {
    const snap = await getDoc(doc(db, "userData", username));
    return snap.exists() ? snap.data() : { transactions: [], recurring: [] };
  } catch { return { transactions: [], recurring: [] }; }
}

async function saveUserData(username, data) {
  try { await setDoc(doc(db, "userData", username), data); } catch (e) { console.error(e); }
}

async function loadAllUsers() {
  try {
    const [usersSnap, dataSnap] = await Promise.all([
      getDoc(doc(db, "system", "users")),
      getDocs(collection(db, "userData"))
    ]);
    const users = usersSnap.exists() ? usersSnap.data() : {};
    const dataMap = {};
    dataSnap.forEach(d => { dataMap[d.id] = d.data(); });
    return { users, dataMap };
  } catch { return { users: {}, dataMap: {} }; }
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #060810; --surface: #0e1120; --surface2: #161929; --surface3: #1e2235;
    --border: rgba(255,255,255,0.07); --border2: rgba(255,255,255,0.12);
    --text: #e8eaf0; --text2: #8b90a8; --text3: #5a5f75;
    --green: #00e5a0; --green2: #00b87c; --green-dim: rgba(0,229,160,0.12);
    --red: #ff5c7a; --red-dim: rgba(255,92,122,0.12);
    --blue: #4f7fff; --blue-dim: rgba(79,127,255,0.12);
    --gold: #ffc947; --gold-dim: rgba(255,201,71,0.12);
    --radius: 14px; --radius-sm: 8px;
  }
  body { background: var(--bg); color: var(--text); font-family: 'Space Grotesk', sans-serif; min-height: 100vh; }
  .mono { font-family: 'Space Mono', monospace; }
  input, select, textarea { font-family: 'Space Grotesk', sans-serif; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--surface3); border-radius: 4px; }

  .auth-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; position: relative; overflow: hidden; }
  .auth-bg { position: fixed; inset: 0; background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,229,160,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(79,127,255,0.06) 0%, transparent 50%), var(--bg); }
  .auth-card { position: relative; z-index: 1; width: 100%; max-width: 420px; background: var(--surface); border: 1px solid var(--border2); border-radius: 24px; padding: 40px; }
  .auth-logo { font-size: 28px; font-weight: 700; color: var(--green); letter-spacing: -0.5px; margin-bottom: 8px; }
  .auth-logo span { color: var(--text); }
  .auth-sub { color: var(--text2); font-size: 14px; margin-bottom: 32px; }
  .auth-tabs { display: flex; background: var(--surface2); border-radius: var(--radius-sm); padding: 4px; margin-bottom: 28px; }
  .auth-tab { flex: 1; padding: 8px; text-align: center; font-size: 14px; font-weight: 500; border-radius: 6px; cursor: pointer; color: var(--text2); transition: all 0.2s; border: none; background: none; }
  .auth-tab.active { background: var(--surface3); color: var(--text); }

  .field { margin-bottom: 16px; }
  .field label { display: block; font-size: 12px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
  .field input, .field select { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 14px; color: var(--text); font-size: 14px; outline: none; transition: border-color 0.2s; }
  .field input:focus, .field select:focus { border-color: var(--green2); }
  .field select option { background: var(--surface2); }

  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; border-radius: var(--radius-sm); font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
  .btn-primary { background: var(--green); color: #000; width: 100%; }
  .btn-primary:hover { background: var(--green2); transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .btn-ghost { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
  .btn-ghost:hover { border-color: var(--border2); background: var(--surface3); }
  .btn-danger { background: var(--red-dim); color: var(--red); border: 1px solid rgba(255,92,122,0.2); }
  .btn-danger:hover { background: rgba(255,92,122,0.2); }
  .btn-sm { padding: 6px 12px; font-size: 12px; border-radius: 6px; }

  .error { background: var(--red-dim); border: 1px solid rgba(255,92,122,0.3); color: var(--red); border-radius: var(--radius-sm); padding: 10px 14px; font-size: 13px; margin-bottom: 16px; }

  .app { min-height: 100vh; display: flex; flex-direction: column; }
  .topbar { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 24px; height: 60px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; }
  .topbar-logo { font-size: 20px; font-weight: 700; color: var(--green); }
  .topbar-logo span { color: var(--text); }
  .topbar-right { display: flex; align-items: center; gap: 12px; }
  .user-pill { background: var(--surface2); border: 1px solid var(--border); border-radius: 20px; padding: 6px 14px; font-size: 13px; color: var(--text2); display: flex; align-items: center; gap: 6px; }
  .user-pill .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green); }

  .nav { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 24px; display: flex; gap: 4px; overflow-x: auto; }
  .nav-tab { padding: 14px 18px; font-size: 13px; font-weight: 500; color: var(--text2); cursor: pointer; border: none; background: none; border-bottom: 2px solid transparent; white-space: nowrap; transition: all 0.2s; }
  .nav-tab:hover { color: var(--text); }
  .nav-tab.active { color: var(--green); border-bottom-color: var(--green); }
  .nav-tab.admin-tab { color: var(--gold); }
  .nav-tab.admin-tab.active { color: var(--gold); border-bottom-color: var(--gold); }

  .content { flex: 1; padding: 28px 24px; max-width: 1000px; margin: 0 auto; width: 100%; }

  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; }
  .card-sm { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 16px; }

  .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 28px; }
  .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 22px 24px; position: relative; overflow: hidden; }
  .stat-card::before { content: ''; position: absolute; top: 0; right: 0; width: 80px; height: 80px; border-radius: 50%; transform: translate(30px, -30px); opacity: 0.15; }
  .stat-card.green::before { background: var(--green); }
  .stat-card.red::before { background: var(--red); }
  .stat-card.blue::before { background: var(--blue); }
  .stat-card.gold::before { background: var(--gold); }
  .stat-label { font-size: 11px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; }
  .stat-value { font-family: 'Space Mono', monospace; font-size: 26px; font-weight: 700; line-height: 1; }
  .stat-value.green { color: var(--green); }
  .stat-value.red { color: var(--red); }
  .stat-value.blue { color: var(--blue); }
  .stat-value.gold { color: var(--gold); }
  .stat-sub { font-size: 11px; color: var(--text3); margin-top: 6px; }

  .section-title { font-size: 14px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }

  .tx-list { display: flex; flex-direction: column; gap: 8px; }
  .tx-item { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px 16px; display: flex; align-items: center; gap: 14px; transition: border-color 0.2s; }
  .tx-item:hover { border-color: var(--border2); }
  .tx-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
  .tx-icon.income { background: var(--green-dim); }
  .tx-icon.expense { background: var(--red-dim); }
  .tx-info { flex: 1; min-width: 0; }
  .tx-name { font-size: 14px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tx-meta { font-size: 12px; color: var(--text3); margin-top: 2px; }
  .tx-amount { font-family: 'Space Mono', monospace; font-size: 15px; font-weight: 700; white-space: nowrap; }
  .tx-amount.income { color: var(--green); }
  .tx-amount.expense { color: var(--red); }

  .rec-item { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px 16px; display: flex; align-items: center; gap: 14px; transition: border-color 0.2s; }
  .rec-item:hover { border-color: var(--border2); }
  .rec-badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .rec-badge.expense { background: var(--red-dim); color: var(--red); }
  .rec-badge.income { background: var(--green-dim); color: var(--green); }
  .next-due-badge { font-size: 11px; padding: 2px 8px; border-radius: 4px; background: var(--blue-dim); color: var(--blue); }
  .next-due-badge.soon { background: var(--gold-dim); color: var(--gold); }
  .next-due-badge.overdue { background: var(--red-dim); color: var(--red); }

  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
  .modal { background: var(--surface); border: 1px solid var(--border2); border-radius: 20px; padding: 28px; width: 100%; max-width: 460px; max-height: 90vh; overflow-y: auto; }
  .modal-title { font-size: 18px; font-weight: 700; margin-bottom: 24px; }
  .modal-actions { display: flex; gap: 10px; margin-top: 24px; }
  .modal-actions .btn { flex: 1; }

  .type-toggle { display: flex; background: var(--surface2); border-radius: var(--radius-sm); padding: 4px; margin-bottom: 20px; }
  .type-btn { flex: 1; padding: 9px; text-align: center; font-size: 13px; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.2s; border: none; background: none; color: var(--text2); }
  .type-btn.income.active { background: var(--green-dim); color: var(--green); }
  .type-btn.expense.active { background: var(--red-dim); color: var(--red); }

  .bar-container { display: flex; flex-direction: column; gap: 8px; }
  .bar-row { display: flex; align-items: center; gap: 10px; }
  .bar-label { font-size: 12px; color: var(--text2); width: 90px; text-align: right; }
  .bar-track { flex: 1; height: 6px; background: var(--surface3); border-radius: 3px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 3px; transition: width 0.6s cubic-bezier(0.4,0,0.2,1); }
  .bar-val { font-size: 12px; font-family: 'Space Mono', monospace; color: var(--text2); width: 80px; }

  .admin-header { background: linear-gradient(135deg, var(--gold-dim), rgba(255,201,71,0.05)); border: 1px solid rgba(255,201,71,0.2); border-radius: var(--radius); padding: 20px 24px; margin-bottom: 20px; display: flex; align-items: center; gap: 14px; }
  .admin-badge { background: var(--gold); color: #000; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px; }
  .admin-grid { display: grid; grid-template-columns: 260px 1fr; gap: 20px; }
  @media (max-width: 700px) { .admin-grid { grid-template-columns: 1fr; } }
  .user-list-item { padding: 12px 14px; border-radius: var(--radius-sm); cursor: pointer; transition: background 0.15s; border: 1px solid transparent; }
  .user-list-item:hover { background: var(--surface2); }
  .user-list-item.selected { background: var(--surface2); border-color: var(--gold); }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in { animation: fadeIn 0.3s ease both; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  .pulse { animation: pulse 2s ease infinite; }

  .empty { text-align: center; padding: 48px 20px; color: var(--text3); }
  .empty-icon { font-size: 40px; margin-bottom: 12px; }
  .empty-text { font-size: 14px; }

  .month-chip { font-size: 11px; padding: 4px 10px; border-radius: 20px; background: var(--surface2); color: var(--text2); border: 1px solid var(--border); cursor: pointer; white-space: nowrap; }
  .month-chip.active { background: var(--green-dim); color: var(--green); border-color: var(--green2); }
  .month-row { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 20px; }
  .month-row::-webkit-scrollbar { height: 0; }

  .realtime-dot { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--green); }
  .realtime-dot::before { content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--green); animation: pulse 1.5s ease infinite; }

  @media (max-width: 600px) {
    .content { padding: 16px; }
    .summary-grid { grid-template-columns: 1fr 1fr; }
    .stat-value { font-size: 20px; }
    .auth-card { padding: 28px 20px; }
    .topbar { padding: 0 16px; }
    .nav { padding: 0 12px; }
  }
`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${color} mono`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function AuthPage({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const checkAdmin = (val) => {
    if (val === ADMIN_CODE) onLogin("__admin__", true);
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const users = await loadUsers();
      if (tab === "login") {
        if (!form.username || !form.password) { setError("กรุณากรอกข้อมูลให้ครบ"); setLoading(false); return; }
        const u = users[form.username.toLowerCase()];
        if (!u || u.password !== hash(form.password)) { setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"); setLoading(false); return; }
        onLogin(form.username.toLowerCase());
      } else {
        if (!form.username || !form.password) { setError("กรุณากรอกข้อมูลให้ครบ"); setLoading(false); return; }
        if (form.password !== form.confirm) { setError("รหัสผ่านไม่ตรงกัน"); setLoading(false); return; }
        if (form.username.length < 3) { setError("ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"); setLoading(false); return; }
        if (form.password.length < 6) { setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"); setLoading(false); return; }
        const key = form.username.toLowerCase();
        if (users[key]) { setError("ชื่อผู้ใช้นี้มีอยู่แล้ว"); setLoading(false); return; }
        users[key] = { password: hash(form.password), createdAt: new Date().toISOString() };
        await saveUsers(users);
        await saveUserData(key, { transactions: [], recurring: [] });
        onLogin(key);
      }
    } catch (e) {
      setError("เกิดข้อผิดพลาด: " + e.message);
    }
    setLoading(false);
  };

  const handleChange = (k, v) => { setForm(f => ({ ...f, [k]: v })); checkAdmin(v); };

  return (
    <div className="auth-wrap">
      <div className="auth-bg" />
      <div className="auth-card fade-in">
        <div className="auth-logo">Fin<span>Track</span></div>
        <div className="auth-sub">บันทึกรายรับรายจ่าย · ข้อมูลส่วนตัว · เข้าถึงได้ทุกที่</div>
        <div className="auth-tabs">
          <button className={`auth-tab${tab === "login" ? " active" : ""}`} onClick={() => { setTab("login"); setError(""); }}>เข้าสู่ระบบ</button>
          <button className={`auth-tab${tab === "register" ? " active" : ""}`} onClick={() => { setTab("register"); setError(""); }}>สมัครสมาชิก</button>
        </div>
        {error && <div className="error">⚠ {error}</div>}
        <div className="field">
          <label>ชื่อผู้ใช้</label>
          <input value={form.username} onChange={e => handleChange("username", e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="กรอกชื่อผู้ใช้" />
        </div>
        <div className="field">
          <label>รหัสผ่าน</label>
          <input type="password" value={form.password} onChange={e => handleChange("password", e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="กรอกรหัสผ่าน" />
        </div>
        {tab === "register" && (
          <div className="field">
            <label>ยืนยันรหัสผ่าน</label>
            <input type="password" value={form.confirm} onChange={e => handleChange("confirm", e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="กรอกรหัสผ่านอีกครั้ง" />
          </div>
        )}
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "⏳ กำลังดำเนินการ..." : tab === "login" ? "🔑 เข้าสู่ระบบ" : "✨ สมัครสมาชิก"}
        </button>
      </div>
    </div>
  );
}

function AddTransactionModal({ onClose, onSave, checkAdmin }) {
  const [form, setForm] = useState({ type: "expense", name: "", amount: "", category: "อาหาร", date: new Date().toISOString().split("T")[0], note: "" });
  const cats = { expense: ["อาหาร", "เดินทาง", "ที่พัก", "ช้อปปิ้ง", "บันเทิง", "สุขภาพ", "การศึกษา", "ค่าใช้จ่ายประจำ", "อื่นๆ"], income: ["เงินเดือน", "ฟรีแลนซ์", "ลงทุน", "ของขวัญ", "อื่นๆ"] };
  const handleChange = (k, v) => { setForm(f => ({ ...f, [k]: v })); checkAdmin && checkAdmin(v); };
  const handleSave = () => {
    if (!form.name || !form.amount || isNaN(+form.amount) || +form.amount <= 0) return;
    onSave({ id: uid(), type: form.type, name: form.name, amount: +form.amount, category: form.category, date: form.date, note: form.note, createdAt: new Date().toISOString() });
    onClose();
  };
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <div className="modal-title">➕ บันทึกรายการ</div>
        <div className="type-toggle">
          <button className={`type-btn expense${form.type === "expense" ? " active" : ""}`} onClick={() => setForm(f => ({ ...f, type: "expense", category: cats.expense[0] }))}>💸 รายจ่าย</button>
          <button className={`type-btn income${form.type === "income" ? " active" : ""}`} onClick={() => setForm(f => ({ ...f, type: "income", category: cats.income[0] }))}>💰 รายรับ</button>
        </div>
        <div className="field"><label>ชื่อรายการ</label><input value={form.name} onChange={e => handleChange("name", e.target.value)} placeholder="เช่น ข้าวกลางวัน" /></div>
        <div className="field"><label>จำนวนเงิน (บาท)</label><input type="number" value={form.amount} onChange={e => handleChange("amount", e.target.value)} placeholder="0.00" /></div>
        <div className="field"><label>หมวดหมู่</label><select value={form.category} onChange={e => handleChange("category", e.target.value)}>{cats[form.type].map(c => <option key={c}>{c}</option>)}</select></div>
        <div className="field"><label>วันที่</label><input type="date" value={form.date} onChange={e => handleChange("date", e.target.value)} /></div>
        <div className="field"><label>หมายเหตุ (ไม่บังคับ)</label><input value={form.note} onChange={e => handleChange("note", e.target.value)} placeholder="บันทึกเพิ่มเติม..." /></div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={handleSave}>💾 บันทึก</button>
        </div>
      </div>
    </div>
  );
}

function AddRecurringModal({ onClose, onSave, checkAdmin }) {
  const [form, setForm] = useState({ type: "expense", name: "", amount: "", freq: "monthly", customDays: "30", startDate: new Date().toISOString().split("T")[0] });
  const handleChange = (k, v) => { setForm(f => ({ ...f, [k]: v })); checkAdmin && checkAdmin(v); };
  const handleSave = () => {
    if (!form.name || !form.amount || isNaN(+form.amount) || +form.amount <= 0) return;
    onSave({ id: uid(), type: form.type, name: form.name, amount: +form.amount, freq: form.freq, customDays: +form.customDays, startDate: form.startDate, active: true, createdAt: new Date().toISOString() });
    onClose();
  };
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in">
        <div className="modal-title">🔄 เพิ่มรายการประจำ</div>
        <div className="type-toggle">
          <button className={`type-btn expense${form.type === "expense" ? " active" : ""}`} onClick={() => setForm(f => ({ ...f, type: "expense" }))}>💸 รายจ่าย</button>
          <button className={`type-btn income${form.type === "income" ? " active" : ""}`} onClick={() => setForm(f => ({ ...f, type: "income" }))}>💰 รายรับ</button>
        </div>
        <div className="field"><label>ชื่อรายการ</label><input value={form.name} onChange={e => handleChange("name", e.target.value)} placeholder="เช่น ค่าเน็ต, ค่าเช่า" /></div>
        <div className="field"><label>จำนวนเงิน (บาท)</label><input type="number" value={form.amount} onChange={e => handleChange("amount", e.target.value)} placeholder="0.00" /></div>
        <div className="field"><label>ความถี่</label>
          <select value={form.freq} onChange={e => handleChange("freq", e.target.value)}>
            {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {form.freq === "custom" && <div className="field"><label>ทุกกี่วัน</label><input type="number" value={form.customDays} onChange={e => handleChange("customDays", e.target.value)} /></div>}
        <div className="field"><label>วันที่เริ่มต้น</label><input type="date" value={form.startDate} onChange={e => handleChange("startDate", e.target.value)} /></div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={handleSave}>💾 บันทึก</button>
        </div>
      </div>
    </div>
  );
}

function DashboardTab({ data, username }) {
  const now = new Date();
  const thisMonth = getMonthKey();
  const txThisMonth = data.transactions.filter(t => t.date.startsWith(thisMonth));
  const totalIncome = txThisMonth.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = txThisMonth.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = data.transactions.reduce((s, t) => t.type === "income" ? s + t.amount : s - t.amount, 0);
  const recurMonthlyIncome = data.recurring.filter(r => r.active && r.type === "income").reduce((s, r) => s + getMonthlyAmount(r), 0);
  const recurMonthlyExpense = data.recurring.filter(r => r.active && r.type === "expense").reduce((s, r) => s + getMonthlyAmount(r), 0);
  const upcoming = data.recurring.filter(r => r.active).map(r => {
    const next = getNextDue(r.startDate, r.freq, r.customDays);
    return { ...r, next, daysLeft: Math.ceil((next - now) / 86400000) };
  }).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
  const recent = [...data.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>สวัสดี, {username} 👋</div>
          <div style={{ color: "var(--text2)", fontSize: 13, marginTop: 4 }}>
            {now.toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} &nbsp;
            <span className="realtime-dot">Realtime</span>
          </div>
        </div>
      </div>
      <div className="summary-grid">
        <StatCard label="ยอดคงเหลือรวม" value={`฿${formatTHB(balance)}`} sub="รวมทุกรายการ" color={balance >= 0 ? "green" : "red"} />
        <StatCard label="รายรับเดือนนี้" value={`฿${formatTHB(totalIncome)}`} sub={`เดือน ${now.toLocaleDateString("th-TH", { month: "long" })}`} color="blue" />
        <StatCard label="รายจ่ายเดือนนี้" value={`฿${formatTHB(totalExpense)}`} sub={`ใช้ไป ${totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(0) : 0}% ของรายรับ`} color="red" />
        <StatCard label="ค่าใช้จ่ายประจำ/เดือน" value={`฿${formatTHB(recurMonthlyExpense)}`} sub={`รายรับประจำ ฿${formatTHB(recurMonthlyIncome)}/เดือน`} color="gold" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <div className="section-title">รายการล่าสุด</div>
          {recent.length === 0 ? <div className="empty"><div className="empty-icon">📋</div><div className="empty-text">ยังไม่มีรายการ</div></div> :
            <div className="tx-list">{recent.map(t => (
              <div className="tx-item" key={t.id}>
                <div className={`tx-icon ${t.type}`}>{t.type === "income" ? "💰" : "💸"}</div>
                <div className="tx-info"><div className="tx-name">{t.name}</div><div className="tx-meta">{t.category} · {formatDate(t.date)}</div></div>
                <div className={`tx-amount ${t.type}`}>{t.type === "income" ? "+" : "-"}฿{formatTHB(t.amount)}</div>
              </div>
            ))}</div>}
        </div>
        <div>
          <div className="section-title">รายการประจำที่กำลังจะถึง</div>
          {upcoming.length === 0 ? <div className="empty"><div className="empty-icon">🔄</div><div className="empty-text">ไม่มีรายการประจำ</div></div> :
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {upcoming.map(r => (
                <div className="rec-item" key={r.id}>
                  <div className={`tx-icon ${r.type}`}>{r.type === "income" ? "💰" : "💸"}</div>
                  <div className="tx-info">
                    <div className="tx-name">{r.name}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <span className={`next-due-badge${r.daysLeft <= 3 ? " soon" : r.daysLeft < 0 ? " overdue" : ""}`}>
                        {r.daysLeft < 0 ? "เลยกำหนด" : r.daysLeft === 0 ? "วันนี้" : `${r.daysLeft} วัน`}
                      </span>
                    </div>
                  </div>
                  <div className={`tx-amount ${r.type}`}>{r.type === "income" ? "+" : "-"}฿{formatTHB(r.amount)}</div>
                </div>
              ))}
            </div>}
        </div>
      </div>
    </div>
  );
}

function TransactionsTab({ data, setData, username, checkAdmin }) {
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey());

  const handleSave = async (tx) => {
    const newData = { ...data, transactions: [tx, ...data.transactions] };
    setData(newData);
    await saveUserData(username, newData);
  };
  const handleDelete = async (id) => {
    const newData = { ...data, transactions: data.transactions.filter(t => t.id !== id) };
    setData(newData);
    await saveUserData(username, newData);
  };

  const months = [...new Set(data.transactions.map(t => t.date.slice(0, 7)))].sort().reverse();
  if (!months.includes(selectedMonth)) months.unshift(selectedMonth);
  const filtered = data.transactions.filter(t => t.date.startsWith(selectedMonth)).filter(t => filter === "all" ? true : t.type === filter).sort((a, b) => new Date(b.date) - new Date(a.date));
  const mIncome = filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const mExpense = filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="fade-in">
      <div className="section-title">
        <span>รายการรายรับ-รายจ่าย</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(true)}>+ เพิ่มรายการ</button>
      </div>
      <div className="month-row">
        {months.map(m => {
          const [y, mo] = m.split("-");
          return <button key={m} className={`month-chip${m === selectedMonth ? " active" : ""}`} onClick={() => setSelectedMonth(m)}>{new Date(+y, +mo - 1).toLocaleDateString("th-TH", { month: "short", year: "2-digit" })}</button>;
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div className="card-sm" style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 4 }}>รายรับ</div><div style={{ fontFamily: "Space Mono", fontSize: 16, fontWeight: 700, color: "var(--blue)" }}>฿{formatTHB(mIncome)}</div></div>
        <div className="card-sm" style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 4 }}>รายจ่าย</div><div style={{ fontFamily: "Space Mono", fontSize: 16, fontWeight: 700, color: "var(--red)" }}>฿{formatTHB(mExpense)}</div></div>
        <div className="card-sm" style={{ textAlign: "center" }}><div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 4 }}>คงเหลือ</div><div style={{ fontFamily: "Space Mono", fontSize: 16, fontWeight: 700, color: mIncome - mExpense >= 0 ? "var(--green)" : "var(--red)" }}>฿{formatTHB(mIncome - mExpense)}</div></div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["all", "income", "expense"].map(f => (
          <button key={f} className={`btn btn-ghost btn-sm`} style={filter === f ? { background: "var(--surface3)", borderColor: "var(--border2)" } : {}} onClick={() => setFilter(f)}>
            {f === "all" ? "ทั้งหมด" : f === "income" ? "💰 รายรับ" : "💸 รายจ่าย"}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? <div className="empty"><div className="empty-icon">📋</div><div className="empty-text">ไม่มีรายการในช่วงนี้</div></div> :
        <div className="tx-list">
          {filtered.map(t => (
            <div className="tx-item" key={t.id}>
              <div className={`tx-icon ${t.type}`}>{t.type === "income" ? "💰" : "💸"}</div>
              <div className="tx-info"><div className="tx-name">{t.name}</div><div className="tx-meta">{t.category} · {formatDate(t.date)}{t.note ? ` · ${t.note}` : ""}</div></div>
              <div className={`tx-amount ${t.type}`}>{t.type === "income" ? "+" : "-"}฿{formatTHB(t.amount)}</div>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)} style={{ marginLeft: 8 }}>🗑</button>
            </div>
          ))}
        </div>}
      {showModal && <AddTransactionModal onClose={() => setShowModal(false)} onSave={handleSave} checkAdmin={checkAdmin} />}
    </div>
  );
}

function RecurringTab({ data, setData, username, checkAdmin }) {
  const [showModal, setShowModal] = useState(false);
  const now = new Date();

  const handleSave = async (item) => {
    const newData = { ...data, recurring: [...data.recurring, item] };
    setData(newData);
    await saveUserData(username, newData);
  };
  const handleToggle = async (id) => {
    const newData = { ...data, recurring: data.recurring.map(r => r.id === id ? { ...r, active: !r.active } : r) };
    setData(newData);
    await saveUserData(username, newData);
  };
  const handleDelete = async (id) => {
    const newData = { ...data, recurring: data.recurring.filter(r => r.id !== id) };
    setData(newData);
    await saveUserData(username, newData);
  };

  const totalMonthlyExpense = data.recurring.filter(r => r.active && r.type === "expense").reduce((s, r) => s + getMonthlyAmount(r), 0);
  const totalMonthlyIncome = data.recurring.filter(r => r.active && r.type === "income").reduce((s, r) => s + getMonthlyAmount(r), 0);

  return (
    <div className="fade-in">
      <div className="section-title">
        <span>รายการประจำ</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(true)}>+ เพิ่มรายการประจำ</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <div className="card-sm"><div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 4 }}>รายจ่ายประจำ/เดือน (ประมาณ)</div><div style={{ fontFamily: "Space Mono", fontSize: 20, fontWeight: 700, color: "var(--red)" }}>฿{formatTHB(totalMonthlyExpense)}</div></div>
        <div className="card-sm"><div style={{ fontSize: 11, color: "var(--text2)", marginBottom: 4 }}>รายรับประจำ/เดือน (ประมาณ)</div><div style={{ fontFamily: "Space Mono", fontSize: 20, fontWeight: 700, color: "var(--green)" }}>฿{formatTHB(totalMonthlyIncome)}</div></div>
      </div>
      {data.recurring.length === 0 ? <div className="empty"><div className="empty-icon">🔄</div><div className="empty-text">ยังไม่มีรายการประจำ</div></div> :
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.recurring.map(r => {
            const next = getNextDue(r.startDate, r.freq, r.customDays);
            const daysLeft = Math.ceil((next - now) / 86400000);
            return (
              <div className="rec-item" key={r.id} style={{ opacity: r.active ? 1 : 0.5 }}>
                <div className={`tx-icon ${r.type}`}>{r.type === "income" ? "💰" : "💸"}</div>
                <div className="tx-info">
                  <div className="tx-name">{r.name}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                    <span className={`rec-badge ${r.type}`}>{r.type === "income" ? "รายรับ" : "รายจ่าย"}</span>
                    <span style={{ fontSize: 11, color: "var(--text3)" }}>{FREQ_LABELS[r.freq]}{r.freq === "custom" ? ` (${r.customDays} วัน)` : ""}</span>
                    <span className={`next-due-badge${daysLeft <= 3 ? " soon" : daysLeft < 0 ? " overdue" : ""}`}>
                      {daysLeft < 0 ? "เลยกำหนด" : daysLeft === 0 ? "วันนี้" : `${daysLeft} วัน`}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text3)" }}>~฿{formatTHB(getMonthlyAmount(r))}/เดือน</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <div className={`tx-amount ${r.type}`}>{r.type === "income" ? "+" : "-"}฿{formatTHB(r.amount)}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(r.id)}>{r.active ? "⏸" : "▶"}</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>🗑</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>}
      {showModal && <AddRecurringModal onClose={() => setShowModal(false)} onSave={handleSave} checkAdmin={checkAdmin} />}
    </div>
  );
}

function StatsTab({ data }) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(getMonthKey(d));
  }
  const monthlyData = months.map(m => {
    const txs = data.transactions.filter(t => t.date.startsWith(m));
    return { month: m, income: txs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0), expense: txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0) };
  });
  const maxVal = Math.max(...monthlyData.flatMap(d => [d.income, d.expense]), 1);
  const thisMonthTxs = data.transactions.filter(t => t.date.startsWith(getMonthKey()) && t.type === "expense");
  const catMap = {};
  thisMonthTxs.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const catTotal = cats.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="fade-in">
      <div className="section-title">สถิติ 6 เดือนล่าสุด</div>
      <div className="card" style={{ marginBottom: 24 }}>
        {monthlyData.map(d => {
          const [y, m] = d.month.split("-");
          const label = new Date(+y, +m - 1).toLocaleDateString("th-TH", { month: "short", year: "2-digit" });
          return (
            <div key={d.month} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 6, fontWeight: 600 }}>{label}</div>
              <div className="bar-row"><div className="bar-label" style={{ color: "var(--blue)", fontSize: 11 }}>รายรับ</div><div className="bar-track"><div className="bar-fill" style={{ width: `${(d.income / maxVal) * 100}%`, background: "var(--blue)" }} /></div><div className="bar-val" style={{ color: "var(--blue)" }}>฿{formatTHB(d.income)}</div></div>
              <div className="bar-row" style={{ marginTop: 4 }}><div className="bar-label" style={{ color: "var(--red)", fontSize: 11 }}>รายจ่าย</div><div className="bar-track"><div className="bar-fill" style={{ width: `${(d.expense / maxVal) * 100}%`, background: "var(--red)" }} /></div><div className="bar-val" style={{ color: "var(--red)" }}>฿{formatTHB(d.expense)}</div></div>
            </div>
          );
        })}
      </div>
      <div className="section-title">รายจ่ายตามหมวดหมู่ (เดือนนี้)</div>
      {cats.length === 0 ? <div className="empty"><div className="empty-icon">📊</div><div className="empty-text">ยังไม่มีข้อมูล</div></div> :
        <div className="card"><div className="bar-container">{cats.map(([cat, val]) => (
          <div className="bar-row" key={cat}><div className="bar-label">{cat}</div><div className="bar-track"><div className="bar-fill" style={{ width: `${(val / catTotal) * 100}%`, background: "var(--red)" }} /></div><div className="bar-val" style={{ color: "var(--text2)" }}>฿{formatTHB(val)}</div></div>
        ))}</div></div>}
    </div>
  );
}

function AdminTab() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllUsers().then(d => { setData(d); setLoading(false); });
  }, []);

  const deleteUser = async (username) => {
    if (!confirm(`ลบผู้ใช้ "${username}" และข้อมูลทั้งหมด?`)) return;
    const newUsers = { ...data.users };
    delete newUsers[username];
    await saveUsers(newUsers);
    try { await deleteDoc(doc(db, "userData", username)); } catch {}
    setData(d => ({ ...d, users: newUsers }));
    if (selected === username) setSelected(null);
  };

  const selectedData = selected && data?.dataMap[selected];

  return (
    <div className="fade-in">
      <div className="admin-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span className="admin-badge">⚡ ADMIN</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Admin Control Panel</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text2)" }}>Firebase Database · ข้อมูลจริงทั้งหมดในระบบ</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontFamily: "Space Mono", fontSize: 28, fontWeight: 700, color: "var(--gold)" }}>{data ? Object.keys(data.users).length : "–"}</div>
          <div style={{ fontSize: 11, color: "var(--text2)" }}>ผู้ใช้ทั้งหมด</div>
        </div>
      </div>
      {loading ? <div style={{ color: "var(--text2)", padding: 20 }} className="pulse">⏳ กำลังโหลด...</div> :
        <div className="admin-grid">
          <div>
            <div className="section-title">รายชื่อผู้ใช้</div>
            {Object.keys(data.users).length === 0 ? <div style={{ color: "var(--text3)", fontSize: 13 }}>ยังไม่มีผู้ใช้</div> :
              Object.entries(data.users).map(([uname, info]) => (
                <div key={uname} className={`user-list-item${selected === uname ? " selected" : ""}`} onClick={() => setSelected(uname)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{uname}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)" }}>{info.createdAt ? new Date(info.createdAt).toLocaleDateString("th-TH") : "-"}</div>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); deleteUser(uname); }}>🗑</button>
                  </div>
                </div>
              ))}
          </div>
          <div>
            {selected && selectedData ? (
              <div>
                <div className="section-title">ข้อมูลของ: {selected}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                  <div className="card-sm"><div style={{ fontSize: 11, color: "var(--text2)" }}>รายการทั้งหมด</div><div style={{ fontFamily: "Space Mono", fontSize: 22, fontWeight: 700 }}>{selectedData.transactions?.length || 0}</div></div>
                  <div className="card-sm"><div style={{ fontSize: 11, color: "var(--text2)" }}>รายการประจำ</div><div style={{ fontFamily: "Space Mono", fontSize: 22, fontWeight: 700 }}>{selectedData.recurring?.length || 0}</div></div>
                  <div className="card-sm"><div style={{ fontSize: 11, color: "var(--text2)" }}>ยอดคงเหลือ</div>
                    <div style={{ fontFamily: "Space Mono", fontSize: 18, fontWeight: 700, color: "var(--green)" }}>฿{formatTHB((selectedData.transactions || []).reduce((s, t) => t.type === "income" ? s + t.amount : s - t.amount, 0))}</div>
                  </div>
                </div>
                <div className="section-title">รายการล่าสุด (10 รายการ)</div>
                <div className="tx-list">
                  {[...(selectedData.transactions || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10).map(t => (
                    <div className="tx-item" key={t.id}>
                      <div className={`tx-icon ${t.type}`}>{t.type === "income" ? "💰" : "💸"}</div>
                      <div className="tx-info"><div className="tx-name">{t.name}</div><div className="tx-meta">{t.category} · {formatDate(t.date)}</div></div>
                      <div className={`tx-amount ${t.type}`}>{t.type === "income" ? "+" : "-"}฿{formatTHB(t.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div className="empty"><div className="empty-icon">👈</div><div className="empty-text">เลือกผู้ใช้เพื่อดูข้อมูล</div></div>}
          </div>
        </div>}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [data, setData] = useState({ transactions: [], recurring: [] });
  const [loading, setLoading] = useState(false);
  const adminCodeBuffer = useRef("");

  const checkAdmin = useCallback((value) => {
    if (value === ADMIN_CODE) { setIsAdmin(true); setTab("admin"); }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      adminCodeBuffer.current += e.key;
      if (adminCodeBuffer.current.length > ADMIN_CODE.length + 5)
        adminCodeBuffer.current = adminCodeBuffer.current.slice(-ADMIN_CODE.length - 5);
      if (adminCodeBuffer.current.includes(ADMIN_CODE)) {
        adminCodeBuffer.current = "";
        setIsAdmin(true);
        setTab("admin");
      }
    };
    window.addEventListener("keypress", handler);
    return () => window.removeEventListener("keypress", handler);
  }, []);

  const handleLogin = async (username, directAdmin = false) => {
    if (directAdmin || username === "__admin__") {
      setUser("admin"); setIsAdmin(true); setTab("admin"); return;
    }
    setLoading(true);
    const d = await loadUserData(username);
    setData(d);
    setUser(username);
    setLoading(false);
  };

  const handleLogout = () => {
    setUser(null); setIsAdmin(false); setTab("dashboard");
    setData({ transactions: [], recurring: [] });
  };

  if (!user) return (
    <>
      <style>{CSS}</style>
      <AuthPage onLogin={handleLogin} />
    </>
  );

  const tabs = [
    { id: "dashboard", label: "🏠 หน้าหลัก" },
    { id: "transactions", label: "📋 รายการ" },
    { id: "recurring", label: "🔄 รายการประจำ" },
    { id: "stats", label: "📊 สถิติ" },
    ...(isAdmin ? [{ id: "admin", label: "⚡ Admin", isAdmin: true }] : []),
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <header className="topbar">
          <div className="topbar-logo">Fin<span>Track</span></div>
          <div className="topbar-right">
            <div className="user-pill"><span className="dot" />{user}</div>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>ออกจากระบบ</button>
          </div>
        </header>
        <nav className="nav">
          {tabs.map(t => (
            <button key={t.id} className={`nav-tab${tab === t.id ? " active" : ""}${t.isAdmin ? " admin-tab" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>
        <main className="content">
          {loading ? <div style={{ textAlign: "center", color: "var(--text2)", padding: 40 }}><div className="pulse">⏳ กำลังโหลดข้อมูล...</div></div> : (
            <>
              {tab === "dashboard" && <DashboardTab data={data} username={user} />}
              {tab === "transactions" && <TransactionsTab data={data} setData={setData} username={user} checkAdmin={checkAdmin} />}
              {tab === "recurring" && <RecurringTab data={data} setData={setData} username={user} checkAdmin={checkAdmin} />}
              {tab === "stats" && <StatsTab data={data} />}
              {tab === "admin" && isAdmin && <AdminTab />}
            </>
          )}
        </main>
      </div>
    </>
  );
}
