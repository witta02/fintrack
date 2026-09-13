import { store } from "../store.js";
import { router } from "../router.js";
import { createTransactionTile } from "../components/transactionTile.js";
import {
  getExpenseCategories,
  getIncomeCategories,
  getCategoryInfo,
} from "../categories.js";
import { t } from "../i18n.js";
import { alerts } from "../utils/alertHelper.js";

let searchQuery = "";
let activeFilterType = "all"; // 'all', 'income', 'expense'
let selectedCategoryFilter = "all";

// Date filter state
let datePeriodMode = "day";   // 'day' | 'month' | 'year'
let selectedYear = null;
let selectedMonth = null;     // 0-11
let selectedDay = null;       // 1-31
let calendarDisplayYear = new Date().getFullYear();
let calendarDisplayMonth = new Date().getMonth();
let isDatePickerOpen = false; // Collapsed by default so it doesn't show all the time!

// Wallet filter — defaults to primary wallet (or 'all' if none)
let selectedWalletId = null;

// Multi-select state
let isSelectMode = false;
let selectedIds = new Set();

// Track transactions with dates for calendar dots
let txDateSet = new Set(); // "YYYY-M-D" strings

function getDateFilterLabel() {
  const isEn = store.settings.language === "en";
  if (selectedYear == null) {
    return isEn ? "All Dates (Filter ▾)" : "ทุกช่วงเวลา (เลือกวันที่ ▾)";
  }
  const thaiMonths = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  const enMonths = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const months = isEn ? enMonths : thaiMonths;

  if (datePeriodMode === "year") {
    return isEn ? `Year ${selectedYear}` : `ปี ${selectedYear}`;
  }
  if (datePeriodMode === "month") {
    return isEn ? `${months[selectedMonth]} ${selectedYear}` : `เดือน ${months[selectedMonth]} ${selectedYear}`;
  }
  // day
  return `${selectedDay} ${months[selectedMonth]} ${selectedYear}`;
}

function isFilteringToday() {
  const now = new Date();
  return datePeriodMode === "day" &&
         selectedYear === now.getFullYear() &&
         selectedMonth === now.getMonth() &&
         selectedDay === now.getDate();
}

