import { store } from "../store.js";
import { router } from "../router.js";
import { alerts } from "../utils/alertHelper.js";
import { t } from "../i18n.js";

const money = (amount) =>
  `${store.getCurrencySymbol()}${store.toDisplay(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function renderDownPayments(container) {
  const plans = store.getDownPayments();
  const activePlans = plans.filter((plan) => plan.paidAmount < plan.totalAmount);

  container.innerHTML = `
    <div class="screen down-payment-screen">
      <div class="screen-header">
        <div><div class="section-eyebrow">${t("downPaymentTracker")}</div><h1>${t("downPaymentTitle")}</h1><p class="down-payment-intro">${t("downPaymentIntro")}</p></div>
        <button id="add-down-payment" class="btn-primary">+ ${t("downPaymentAdd")}</button>
      </div>
      <div class="down-payment-summary">
        <span>${t("downPaymentOutstanding")}</span>
        <strong>${money(activePlans.reduce((sum, plan) => sum + Math.max(0, plan.totalAmount - plan.paidAmount), 0))}</strong>
        <small>${activePlans.length ? t("downPaymentOpenCount", { count: activePlans.length }) : t("downPaymentNoneDue")}</small>
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
  const due = plan.dueDate ? plan.dueDate.toLocaleDateString(store.settings.language === "en" ? "en-GB" : "th-TH", { day: "numeric", month: "short", year: "numeric" }) : t("downPaymentNoDate");
  return `<article class="down-payment-card ${complete ? "is-complete" : ""}">
    <div class="down-payment-card-top"><div><h2>${escapeHtml(plan.title)}</h2><span class="payment-status">${complete ? t("downPaymentComplete") : t("downPaymentRemaining", { amount: money(remaining) })}</span></div><button class="payment-delete" data-delete-plan="${plan.id}" aria-label="${t("deleteThis")}">×</button></div>
    <div class="payment-ratio"><strong>${money(plan.paidAmount)}</strong><span>/ ${money(plan.totalAmount)}</span></div>
    <div class="payment-progress" aria-label="${t("downPaymentPaid")} ${percentage.toFixed(0)}%"><span style="width:${percentage}%"></span></div>
    <div class="payment-meta"><span>${t("downPaymentPaid")} ${percentage.toFixed(0)}%</span><span>${complete ? `✓ ${t("downPaymentComplete")}` : t("downPaymentReminder", { date: due })}</span></div>
    ${complete ? "" : `<button class="payment-add-btn" data-add-payment="${plan.id}" data-remaining="${remaining}">${t("downPaymentAddPayment")}</button>`}
  </article>`;
}

function emptyState() {
  return `<div class="empty-state" style="padding:48px 20px;"><div style="font-size:36px">🧾</div><h3>${t("downPaymentEmpty")}</h3><p>${t("downPaymentEmptyHint")}</p></div>`;
}

function attachPlanActions(container) {
  container.querySelectorAll("[data-add-payment]").forEach((button) => button.addEventListener("click", async () => {
    const remaining = Number(button.dataset.remaining);
    const { value } = await alerts.prompt(t("downPaymentPaymentTitle"), t("downPaymentRemaining", { amount: money(remaining) }), "number", "", { inputAttributes: { min: 0.01, max: remaining, step: 0.01 } });
    const amount = parseFloat(value);
    if (amount > 0) store.recordDownPayment(button.dataset.addPayment, amount);
  }));
  container.querySelectorAll("[data-delete-plan]").forEach((button) => button.addEventListener("click", async () => {
    if (await alerts.confirmDelete(t("downPaymentDelete"), t("downPaymentDeleteHint"))) store.deleteDownPayment(button.dataset.deletePlan);
  }));
}

function showAddDialog(container) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `<div class="modal-dialog down-payment-modal"><div class="modal-header"><h3>${t("downPaymentAddTitle")}</h3><button class="modal-close-btn">×</button></div><form id="down-payment-form"><label>${t("downPaymentItemName")}<input class="form-control" name="title" required placeholder="${t("downPaymentItemPlaceholder")}" /></label><label>${t("downPaymentTotal")}<input class="form-control" name="total" required type="number" min="0.01" step="0.01" placeholder="12000" /></label><label>${t("downPaymentPaidAlready")}<input class="form-control" name="paid" required type="number" min="0" step="0.01" value="0" placeholder="6000" /></label><label>${t("downPaymentDueDate")}<input class="form-control" name="due" type="date" /></label><button class="btn-primary" type="submit">${t("save")}</button></form></div>`;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close-btn").addEventListener("click", close);
  modal.addEventListener("click", (event) => { if (event.target === modal) close(); });
  modal.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const totalAmount = parseFloat(data.get("total"));
    const paidAmount = parseFloat(data.get("paid"));
    if (!totalAmount || paidAmount < 0 || paidAmount > totalAmount) return alerts.warning(t("downPaymentInvalid"), t("downPaymentInvalidHint"));
    store.addDownPayment({ title: data.get("title"), totalAmount, paidAmount, dueDate: data.get("due") });
    close();
  });
}

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]); }
