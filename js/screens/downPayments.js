import { store } from "../store.js";
import { router } from "../router.js";
import { alerts } from "../utils/alertHelper.js";
import { t } from "../i18n.js";

const money = (amount) =>
  `${store.getCurrencySymbol()}${store.toDisplay(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function renderDownPayments(container) {
  container.innerHTML = `
    <div class="screen screen-enter down-payment-screen" style="padding: 0 16px 24px;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0 16px;">
        <div>
          <h1 style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: var(--text-primary); margin: 0;">${t("downPaymentTitle")}</h1>
        </div>
        <button id="add-down-payment" class="icon-btn" title="${t("downPaymentAdd")}" style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, var(--gold), var(--amber)); border: none; display: flex; align-items: center; justify-content: center; color: #000; box-shadow: var(--shadow-gold);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>

      <!-- Hero Summary Card -->
      <div style="background: var(--balance-bg); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 20px; margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); margin-bottom: 4px;">
          ${t("downPaymentOutstanding")}
        </div>
        <div id="down-payment-total-hero" style="font-size: 32px; font-weight: 900; color: var(--balance-text); font-family: var(--font-heading); margin-bottom: 6px;">
          0.00
        </div>
        <div id="down-payment-status-text" style="font-size: 12px; color: var(--text-secondary);">
        </div>
      </div>

      <!-- Plan list -->
      <div id="down-payment-list" style="display: flex; flex-direction: column; gap: 14px;">
      </div>
    </div>`;

  container.querySelector("#add-down-payment")?.addEventListener("click", () => showAddDialog(container));
  updateDownPaymentsUI(container);

  const unsubscribe = store.subscribe(() => {
    if (document.querySelector(".down-payment-screen")) updateDownPaymentsUI(container);
    else unsubscribe();
  });
}

function updateDownPaymentsUI(container) {
  const plans = store.getDownPayments();
  const activePlans = plans.filter((plan) => plan.paidAmount < plan.totalAmount);
  const totalOutstanding = activePlans.reduce((sum, plan) => sum + Math.max(0, plan.totalAmount - plan.paidAmount), 0);

  const totalHero = container.querySelector("#down-payment-total-hero");
  if (totalHero) totalHero.textContent = money(totalOutstanding);

  const statusText = container.querySelector("#down-payment-status-text");
  if (statusText) {
    statusText.textContent = activePlans.length ? t("downPaymentOpenCount", { count: activePlans.length }) : t("downPaymentNoneDue");
  }

  const listEl = container.querySelector("#down-payment-list");
  if (listEl) {
    listEl.innerHTML = plans.length ? plans.map(planCard).join("") : emptyState();
    attachPlanActions(container);
  }
}

function planCard(plan) {
  const remaining = Math.max(0, plan.totalAmount - plan.paidAmount);
  const percentage = plan.totalAmount ? Math.min(100, (plan.paidAmount / plan.totalAmount) * 100) : 0;
  const complete = remaining === 0;
  const dueDateObj = plan.dueDate ? (plan.dueDate instanceof Date ? plan.dueDate : new Date(plan.dueDate)) : null;
  const isDueValid = dueDateObj && !isNaN(dueDateObj.getTime());
  const due = isDueValid
    ? dueDateObj.toLocaleDateString(store.settings.language === "en" ? "en-GB" : "th-TH", { day: "numeric", month: "short", year: "numeric" })
    : t("downPaymentNoDate");

  return `
    <article class="card ${complete ? "is-complete" : ""}" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 18px; position: relative;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <div>
          <h2 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0;">${escapeHtml(plan.title)}</h2>
          <span style="font-size: 11.5px; font-weight: 600; color: ${complete ? 'var(--income)' : 'var(--gold)'}; background: ${complete ? 'rgba(52, 211, 153, 0.12)' : 'rgba(245, 200, 66, 0.12)'}; padding: 2px 8px; border-radius: 999px;">
            ${complete ? t("downPaymentComplete") : t("downPaymentRemaining", { amount: money(remaining) })}
          </span>
        </div>
        <button class="payment-delete" data-delete-plan="${plan.id}" aria-label="${t("deleteThis")}" style="background: transparent; border: none; color: var(--text-muted); font-size: 20px; line-height: 1; cursor: pointer; padding: 2px 6px;">×</button>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
        <span style="font-size: 18px; font-weight: 900; color: var(--text-primary);">${money(plan.paidAmount)}</span>
        <span style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">/ ${money(plan.totalAmount)}</span>
      </div>

      <!-- Progress bar -->
      <div style="width: 100%; height: 6px; background: var(--surface); border-radius: 3px; overflow: hidden; margin-bottom: 10px;">
        <div style="width: ${percentage}%; height: 100%; background: linear-gradient(90deg, var(--gold), var(--amber)); border-radius: 3px; transition: width 0.4s ease;"></div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: var(--text-secondary); margin-bottom: ${complete ? '0' : '14px'};">
        <span>${t("downPaymentPaid")} ${percentage.toFixed(0)}%</span>
        <span>${complete ? `✓ ${t("downPaymentComplete")}` : t("downPaymentReminder", { date: due })}</span>
      </div>

      ${complete ? "" : `<button class="payment-add-btn btn-primary" data-add-payment="${plan.id}" data-remaining="${remaining}" style="width: 100%; padding: 10px; font-size: 13px; font-weight: 700; border-radius: var(--radius); background: var(--surface); color: var(--gold); border: 1px solid var(--border); cursor: pointer; transition: all var(--transition);">${t("downPaymentAddPayment")}</button>`}
    </article>
  `;
}

function emptyState() {
  return `
    <div style="text-align: center; padding: 48px 20px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-xl);">
      <div style="font-size: 36px; margin-bottom: 12px;">🧾</div>
      <h3 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${t("downPaymentEmpty")}</h3>
      <p style="font-size: 12px; color: var(--text-secondary);">${t("downPaymentEmptyHint")}</p>
    </div>
  `;
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
  modal.innerHTML = `
    <div class="modal-dialog down-payment-modal" style="background: var(--card-solid); border: 1px solid var(--border); border-radius: 20px; padding: 24px; max-width: 360px; width: 90%;">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
        <h3 style="font-size: 17px; font-weight: 800; color: var(--text-primary); margin: 0;">${t("downPaymentAddTitle")}</h3>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-muted); font-size: 24px; cursor: pointer;">×</button>
      </div>
      <form id="down-payment-form" style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">${t("downPaymentItemName")}</label>
          <input class="form-control" name="title" required placeholder="${t("downPaymentItemPlaceholder")}" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" />
        </div>
        <div>
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">${t("downPaymentTotal")}</label>
          <input class="form-control" name="total" required type="number" min="0.01" step="0.01" placeholder="12000" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" />
        </div>
        <div>
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">${t("downPaymentPaidAlready")}</label>
          <input class="form-control" name="paid" required type="number" min="0" step="0.01" value="0" placeholder="6000" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" />
        </div>
        <div>
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">${t("downPaymentDueDate")}</label>
          <input class="form-control" name="due" type="date" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" />
        </div>
        <button class="btn-primary" type="submit" style="margin-top: 6px; padding: 14px; background: linear-gradient(135deg, var(--gold), var(--amber)); color: #000; font-weight: 800; border: none; border-radius: var(--radius); cursor: pointer;">${t("save")}</button>
      </form>
    </div>
  `;
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