export function renderTransactions(container, params) {
  selectedCategoryFilter = params?.category || "all";
  searchQuery = "";
  activeFilterType = params?.type || "all";
  isSelectMode = false;
  selectedIds = new Set();
  isDatePickerOpen = false; // Don't show calendar all the time

  // Default: primary wallet (if exists)
  const primaryWallet = store.getPrimaryWallet();
  selectedWalletId = primaryWallet ? primaryWallet.id : "all";

  // Reset date filter
  datePeriodMode = "day";
  selectedYear = null;
  selectedMonth = null;
  selectedDay = null;
  const now = new Date();
  calendarDisplayYear = now.getFullYear();
  calendarDisplayMonth = now.getMonth();

  const allCategories = [...getExpenseCategories(), ...getIncomeCategories()];
  const uniqueCategories = [];
  const map = new Map();
  for (const item of allCategories) {
    if (!map.has(item.name)) {
      map.set(item.name, true);
      uniqueCategories.push(item);
    }
  }

  const wallets = store.getWallets();
  const isEn = store.settings.language === "en";

  container.innerHTML = `
    <div class="screen screen-enter" style="padding: 0 16px 100px;">
      <!-- Normal Header -->
      <div id="normal-header" style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0 16px;">
        <h1 style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: var(--text-primary); margin: 0;">${t("transactionsTitle")}</h1>
        <div style="display: flex; gap: 8px;">
          <button id="select-mode-btn" class="icon-btn" title="${t("selectMode")}" style="width: 38px; height: 38px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--text-primary);">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          </button>
          <button id="export-btn" class="icon-btn" title="Export" style="width: 38px; height: 38px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--text-primary);">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button id="add-trans-btn" class="icon-btn" style="width: 38px; height: 38px; border-radius: var(--radius); background: var(--gold); border: none; display: flex; align-items: center; justify-content: center; color: #000; box-shadow: var(--btn-shadow);">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>

      <!-- Select Mode Toolbar (hidden by default) -->
      <div id="select-toolbar" class="select-toolbar" style="display: none;">
        <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
          <button id="cancel-select-btn" class="select-toolbar-btn cancel" title="${t("cancelSelect")}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            <span>${t("cancelSelect")}</span>
          </button>
          <span id="selected-count" class="select-toolbar-count">${t("selectedCount", { count: 0 })}</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="select-all-btn" class="select-toolbar-btn select-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 11l3 3L22 4"/></svg>
            <span id="select-all-label">${t("selectAll")}</span>
          </button>
          <button id="delete-selected-btn" class="select-toolbar-btn delete" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            <span>${t("deleteSelected")}</span>
          </button>
        </div>
      </div>

      <!-- Search Box -->
      <div style="margin-bottom: 12px; position: relative;">
        <div style="position: relative;">
          <svg style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="search-input" placeholder="${t("searchPlaceholder")}" value="${escapeHTML(searchQuery)}" style="padding-left: 42px; padding-right: 36px; border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border); width: 100%; height: 44px; font-size: 14px; color: var(--text-primary);" />
        </div>
      </div>

      <!-- Wallet + Category Filter Row -->
      <div style="margin-bottom: 12px; display: flex; gap: 8px;">
        <div style="flex: 1; min-width: 0;">
          <select id="wallet-filter-select" style="padding: 10px 14px; font-size: 13px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); width: 100%; font-weight: 700;">
            <option value="all" ${selectedWalletId === "all" ? "selected" : ""}>${t("allWallets")}</option>
            ${wallets.map(w => {
              const isPrimary = w.isDefault;
              const label = isPrimary ? `${w.name} (${t("filterPrimary")})` : w.name;
              return `<option value="${w.id}" ${selectedWalletId === w.id ? "selected" : ""}>${escapeHTML(label)}</option>`;
            }).join("")}
            <option value="none" ${selectedWalletId === "none" ? "selected" : ""}>${isEn ? 'Unassigned (No Wallet)' : 'ไม่ระบุกระเป๋า'}</option>
          </select>
        </div>
        <div style="flex: 1; min-width: 0;">
          <select id="category-filter-select" style="padding: 10px 14px; font-size: 13px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); width: 100%;">
            <option value="all">${t("allCategories")}</option>
            ${uniqueCategories.map(cat => `
              <option value="${cat.name}" ${selectedCategoryFilter === cat.name ? "selected" : ""}>
                ${getCategoryInfo(cat.name).label}
              </option>
            `).join("")}
          </select>
        </div>
      </div>

      <!-- Sleek Collapsible Date Filter Bar (Hidden by default!) -->
      <div style="margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <!-- Toggle Button -->
          <button id="date-picker-toggle-btn" style="flex: 1; min-width: 0; display: flex; align-items: center; justify-content: space-between; padding: 9px 14px; border-radius: var(--radius); background: var(--surface); border: 1px solid ${selectedYear != null ? 'var(--gold)' : 'var(--border)'}; color: ${selectedYear != null ? 'var(--gold)' : 'var(--text-primary)'}; font-size: 13px; font-weight: 700; cursor: pointer; transition: all var(--transition-fast);">
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0; overflow: hidden;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              <span id="date-filter-label" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${getDateFilterLabel()}</span>
            </div>
            <svg id="date-toggle-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; transition: transform 200ms ease; transform: ${isDatePickerOpen ? 'rotate(180deg)' : 'rotate(0deg)'};"><polyline points="6 9 12 15 18 9"/></svg>
          </button>

          <!-- Quick Today Button -->
          <button id="today-btn" style="padding: 9px 13px; font-size: 12.5px; font-weight: 700; border-radius: var(--radius); border: 1px solid ${isFilteringToday() ? 'var(--gold)' : 'var(--border)'}; background: ${isFilteringToday() ? 'var(--gold)' : 'var(--surface)'}; color: ${isFilteringToday() ? '#000' : 'var(--text-primary)'}; cursor: pointer; white-space: nowrap; transition: all var(--transition-fast);">
            ${t("filterToday")}
          </button>

          <!-- Clear Button (visible when filter active) -->
          <button id="clear-date-btn" title="${t("filterClear")}" style="width: 38px; height: 38px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); cursor: pointer; display: ${selectedYear != null ? 'flex' : 'none'}; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Collapsible Calendar / Month / Year Drawer -->
        <div id="date-picker-panel" style="display: ${isDatePickerOpen ? 'block' : 'none'};"></div>
      </div>

      <!-- Type Switcher Tabs -->
      <div class="add-tx-type-tabs" style="margin-bottom: 14px;">
        <button class="add-tx-tab ${activeFilterType === "all" ? "active" : ""}" data-type="all">${t("dashboardAll")}</button>
        <button class="add-tx-tab ${activeFilterType === "income" ? "active income" : ""}" data-type="income">${t("income")}</button>
        <button class="add-tx-tab ${activeFilterType === "expense" ? "active expense" : ""}" data-type="expense">${t("expense")}</button>
      </div>

      <!-- Total Summary -->
      <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; padding: 0 4px;">
        <div style="font-size: 16px; font-weight: 900; font-family: var(--font-heading); color: var(--text-primary);">
          <span style="font-size: 13px; color: var(--text-secondary); font-weight: 700;">${isEn ? 'Total:' : 'ยอดรวม:'} </span>
          <span id="transactions-total-sum">${store.getCurrencySymbol()}0.00</span>
        </div>
        <div style="font-size: 11.5px; font-weight: 600; color: var(--text-secondary);" id="results-count">
          ${t("foundItems", { count: 0 })}
        </div>
      </div>

      <div id="transactions-full-list">
        <!-- Dynamic list -->
      </div>
    </div>
  `;

  buildTxDateSet();
  renderDatePanel(container);
  setupEventListeners(container);
  updateUI(container);

  const unsubscribe = store.subscribe(() => {
    if (document.getElementById("transactions-full-list")) {
      buildTxDateSet();
      renderDatePanel(container);
      updateUI(container);
    } else {
      unsubscribe();
    }
  });
}

