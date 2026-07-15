import { store } from "../store.js";
import {
  getCategoryInfo,
  expenseCategories,
  incomeCategories,
} from "../categories.js";
import { alerts } from "../utils/alertHelper.js";
import { t, locale } from "../i18n.js";

export function renderRecurring(container) {
  container.innerHTML = `
    <div class="screen-header">
      <h1 class="brand-title">${t("recurringTitle")}</h1>
      <button id="add-recurring-btn" class="icon-btn icon-btn-primary" title="${t("navAdd")}" style="transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 12px var(--gold-glow);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>

    <div class="info-card" style="margin-bottom: 20px; background: linear-gradient(135deg, rgba(124, 92, 252, 0.15) 0%, rgba(124, 92, 252, 0.05) 100%); border: 1px solid rgba(124, 92, 252, 0.3); border-radius: 16px; padding: 18px; box-shadow: 0 8px 32px rgba(124, 92, 252, 0.05); backdrop-filter: blur(10px); transition: transform 0.3s ease;">
      <div style="display: flex; gap: 14px; align-items: flex-start;">
        <div style="color: var(--violet); background: var(--violet-soft); padding: 10px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 0 1px var(--violet-glow);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: pulse 2.5s infinite;"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
        </div>
        <div style="flex: 1;">
          <h4 style="margin: 0 0 6px 0; font-weight: 700; font-size: 15px; color: var(--text-primary); letter-spacing: -0.2px;">${t("recurringSubtitle")}</h4>
          <p style="margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.5;">${t("recurringSubtitleDesc")}</p>
        </div>
      </div>
    </div>

    <style>
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
      }
      .recurring-list-container {
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding-bottom: 20px;
      }
      .hover-lift:hover {
        transform: translateY(-3px) scale(1.01);
        box-shadow: 0 14px 28px rgba(0,0,0,0.06);
      }
      .delete-btn-reveal {
        opacity: 0.5;
        transition: opacity 0.2s, transform 0.2s, color 0.2s;
      }
      .hover-lift:hover .delete-btn-reveal {
        opacity: 1;
      }
      .delete-btn-reveal:hover {
        color: var(--expense);
        transform: scale(1.15);
      }
    </style>

    <div id="recurring-rules-list" class="recurring-list-container">
      <!-- Dynamic list -->
    </div>

  `;

  // Bind Listeners
  setupEventListeners(container);

  // Initial update
  updateUI(container);

  // Subscribe to changes
  const unsubscribe = store.subscribe(() => {
    if (document.getElementById("recurring-rules-list")) {
      updateUI(container);
    } else {
      unsubscribe();
    }
  });
}

function setupEventListeners(container) {
  container
    .querySelector("#add-recurring-btn")
    .addEventListener("click", () => {
      showAddRecurringModal();
    });
}

