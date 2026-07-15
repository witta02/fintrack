import { store } from "../store.js";
import { router } from "../router.js";
import { alerts } from "../utils/alertHelper.js";

const money = (amount) =>
  `${store.getCurrencySymbol()}${store.toDisplay(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function renderDownPayments(container) {
  const plans = store.getDownPayments();
  const activePlans = plans.filter((plan) => plan.paidAmount < plan.totalAmount);

  container.innerHTML = `
    <div class="screen down-payment-screen">
      <div class="screen-header">
        <div><div class="section-eyebrow">PAYMENT TRACKER</div><h1>ผ่อน / เงินดาวน์</h1><p class="down-payment-intro">ติดตามเงินที่จ่ายแล้ว ยอดคงเหลือ และวันชำระส่วนที่เหลือ</p></div>
        <button id="add-down-payment" class="btn-primary">+ เพิ่มรายการ</button>
      </div>
      <div class="down-payment-summary">
        <span>คงเหลือที่ต้องจ่าย</span>
        <strong>${money(activePlans.reduce((sum, plan) => sum + Math.max(0, plan.totalAmount - plan.paidAmount), 0))}</strong>
        <small>${activePlans.length ? `มี ${activePlans.length} รายการที่ยังชำระไม่ครบ` : "ไม่มีรายการค้างชำระ"}</small>
      </div>
      <div id="down-payment-list" class="down-payment-list">${plans.length ? plans.map(planCard).join("") : emptyState()}</div>
    </div>`;

  container.querySelector("#add-down-payment").addEventListener("click", () => showAddDialog(container));
  attachPlanActions(container);
  const unsubscribe = store.subscribe(() => {
    if (document.querySelector(".down-payment-screen")) renderDownPayments(container);
    else unsubscribe();
  });
}

function planCard(plan) {
  const remaining = Math.max(0, plan.totalAmount - plan.paidAmount);
  const percentage = plan.totalAmount ? Math.min(100, (plan.paidAmount / plan.totalAmount) * 100) : 0;
  const complete = remaining === 0;
  const due = plan.dueDate ? plan.dueDate.toLocaleDateString(store.settings.language === "en" ? "en-GB" : "th-TH", { day: "numeric", month: "short", year: "numeric" }) : "ยังไม่ได้กำหนดวัน";
  return `<article class="down-payment-card ${complete ? "is-complete" : ""}">
    <div class="down-payment-card-top"><div><h2>${escapeHtml(plan.title)}</h2><span class="payment-status">${complete ? "ชำระครบแล้ว" : `เหลือ ${money(remaining)}`}</span></div><button class="payment-delete" data-delete-plan="${plan.id}" aria-label="ลบรายการ">×</button></div>
    <div class="payment-ratio"><strong>${money(plan.paidAmount)}</strong><span>/ ${money(plan.totalAmount)}</span></div>
    <div class="payment-progress" aria-label="ชำระแล้ว ${percentage.toFixed(0)}%"><span style="width:${percentage}%"></span></div>
    <div class="payment-meta"><span>จ่ายแล้ว ${percentage.toFixed(0)}%</span><span>${complete ? "✓ เสร็จสิ้น" : `เตือนชำระ: ${due}`}</span></div>
    ${complete ? "" : `<button class="payment-add-btn" data-add-payment="${plan.id}" data-remaining="${remaining}">บันทึกการจ่ายเพิ่ม</button>`}
  </article>`;
}

function emptyState() {
  return `<div class="empty-state" style="padding:48px 20px;"><div style="font-size:36px">🧾</div><h3>ยังไม่มีรายการเงินดาวน์</h3><p>เพิ่มยอดรวม ยอดที่จ่ายแล้ว และวันชำระส่วนที่เหลือได้ที่นี่</p></div>`;
}

function attachPlanActions(container) {
  container.querySelectorAll("[data-add-payment]").forEach((button) => button.addEventListener("click", async () => {
    const remaining = Number(button.dataset.remaining);
    const { value } = await alerts.prompt("บันทึกการจ่ายเพิ่ม", `ยอดคงเหลือ ${money(remaining)}`, "number", "", { inputAttributes: { min: 0.01, max: remaining, step: 0.01 } });
    const amount = parseFloat(value);
    if (amount > 0) store.recordDownPayment(button.dataset.addPayment, amount);
  }));
  container.querySelectorAll("[data-delete-plan]").forEach((button) => button.addEventListener("click", async () => {
    if (await alerts.confirmDelete("ลบรายการเงินดาวน์?", "ข้อมูลการติดตามนี้จะถูกลบ")) store.deleteDownPayment(button.dataset.deletePlan);
  }));
}

function showAddDialog(container) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `<div class="modal-dialog down-payment-modal"><div class="modal-header"><h3>เพิ่มรายการเงินดาวน์</h3><button class="modal-close-btn">×</button></div><form id="down-payment-form"><label>ชื่อสิ่งที่ซื้อ<input class="form-control" name="title" required placeholder="เช่น โทรศัพท์ใหม่" /></label><label>ยอดเต็ม (บาท)<input class="form-control" name="total" required type="number" min="0.01" step="0.01" placeholder="12000" /></label><label>จ่ายไปแล้ว (บาท)<input class="form-control" name="paid" required type="number" min="0" step="0.01" value="0" placeholder="6000" /></label><label>วันนัดชำระส่วนที่เหลือ<input class="form-control" name="due" type="date" /></label><button class="btn-primary" type="submit">บันทึกรายการ</button></form></div>`;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close-btn").addEventListener("click", close);
  modal.addEventListener("click", (event) => { if (event.target === modal) close(); });
  modal.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const totalAmount = parseFloat(data.get("total"));
    const paidAmount = parseFloat(data.get("paid"));
    if (!totalAmount || paidAmount < 0 || paidAmount > totalAmount) return alerts.warning("กรุณาตรวจสอบยอดเงิน", "ยอดที่จ่ายแล้วต้องไม่มากกว่ายอดเต็ม");
    store.addDownPayment({ title: data.get("title"), totalAmount, paidAmount, dueDate: data.get("due") });
    close();
  });
}

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]); }