// ─── Build set of dates that have transactions ────────────────────────────
function buildTxDateSet() {
  txDateSet.clear();
  store.getAllTransactions(selectedWalletId === "all" ? null : selectedWalletId).forEach(tx => {
    const d = new Date(tx.date);
    if (!isNaN(d.getTime())) {
      txDateSet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
  });
}

// ─── Update the Trigger Button (Label, Gold highlight, Chevron, Clear btn) ─
function updateDateTriggerUI(container) {
  const labelEl = container.querySelector("#date-filter-label");
  const toggleBtn = container.querySelector("#date-picker-toggle-btn");
  const chevron = container.querySelector("#date-toggle-chevron");
  const clearBtn = container.querySelector("#clear-date-btn");
  const todayBtn = container.querySelector("#today-btn");

  if (labelEl) labelEl.textContent = getDateFilterLabel();
  if (toggleBtn) {
    toggleBtn.style.borderColor = selectedYear != null ? "var(--gold)" : "var(--border)";
    toggleBtn.style.color = selectedYear != null ? "var(--gold)" : "var(--text-primary)";
  }
  if (chevron) {
    chevron.style.transform = isDatePickerOpen ? "rotate(180deg)" : "rotate(0deg)";
  }
  if (clearBtn) {
    clearBtn.style.display = selectedYear != null ? "flex" : "none";
  }
  if (todayBtn) {
    const isToday = isFilteringToday();
    todayBtn.style.border = `1px solid ${isToday ? "var(--gold)" : "var(--border)"}`;
    todayBtn.style.background = isToday ? "var(--gold)" : "var(--surface)";
    todayBtn.style.color = isToday ? "#000" : "var(--text-primary)";
  }
}

// ─── Render the date picker panel (calendar / month / year) ───────────────
function renderDatePanel(container) {
  const panel = container.querySelector("#date-picker-panel");
  if (!panel) return;

  panel.style.display = isDatePickerOpen ? "block" : "none";
  if (!isDatePickerOpen) return;

  const isEn = store.settings.language === "en";

  let bodyHtml = "";
  if (datePeriodMode === "day") {
    bodyHtml = buildCalendarHTML(calendarDisplayYear, calendarDisplayMonth);
  } else if (datePeriodMode === "month") {
    bodyHtml = buildMonthPickerHTML(calendarDisplayYear);
  } else {
    bodyHtml = buildYearPickerHTML();
  }

  panel.innerHTML = `
    <div class="cal-container" style="margin-top: 8px;">
      <!-- Panel Header: Period Mode Tabs + Done/Close -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 8px;">
        <div style="display: flex; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; flex: 1;">
          <button class="panel-period-tab ${datePeriodMode === 'day' ? 'active' : ''}" data-period="day" style="flex: 1; padding: 7px 4px; font-size: 11.5px; font-weight: 700; border: none; cursor: pointer; background: ${datePeriodMode === 'day' ? 'var(--gold)' : 'transparent'}; color: ${datePeriodMode === 'day' ? '#000' : 'var(--text-secondary)'}; transition: all 130ms ease;">${t("filterByDay")}</button>
          <button class="panel-period-tab ${datePeriodMode === 'month' ? 'active' : ''}" data-period="month" style="flex: 1; padding: 7px 4px; font-size: 11.5px; font-weight: 700; border: none; cursor: pointer; background: ${datePeriodMode === 'month' ? 'var(--gold)' : 'transparent'}; color: ${datePeriodMode === 'month' ? '#000' : 'var(--text-secondary)'}; transition: all 130ms ease;">${t("filterByMonth")}</button>
          <button class="panel-period-tab ${datePeriodMode === 'year' ? 'active' : ''}" data-period="year" style="flex: 1; padding: 7px 4px; font-size: 11.5px; font-weight: 700; border: none; cursor: pointer; background: ${datePeriodMode === 'year' ? 'var(--gold)' : 'transparent'}; color: ${datePeriodMode === 'year' ? '#000' : 'var(--text-secondary)'}; transition: all 130ms ease;">${t("filterByYear")}</button>
        </div>
        <button id="close-date-panel-btn" style="background: var(--card); border: 1px solid var(--border); color: var(--text-primary); border-radius: var(--radius); padding: 7px 12px; font-size: 11.5px; font-weight: 800; cursor: pointer; white-space: nowrap;">
          ${isEn ? 'Done ✕' : 'เสร็จสิ้น ✕'}
        </button>
      </div>

      <!-- Calendar / Month / Year Body -->
      <div id="picker-body-wrap">
        ${bodyHtml}
      </div>

      <!-- Panel Footer: Reset to All Time -->
      ${selectedYear != null ? `
        <div style="display: flex; justify-content: flex-end; margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border);">
          <button id="panel-clear-filter-btn" style="background: none; border: none; font-size: 11.5px; font-weight: 700; color: var(--expense); cursor: pointer; padding: 4px 8px; display: flex; align-items: center; gap: 4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            <span>${isEn ? 'Reset to All Dates' : 'แสดงทุกช่วงเวลา'}</span>
          </button>
        </div>
      ` : ''}
    </div>
  `;

  // Attach tab switch events inside panel
  panel.querySelectorAll(".panel-period-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      datePeriodMode = tab.dataset.period;
      selectedYear = null; selectedMonth = null; selectedDay = null;
      const now = new Date();
      calendarDisplayYear = now.getFullYear();
      calendarDisplayMonth = now.getMonth();
      renderDatePanel(container);
      updateDateTriggerUI(container);
      updateUI(container);
    });
  });

  // Attach close button
  panel.querySelector("#close-date-panel-btn")?.addEventListener("click", () => {
    isDatePickerOpen = false;
    renderDatePanel(container);
    updateDateTriggerUI(container);
  });

  // Attach reset filter button inside panel
  panel.querySelector("#panel-clear-filter-btn")?.addEventListener("click", () => {
    selectedYear = null; selectedMonth = null; selectedDay = null;
    renderDatePanel(container);
    updateDateTriggerUI(container);
    updateUI(container);
  });

  // Attach grid-specific navigation & cell events
  if (datePeriodMode === "day") {
    attachCalendarEvents(container, panel);
  } else if (datePeriodMode === "month") {
    attachMonthPickerEvents(container, panel);
  } else {
    attachYearPickerEvents(container, panel);
  }
}