function updateUI(container) {
  const symbol = store.getCurrencySymbol();
  const listContainer = container.querySelector("#recurring-rules-list");
  listContainer.innerHTML = "";

  const rules = store.getAllRecurringRules();

  if (rules.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state" style="padding: 48px 20px; text-align: center; background: var(--surface); border-radius: 20px; border: 1px solid var(--border); backdrop-filter: blur(12px); box-shadow: 0 10px 30px rgba(0,0,0,0.02);">
        <div class="empty-icon" style="background: var(--gold-soft); color: var(--gold); margin: 0 auto 20px auto; width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; border-radius: 24px; box-shadow: inset 0 0 0 1px var(--gold-glow);">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.9;"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
        </div>
        <p class="empty-text" style="font-weight: 500; font-size: 15px; color: var(--text-secondary); margin-bottom: 24px;">${t("recurringEmptyState")}</p>
        <button id="add-first-recurring-btn" class="btn btn-primary" style="font-size: 14px; font-weight: 600; padding: 14px 28px; border-radius: 14px; box-shadow: 0 4px 16px var(--gold-glow); transition: transform 0.2s, box-shadow 0.2s;">
          ${t("recurringAddFirst")}
        </button>
      </div>
    `;
    const btn = listContainer.querySelector("#add-first-recurring-btn");
    btn.onmouseenter = () => { btn.style.transform = 'translateY(-2px)'; btn.style.boxShadow = '0 6px 20px var(--gold-glow)'; };
    btn.onmouseleave = () => { btn.style.transform = 'none'; btn.style.boxShadow = '0 4px 16px var(--gold-glow)'; };
    btn.addEventListener("click", showAddRecurringModal);
    return;
  }

  rules.forEach((rule) => {
    const cat = getCategoryInfo(rule.category);
    const amountVal = store.toDisplay(rule.amount);
    const dateStr = new Date(rule.nextDueDate).toLocaleDateString(locale(), {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    let frequencyText = "";
    if (rule.type === "monthly") frequencyText = t("freqMonthly");
    else if (rule.type === "yearly") frequencyText = t("freqYearly");
    else if (rule.type === "custom")
      frequencyText = t("freqCustom", { days: rule.customDays });

    const card = document.createElement("div");
    card.className = `recurring-card hover-lift ${!rule.isActive ? "inactive" : ""}`;
    card.style.cssText = `
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 16px 18px;
      position: relative;
      overflow: hidden;
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
      opacity: ${rule.isActive ? "1" : "0.55"};
      backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      gap: 16px;
    `;

    card.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div class="cat-icon" style="background: ${cat.color}15; color: ${cat.color}; box-shadow: inset 0 0 0 1px ${cat.color}25; width: 44px; height: 44px; border-radius: 14px; font-size: 20px; display: flex; align-items: center; justify-content: center;">
            <span style="display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;">${cat.svg}</span>
          </div>
          <div>
            <h4 style="margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary); letter-spacing: -0.3px;">${escapeHTML(rule.title)}</h4>
            <span style="font-size: 12px; color: ${cat.color}; font-weight: 500; display: inline-block; margin-top: 2px;">${cat.label}</span>
          </div>
        </div>
        <label class="switch-toggle" style="cursor: pointer;">
          <input type="checkbox" class="toggle-status-chk" ${rule.isActive ? "checked" : ""} style="display: none;" />
          <span class="switch-slider" style="width: 40px; height: 22px; border-radius: 11px; background: ${rule.isActive ? 'var(--gold)' : 'var(--border-strong)'}; display: inline-block; position: relative; transition: background 0.3s ease;">
            <span style="position: absolute; width: 18px; height: 18px; border-radius: 50%; background: white; top: 2px; left: ${rule.isActive ? '20px' : '2px'}; transition: left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></span>
          </span>
        </label>
      </div>
      <div style="display: flex; align-items: flex-end; justify-content: space-between; border-top: 1px dashed var(--border-strong); padding-top: 12px;">
        <div>
          <div style="font-size: 11.5px; color: var(--text-secondary); margin-bottom: 4px; font-weight: 500;">${t("recurringNextDue")}</div>
          <div style="font-size: 12.5px; color: var(--text-primary); font-weight: 600; display: flex; align-items: center; gap: 6px; background: var(--bg-secondary); padding: 4px 10px; border-radius: 8px; border: 1px solid var(--border);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted)"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
            ${dateStr} <span style="color: var(--text-muted); font-weight: 500;">(${frequencyText})</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="font-size: 17px; font-weight: 700; color: ${rule.isIncome ? "var(--income)" : "var(--expense)"}; letter-spacing: -0.5px;">
            ${rule.isIncome ? "+" : "-"}${symbol}${amountVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <button class="rule-delete-btn delete-btn-reveal" title="Delete" style="background: transparent; border: none; cursor: pointer; padding: 4px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;

    // Listen status change toggle
    const toggleChk = card.querySelector(".toggle-status-chk");
    const slider = card.querySelector(".switch-slider");
    const knob = slider.querySelector("span");
    
    // Quick animation for switch manually to avoid relying on external CSS
    toggleChk.addEventListener("change", (e) => {
      const active = e.target.checked;
      slider.style.background = active ? 'var(--gold)' : 'var(--border-strong)';
      knob.style.left = active ? '20px' : '2px';
      store.toggleRecurringRule(rule.id);
    });

    // Listen delete button click
    card
      .querySelector(".rule-delete-btn")
      .addEventListener("click", async () => {
        const isConfirmed = await alerts.confirmDelete(
          t("deleteRecurringPrompt"),
          t("deleteRecurringDesc")
        );
        if (isConfirmed) {
          store.deleteRecurringRule(rule.id);
        }
      });

    listContainer.appendChild(card);
  });
}

function showAddRecurringModal() {
  const overlay = document.getElementById("modal-overlay");
  if (!overlay) return;

  let ruleIsIncome = false;
  let ruleSelectedCategory = "Food";

  overlay.innerHTML = `
    <div class="modal-dialog" style="background: var(--card-solid); border: 1px solid var(--border); box-shadow: 0 24px 60px rgba(0,0,0,0.15); border-radius: 24px; padding: 24px; max-width: 400px; width: 90%; transform: scale(0.95); opacity: 0; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
      <div class="modal-header" style="margin-bottom: 24px; border-bottom: none; display: flex; justify-content: space-between; align-items: center;">
        <h3 class="modal-title" style="margin: 0; font-size: 18px; font-weight: 700; color: var(--text-primary); letter-spacing: -0.5px;">${t("recurringNewTitle")}</h3>
        <button id="modal-close" class="modal-close-btn" style="background: var(--bg-secondary); border: none; width: 32px; height: 32px; border-radius: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); transition: background 0.2s, color 0.2s;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <form id="recurring-modal-form" style="display: flex; flex-direction: column; gap: 16px;">
        <!-- Type Switcher -->
        <div class="form-group" style="margin: 0;">
          <div class="type-switcher" style="background: var(--bg-secondary); padding: 4px; border-radius: 14px; display: flex; position: relative;">
            <div id="modal-switch-bg" style="position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc(50% - 4px); background: var(--card-solid); border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); transition: left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);"></div>
            <button type="button" class="type-btn expense-btn active" id="modal-switch-expense" style="flex: 1; position: relative; z-index: 1; padding: 10px; border: none; background: transparent; font-weight: 600; font-size: 14px; cursor: pointer; border-radius: 10px; color: var(--expense); transition: color 0.3s;">${t("expense")}</button>
            <button type="button" class="type-btn income-btn" id="modal-switch-income" style="flex: 1; position: relative; z-index: 1; padding: 10px; border: none; background: transparent; font-weight: 600; font-size: 14px; cursor: pointer; border-radius: 10px; color: var(--text-secondary); transition: color 0.3s;">${t("income")}</button>
          </div>
        </div>

        <!-- Amount -->
        <div class="form-group" style="margin: 0;">
          <label class="form-label" style="font-size: 12px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; display: block;">${t("amount")} (${store.getCurrencySymbol()})</label>
          <input type="number" step="0.01" id="modal-amount" placeholder="0.00" required class="form-control" style="font-size: 22px; font-weight: 700; text-align: center; padding: 14px; border-radius: 16px; background: var(--input-bg); border: 1px solid var(--border); color: var(--text-primary); transition: border-color 0.2s;" />
        </div>

        <!-- Title -->
        <div class="form-group" style="margin: 0;">
          <label class="form-label" style="font-size: 12px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; display: block;">${t("title")}</label>
          <input type="text" id="modal-title" required class="form-control" style="padding: 12px; border-radius: 12px; background: var(--input-bg); border: 1px solid var(--border); color: var(--text-primary);" />
        </div>

        <div style="display: flex; gap: 12px;">
          <!-- Frequency type -->
          <div class="form-group" style="flex: 1; margin: 0;">
            <label class="form-label" style="font-size: 12px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; display: block;">${t("recurringFreq")}</label>
            <select id="modal-freq-type" class="form-control" style="padding: 12px; border-radius: 12px; background: var(--input-bg); border: 1px solid var(--border); color: var(--text-primary); cursor: pointer;">
              <option value="monthly">${t("freqMonthly")}</option>
              <option value="yearly">${t("freqYearly")}</option>
              <option value="custom">${t("freqCustomOption")}</option>
            </select>
          </div>

          <!-- Custom Days (hidden by default) -->
          <div class="form-group hidden" id="modal-custom-days-wrapper" style="flex: 1; margin: 0;">
            <label class="form-label" style="font-size: 12px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; display: block;">${t("recurringRepeatEvery")}</label>
            <input type="number" id="modal-custom-days" value="30" min="1" class="form-control" style="padding: 12px; border-radius: 12px; background: var(--input-bg); border: 1px solid var(--border); color: var(--text-primary);" />
          </div>
        </div>

        <!-- Next Due Date -->
        <div class="form-group" style="margin: 0;">
          <label class="form-label" style="font-size: 12px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; display: block;">${t("recurringFirstDate")}</label>
          <input type="date" id="modal-due-date" required class="form-control" style="padding: 12px; border-radius: 12px; background: var(--input-bg); border: 1px solid var(--border); color: var(--text-primary);" />
        </div>

        <!-- Category Grid Selector -->
        <div class="form-group" style="margin: 0;">
          <label class="form-label" style="font-size: 12px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; display: block;">${t("category")}</label>
          <div id="modal-category-picker-container" class="category-grid-selector" style="grid-template-columns: repeat(4, 1fr); gap: 8px; max-height: 160px; overflow-y: auto; padding: 4px; scrollbar-width: thin; display: grid;">
            <!-- Categories rendered dynamically -->
          </div>
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 14px; margin-top: 8px; font-size: 15px; font-weight: 600; border-radius: 14px; box-shadow: 0 4px 16px var(--gold-glow); transition: transform 0.2s, box-shadow 0.2s;">${t("recurringConfirm")}</button>
      </form>
    </div>
  `;

  // Prefill today's date
  const today = new Date();
  const pad = (num) => String(num).padStart(2, "0");
  overlay.querySelector("#modal-due-date").value =
    `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  // Category Picker Rendering helper inside Modal
  function renderModalCategoryPicker() {
    const listContainer = overlay.querySelector(
      "#modal-category-picker-container",
    );
    listContainer.innerHTML = "";
    const list = ruleIsIncome ? incomeCategories : expenseCategories;

    if (!list.some((c) => c.name === ruleSelectedCategory)) {
      ruleSelectedCategory = list[0].name;
    }

    list.forEach((cat) => {
      const info = getCategoryInfo(cat.name);
      const isSelected = cat.name === ruleSelectedCategory;

      const item = document.createElement("div");
      item.className = `category-picker-item ${isSelected ? "selected" : ""}`;
      item.style.cssText = `
        padding: 10px 4px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        border-radius: 12px;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.2s;
        background: ${isSelected ? info.color + '15' : 'transparent'};
        border-color: ${isSelected ? info.color + '40' : 'transparent'};
      `;

      item.innerHTML = `
        <div class="category-picker-icon" style="font-size: 20px; color: ${isSelected ? info.color : 'var(--text-secondary)'}; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: ${isSelected ? info.color + '20' : 'var(--bg-secondary)'}; border-radius: 10px; transition: all 0.2s;">
          <span style="display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;">${info.svg}</span>
        </div>
        <div class="category-picker-label" style="font-size: 10.5px; font-weight: ${isSelected ? '600' : '500'}; color: ${isSelected ? info.color : 'var(--text-secondary)'}; text-align: center; line-height: 1.1;">${info.label}</div>
      `;

      item.onmouseenter = () => { if(!isSelected) item.style.background = 'var(--surface-hover)'; };
      item.onmouseleave = () => { if(!isSelected) item.style.background = 'transparent'; };

      item.addEventListener("click", () => {
        ruleSelectedCategory = cat.name;
        renderModalCategoryPicker();
      });

      listContainer.appendChild(item);
    });
  }

  renderModalCategoryPicker();

  // Show Modal Overlay with animation
  overlay.classList.remove("hidden");
  // Trigger animation after slightly deferring
  setTimeout(() => {
    const dialog = overlay.querySelector(".modal-dialog");
    if(dialog) {
      dialog.style.opacity = "1";
      dialog.style.transform = "scale(1)";
    }
  }, 10);

  // Handle Close buttons
  const closeModal = () => {
    const dialog = overlay.querySelector(".modal-dialog");
    if(dialog) {
      dialog.style.opacity = "0";
      dialog.style.transform = "scale(0.95)";
    }
    setTimeout(() => {
      overlay.classList.add("hidden");
      overlay.innerHTML = "";
    }, 300); // match transition duration
  };

  const closeBtn = overlay.querySelector("#modal-close");
  closeBtn.onmouseenter = () => { closeBtn.style.background = 'var(--border)'; closeBtn.style.color = 'var(--text-primary)'; };
  closeBtn.onmouseleave = () => { closeBtn.style.background = 'var(--bg-secondary)'; closeBtn.style.color = 'var(--text-secondary)'; };
  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  // Switch Expense / Income
  const expBtn = overlay.querySelector("#modal-switch-expense");
  const incBtn = overlay.querySelector("#modal-switch-income");
  const switchBg = overlay.querySelector("#modal-switch-bg");

  expBtn.addEventListener("click", () => {
    ruleIsIncome = false;
    switchBg.style.left = "4px";
    expBtn.style.color = "var(--expense)";
    incBtn.style.color = "var(--text-secondary)";
    ruleSelectedCategory = "Food";
    renderModalCategoryPicker();
  });

  incBtn.addEventListener("click", () => {
    ruleIsIncome = true;
    switchBg.style.left = "calc(50% + 2px)";
    incBtn.style.color = "var(--income)";
    expBtn.style.color = "var(--text-secondary)";
    ruleSelectedCategory = "Salary";
    renderModalCategoryPicker();
  });

  // Custom Days toggle depending on type select
  const freqSelect = overlay.querySelector("#modal-freq-type");
  const customDaysWrap = overlay.querySelector("#modal-custom-days-wrapper");
  freqSelect.addEventListener("change", (e) => {
    if (e.target.value === "custom") {
      customDaysWrap.classList.remove("hidden");
    } else {
      customDaysWrap.classList.add("hidden");
    }
  });

  // Hover styles for submit
  const submitBtn = overlay.querySelector("button[type='submit']");
  submitBtn.onmouseenter = () => { submitBtn.style.transform = 'translateY(-2px)'; submitBtn.style.boxShadow = '0 6px 20px var(--gold-glow)'; };
  submitBtn.onmouseleave = () => { submitBtn.style.transform = 'none'; submitBtn.style.boxShadow = '0 4px 16px var(--gold-glow)'; };

  // Handle Form submit
  overlay
    .querySelector("#recurring-modal-form")
    .addEventListener("submit", (e) => {
      e.preventDefault();

      const amountVal = parseFloat(
        overlay.querySelector("#modal-amount").value,
      );
      const titleVal = overlay.querySelector("#modal-title").value;
      const typeVal = freqSelect.value;
      const customDaysVal =
        parseInt(overlay.querySelector("#modal-custom-days").value) || 30;
      const dueDateVal = new Date(
        overlay.querySelector("#modal-due-date").value,
      );

      if (isNaN(amountVal) || amountVal <= 0) {
        alerts.warning(t("invalidAmount"));
        return;
      }

      // Convert display currency back to THB base currency
      const thbAmount =
        store.settings.selectedCurrency === "THB"
          ? amountVal
          : amountVal / store.toDisplay(1.0);

      store.addRecurringRule({
        title: titleVal,
        amount: thbAmount,
        isIncome: ruleIsIncome,
        category: ruleSelectedCategory,
        type: typeVal,
        customDays: customDaysVal,
        nextDueDate: dueDateVal,
      });

      closeModal();
    });
}

function escapeHTML(str) {
  return str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[tag] || tag,
  );
}