// ─── Calendar (Day mode) ────────────────────────────────────────────────
function buildCalendarHTML(year, month) {
  const isEn = store.settings.language === "en";
  const thaiMonths = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  const monthName = isEn
    ? new Date(year, month, 1).toLocaleDateString("en-GB", { month: "long" })
    : thaiMonths[month];
  const dayHeaders = isEn
    ? ["Mo","Tu","We","Th","Fr","Sa","Su"]
    : ["จ","อ","พ","พฤ","ศ","ส","อา"];

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const startOffset = (firstDay + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let cells = "";
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = 0; i < startOffset; i++) {
    cells += `<div class="cal-day other-month">${prevMonthDays - startOffset + 1 + i}</div>`;
  }
  const today = new Date();
  for (let d = 1; d <= daysInMonth; d++) {
    const hasTx = txDateSet.has(`${year}-${month}-${d}`);
    const isSelected = selectedYear === year && selectedMonth === month && selectedDay === d;
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    cells += `<div class="cal-day${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}" data-year="${year}" data-month="${month}" data-day="${d}">
      ${d}
      ${hasTx ? '<span class="tx-dot"></span>' : ''}
    </div>`;
  }
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  let next = 1;
  for (let i = startOffset + daysInMonth; i < totalCells; i++, next++) {
    cells += `<div class="cal-day other-month">${next}</div>`;
  }

  return `
    <div>
      <div class="cal-header">
        <button class="cal-nav" id="cal-prev">&#8249;</button>
        <span class="cal-title">${monthName} ${year}</span>
        <button class="cal-nav" id="cal-next">&#8250;</button>
      </div>
      <div class="cal-grid">
        ${dayHeaders.map(h => `<div class="cal-weekday">${h}</div>`).join("")}
        ${cells}
      </div>
    </div>
  `;
}

function attachCalendarEvents(container, panel) {
  panel.querySelector("#cal-prev")?.addEventListener("click", () => {
    calendarDisplayMonth--;
    if (calendarDisplayMonth < 0) { calendarDisplayMonth = 11; calendarDisplayYear--; }
    renderDatePanel(container);
  });
  panel.querySelector("#cal-next")?.addEventListener("click", () => {
    calendarDisplayMonth++;
    if (calendarDisplayMonth > 11) { calendarDisplayMonth = 0; calendarDisplayYear++; }
    renderDatePanel(container);
  });
  panel.querySelectorAll(".cal-day[data-day]").forEach(el => {
    el.addEventListener("click", () => {
      const y = parseInt(el.dataset.year);
      const m = parseInt(el.dataset.month);
      const d = parseInt(el.dataset.day);
      if (selectedYear === y && selectedMonth === m && selectedDay === d) {
        selectedYear = null; selectedMonth = null; selectedDay = null;
      } else {
        selectedYear = y; selectedMonth = m; selectedDay = d;
        calendarDisplayYear = y; calendarDisplayMonth = m;
      }
      renderDatePanel(container);
      updateDateTriggerUI(container);
      updateUI(container);
    });
  });
}

// ─── Month Picker ────────────────────────────────────────────────────────
function buildMonthPickerHTML(year) {
  const isEn = store.settings.language === "en";
  const thaiMonths = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  const enMonths = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const months = isEn ? enMonths : thaiMonths;

  const cells = months.map((name, i) => {
    const hasTx = [...txDateSet].some(key => {
      const [ky, km] = key.split("-").map(Number);
      return ky === year && km === i;
    });
    const isSelected = selectedYear === year && selectedMonth === i && selectedDay == null;
    return `<div class="month-cell${isSelected ? ' selected' : ''}" data-year="${year}" data-month="${i}">
      ${name}
      ${hasTx ? '<span class="tx-dot"></span>' : ''}
    </div>`;
  }).join("");

  return `
    <div>
      <div class="cal-header">
        <button class="cal-nav" id="cal-prev">&#8249;</button>
        <span class="cal-title">${year}</span>
        <button class="cal-nav" id="cal-next">&#8250;</button>
      </div>
      <div class="month-grid">${cells}</div>
    </div>
  `;
}

function attachMonthPickerEvents(container, panel) {
  panel.querySelector("#cal-prev")?.addEventListener("click", () => {
    calendarDisplayYear--;
    renderDatePanel(container);
  });
  panel.querySelector("#cal-next")?.addEventListener("click", () => {
    calendarDisplayYear++;
    renderDatePanel(container);
  });
  panel.querySelectorAll(".month-cell").forEach(el => {
    el.addEventListener("click", () => {
      const y = parseInt(el.dataset.year);
      const m = parseInt(el.dataset.month);
      if (selectedYear === y && selectedMonth === m && selectedDay == null) {
        selectedYear = null; selectedMonth = null;
      } else {
        selectedYear = y; selectedMonth = m; selectedDay = null;
        calendarDisplayYear = y; calendarDisplayMonth = m;
      }
      renderDatePanel(container);
      updateDateTriggerUI(container);
      updateUI(container);
    });
  });
}

// ─── Year Picker ─────────────────────────────────────────────────────────
function buildYearPickerHTML() {
  const startYear = calendarDisplayYear - 4;
  const years = Array.from({ length: 9 }, (_, i) => startYear + i);

  const cells = years.map(y => {
    const hasTx = [...txDateSet].some(key => parseInt(key.split("-")[0]) === y);
    const isSelected = selectedYear === y && selectedMonth == null;
    return `<div class="year-cell${isSelected ? ' selected' : ''}" data-year="${y}">
      ${y}
      ${hasTx ? '<span class="tx-dot"></span>' : ''}
    </div>`;
  }).join("");

  return `
    <div>
      <div class="cal-header">
        <button class="cal-nav" id="cal-prev">&#8249;</button>
        <span class="cal-title">${startYear} – ${startYear + 8}</span>
        <button class="cal-nav" id="cal-next">&#8250;</button>
      </div>
      <div class="year-grid">${cells}</div>
    </div>
  `;
}

function attachYearPickerEvents(container, panel) {
  panel.querySelector("#cal-prev")?.addEventListener("click", () => {
    calendarDisplayYear -= 9;
    renderDatePanel(container);
  });
  panel.querySelector("#cal-next")?.addEventListener("click", () => {
    calendarDisplayYear += 9;
    renderDatePanel(container);
  });
  panel.querySelectorAll(".year-cell").forEach(el => {
    el.addEventListener("click", () => {
      const y = parseInt(el.dataset.year);
      if (selectedYear === y && selectedMonth == null) {
        selectedYear = null;
      } else {
        selectedYear = y; selectedMonth = null; selectedDay = null;
        calendarDisplayYear = y;
      }
      renderDatePanel(container);
      updateDateTriggerUI(container);
      updateUI(container);
    });
  });
}

// ─── Select mode helpers ──────────────────────────────────────────────────
function toggleSelectMode(container) {
  isSelectMode = !isSelectMode;
  selectedIds = new Set();
  const normalHeader = container.querySelector("#normal-header");
  const selectToolbar = container.querySelector("#select-toolbar");
  if (normalHeader) normalHeader.style.display = isSelectMode ? "none" : "flex";
  if (selectToolbar) selectToolbar.style.display = isSelectMode ? "flex" : "none";
  updateSelectToolbar(container);
  updateUI(container);
}

function updateSelectToolbar(container) {
  const countEl = container.querySelector("#selected-count");
  const deleteBtn = container.querySelector("#delete-selected-btn");
  const selectAllLabel = container.querySelector("#select-all-label");

  if (countEl) countEl.textContent = t("selectedCount", { count: selectedIds.size });
  if (deleteBtn) deleteBtn.disabled = selectedIds.size === 0;
  if (selectAllLabel) {
    const listContainer = container.querySelector("#transactions-full-list");
    const allTileIds = listContainer
      ? [...listContainer.querySelectorAll(".transaction-tile")].map(el => el.dataset.id)
      : [];
    const allSelected = allTileIds.length > 0 && allTileIds.every(id => selectedIds.has(id));
    selectAllLabel.textContent = allSelected ? t("deselectAll") : t("selectAll");
  }
}

// ─── Event listeners ──────────────────────────────────────────────────────
function setupEventListeners(container) {
  const searchInput = container.querySelector("#search-input");
  searchInput?.addEventListener("input", e => {
    searchQuery = e.target.value;
    updateUI(container);
  });

  // Wallet filter
  container.querySelector("#wallet-filter-select")?.addEventListener("change", e => {
    selectedWalletId = e.target.value;
    buildTxDateSet();
    renderDatePanel(container);
    updateUI(container);
  });

  // Category filter
  container.querySelector("#category-filter-select")?.addEventListener("change", e => {
    selectedCategoryFilter = e.target.value;
    updateUI(container);
  });

  // Date picker toggle button (open/close the collapsible drawer)
  container.querySelector("#date-picker-toggle-btn")?.addEventListener("click", () => {
    isDatePickerOpen = !isDatePickerOpen;
    renderDatePanel(container);
    updateDateTriggerUI(container);
  });

  // Today button
  container.querySelector("#today-btn")?.addEventListener("click", () => {
    const now = new Date();
    calendarDisplayYear = now.getFullYear();
    calendarDisplayMonth = now.getMonth();
    datePeriodMode = "day";
    selectedYear = now.getFullYear();
    selectedMonth = now.getMonth();
    selectedDay = now.getDate();
    renderDatePanel(container);
    updateDateTriggerUI(container);
    updateUI(container);
  });

  // Clear date filter
  container.querySelector("#clear-date-btn")?.addEventListener("click", () => {
    selectedYear = null; selectedMonth = null; selectedDay = null;
    renderDatePanel(container);
    updateDateTriggerUI(container);
    updateUI(container);
  });

  // Type tabs
  container.querySelectorAll(".add-tx-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      container.querySelectorAll(".add-tx-tab").forEach(t => t.classList.remove("active", "income", "expense"));
      const type = tab.getAttribute("data-type");
      activeFilterType = type;
      if (type === "income") tab.classList.add("active", "income");
      else if (type === "expense") tab.classList.add("active", "expense");
      else tab.classList.add("active");
      updateUI(container);
    });
  });

  container.querySelector("#add-trans-btn")?.addEventListener("click", () => router.navigate("addTransaction"));
  container.querySelector("#export-btn")?.addEventListener("click", () => router.navigate("export"));

  // Select mode
  container.querySelector("#select-mode-btn")?.addEventListener("click", () => toggleSelectMode(container));
  container.querySelector("#cancel-select-btn")?.addEventListener("click", () => toggleSelectMode(container));

  container.querySelector("#select-all-btn")?.addEventListener("click", () => {
    const listContainer = container.querySelector("#transactions-full-list");
    const allTileIds = listContainer
      ? [...listContainer.querySelectorAll(".transaction-tile")].map(el => el.dataset.id)
      : [];
    const allSelected = allTileIds.length > 0 && allTileIds.every(id => selectedIds.has(id));
    if (allSelected) selectedIds.clear();
    else allTileIds.forEach(id => selectedIds.add(id));
    updateSelectToolbar(container);
    updateUI(container);
  });

  container.querySelector("#delete-selected-btn")?.addEventListener("click", async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const isConfirmed = await alerts.confirmDelete(
      t("deleteSelectedConfirm", { count }),
      t("deleteSelectedHint"),
    );
    if (isConfirmed) {
      store.deleteTransactions([...selectedIds]);
      alerts.success(t("deleteSelectedSuccess", { count }));
      selectedIds.clear();
      isSelectMode = false;
      const normalHeader = container.querySelector("#normal-header");
      const selectToolbar = container.querySelector("#select-toolbar");
      if (normalHeader) normalHeader.style.display = "flex";
      if (selectToolbar) selectToolbar.style.display = "none";
      updateUI(container);
    }
  });
}

// ─── Update list ──────────────────────────────────────────────────────────
function updateUI(container) {
  const symbol = store.getCurrencySymbol();
  const listContainer = container.querySelector("#transactions-full-list");
  if (!listContainer) return;
  listContainer.innerHTML = "";

  // Wallet filter: pass walletId to getAllTransactions (or 'all')
  let list = store.getAllTransactions(selectedWalletId === "all" ? null : selectedWalletId);

  // Search
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(tx => tx.title.toLowerCase().includes(q));
  }

  // Income/expense type
  if (activeFilterType === "income") list = list.filter(tx => tx.isIncome);
  else if (activeFilterType === "expense") list = list.filter(tx => !tx.isIncome);

  // Category
  if (selectedCategoryFilter !== "all") {
    list = list.filter(tx => tx.category === selectedCategoryFilter);
  }

  // Date filter (day / month / year)
  if (selectedYear != null) {
    list = list.filter(tx => {
      const d = new Date(tx.date);
      if (isNaN(d.getTime())) return false;
      if (datePeriodMode === "year") return d.getFullYear() === selectedYear;
      if (datePeriodMode === "month") return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      // day
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth && d.getDate() === selectedDay;
    });
  }

  const resultsEl = container.querySelector("#results-count");
  if (resultsEl) resultsEl.textContent = t("foundItems", { count: list.length });

  const totalSum = list.reduce((sum, tx) => sum + (tx.isIncome ? Number(tx.amount) : -Number(tx.amount)), 0);
  const totalSumEl = container.querySelector("#transactions-total-sum");
  if (totalSumEl) {
    const formatted = Number(store.toDisplay(Math.abs(totalSum))).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    totalSumEl.textContent = `${totalSum < 0 ? "-" : totalSum > 0 ? "+" : ""}${symbol}${formatted}`;
    totalSumEl.style.color = totalSum < 0 ? "var(--expense)" : totalSum > 0 ? "var(--income)" : "var(--text-primary)";
  }

  if (list.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; padding: 48px 20px; color: var(--text-secondary);">
        <div style="width: 48px; height: 48px; margin: 0 auto 12px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <p style="font-size: 14px; font-weight: 600;">${t("noSearchResults")}</p>
      </div>
    `;
    return;
  }

  // Group by date
  const groups = {};
  const locale = store.settings.language === "en" ? "en-GB" : "th-TH";
  list.forEach(tx => {
    const d = new Date(tx.date);
    const key = isNaN(d.getTime()) ? "unknown" : d.toDateString();
    if (!groups[key]) {
      groups[key] = {
        dateObj: isNaN(d.getTime()) ? new Date(0) : d,
        display: isNaN(d.getTime()) ? (store.settings.language === 'en' ? 'Unknown Date' : 'ไม่ระบุวันที่') : d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short", year: datePeriodMode === "year" ? "numeric" : undefined }),
        txs: [],
      };
    }
    groups[key].txs.push(tx);
  });

  const sortedGroups = Object.values(groups).sort((a, b) => b.dateObj - a.dateObj);
  const formatAmount = num => Number(store.toDisplay(Math.abs(num))).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  sortedGroups.forEach(group => {
    let dailyIncome = 0;
    let dailyExpense = 0;
    group.txs.forEach(tx => {
      if (tx.isIncome) dailyIncome += Number(tx.amount);
      else dailyExpense += Number(tx.amount);
    });

    const groupHeader = document.createElement("div");
    groupHeader.className = "day-group-header";

    const groupTxIds = group.txs.map(tx => tx.id);
    const allGroupSelected = groupTxIds.every(id => selectedIds.has(id));

    if (isSelectMode) {
      groupHeader.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
          <div class="group-checkbox ${allGroupSelected ? "checked" : ""}" data-group-ids='${JSON.stringify(groupTxIds)}'>
            ${allGroupSelected ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>` : ""}
          </div>
          <span class="day-group-label">${group.display}</span>
        </div>
        <span class="day-group-total">
          ${dailyIncome > 0 ? `<span class="day-group-income">+${symbol}${formatAmount(dailyIncome)}</span>` : ""}
          ${dailyExpense > 0 ? `<span class="day-group-expense">-${symbol}${formatAmount(dailyExpense)}</span>` : ""}
        </span>
      `;
      const groupChk = groupHeader.querySelector(".group-checkbox");
      if (groupChk) {
        groupChk.addEventListener("click", e => {
          e.stopPropagation();
          const ids = JSON.parse(groupChk.dataset.groupIds);
          const allSelected = ids.every(id => selectedIds.has(id));
          if (allSelected) ids.forEach(id => selectedIds.delete(id));
          else ids.forEach(id => selectedIds.add(id));
          updateSelectToolbar(container);
          updateUI(container);
        });
      }
    } else {
      groupHeader.innerHTML = `
        <span class="day-group-label">${group.display}</span>
        <span class="day-group-total">
          ${dailyIncome > 0 ? `<span class="day-group-income">+${symbol}${formatAmount(dailyIncome)}</span>` : ""}
          ${dailyExpense > 0 ? `<span class="day-group-expense">-${symbol}${formatAmount(dailyExpense)}</span>` : ""}
        </span>
      `;
    }

    listContainer.appendChild(groupHeader);

    group.txs.forEach(tx => {
      const tile = createTransactionTile(
        tx,
        symbol,
        store.toDisplay(tx.amount).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        transaction => router.navigate("addTransaction", { transactionId: transaction.id }),
        async id => {
          const isConfirmed = await alerts.confirmDelete(
            store.settings.language === "en" ? "Delete Transaction?" : "ต้องการลบรายการใช่หรือไม่?",
            t("deleteConfirm"),
          );
          if (isConfirmed) store.deleteTransaction(id);
        },
        isSelectMode,
        selectedIds.has(tx.id),
        id => {
          if (selectedIds.has(id)) selectedIds.delete(id);
          else selectedIds.add(id);
          updateSelectToolbar(container);
          updateUI(container);
        },
      );
      listContainer.appendChild(tile);
    });
  });

  if (isSelectMode) updateSelectToolbar(container);
}

function escapeHTML(str) {
  return String(str).replace(/[&<>'"]/g, tag => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[tag] || tag);
}
