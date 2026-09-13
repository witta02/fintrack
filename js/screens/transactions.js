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

// Wallet filter — defaults to primary wallet
let selectedWalletId = null; // null = use primary, 'all' = all wallets

// Multi-select state
let isSelectMode = false;
let selectedIds = new Set();

// Track transactions with dates for calendar dots
let txDateSet = new Set(); // "YYYY-M-D" strings

export function renderTransactions(container, params) {
  selectedCategoryFilter = params?.category || "all";
  searchQuery = "";
  activeFilterType = params?.type || "all";
  isSelectMode = false;
  selectedIds = new Set();

  // Default: primary wallet
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

      <!-- Date Period Filter -->
      <div style="margin-bottom: 12px;">
        <!-- Period Mode Tabs + Today + Clear -->
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
          <div style="display: flex; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; flex: 1;">
            <button class="period-tab ${datePeriodMode === 'day' ? 'active' : ''}" data-period="day" style="flex: 1; padding: 8px 4px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; background: ${datePeriodMode === 'day' ? 'var(--gold)' : 'transparent'}; color: ${datePeriodMode === 'day' ? '#000' : 'var(--text-secondary)'}; transition: all 130ms ease;">${t("filterByDay")}</button>
            <button class="period-tab ${datePeriodMode === 'month' ? 'active' : ''}" data-period="month" style="flex: 1; padding: 8px 4px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; background: ${datePeriodMode === 'month' ? 'var(--gold)' : 'transparent'}; color: ${datePeriodMode === 'month' ? '#000' : 'var(--text-secondary)'}; transition: all 130ms ease;">${t("filterByMonth")}</button>
            <button class="period-tab ${datePeriodMode === 'year' ? 'active' : ''}" data-period="year" style="flex: 1; padding: 8px 4px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; background: ${datePeriodMode === 'year' ? 'var(--gold)' : 'transparent'}; color: ${datePeriodMode === 'year' ? '#000' : 'var(--text-secondary)'}; transition: all 130ms ease;">${t("filterByYear")}</button>
          </div>
          <button id="today-btn" style="padding: 8px 12px; font-size: 12px; font-weight: 700; border-radius: var(--radius); border: 1px solid var(--gold); background: var(--gold-soft); color: var(--gold); cursor: pointer; white-space: nowrap; transition: all 130ms ease;">${t("filterToday")}</button>
          <button id="clear-date-btn" style="padding: 8px 12px; font-size: 12px; font-weight: 700; border-radius: var(--radius); border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); cursor: pointer; white-space: nowrap; transition: all 130ms ease; ${(selectedYear == null) ? 'opacity: 0.4;' : ''}">${t("filterClear")}</button>
        </div>
        <!-- Calendar / Month Picker / Year Picker -->
        <div id="date-picker-panel"></div>
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

// ─── Render the date picker panel (calendar / month / year) ───────────────
function renderDatePanel(container) {
  const panel = container.querySelector("#date-picker-panel");
  if (!panel) return;

  if (datePeriodMode === "day") {
    panel.innerHTML = buildCalendarHTML(calendarDisplayYear, calendarDisplayMonth);
    attachCalendarEvents(container, panel);
  } else if (datePeriodMode === "month") {
    panel.innerHTML = buildMonthPickerHTML(calendarDisplayYear);
    attachMonthPickerEvents(container, panel);
  } else {
    panel.innerHTML = buildYearPickerHTML();
    attachYearPickerEvents(container, panel);
  }

  // Update clear button opacity
  const clearBtn = container.querySelector("#clear-date-btn");
  if (clearBtn) {
    clearBtn.style.opacity = (selectedYear == null) ? "0.4" : "1";
  }
}

// ─── Calendar (Day mode) ────────────────────────────────────────────────
function buildCalendarHTML(year, month) {
  const isEn = store.settings.language === "en";
  const locale = isEn ? "en-GB" : "th-TH";
  const thaiMonths = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  const monthName = isEn
    ? new Date(year, month, 1).toLocaleDateString("en-GB", { month: "long" })
    : thaiMonths[month];
  const dayHeaders = isEn
    ? ["Mo","Tu","We","Th","Fr","Sa","Su"]
    : ["จ","อ","พ","พฤ","ศ","ส","อา"];

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  // Shift so Monday = 0
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let cells = "";
  // Prev month filler
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = 0; i < startOffset; i++) {
    cells += `<div class="cal-day other-month">${prevMonthDays - startOffset + 1 + i}</div>`;
  }
  // Current month days
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
  // Next month filler
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  let next = 1;
  for (let i = startOffset + daysInMonth; i < totalCells; i++, next++) {
    cells += `<div class="cal-day other-month">${next}</div>`;
  }

  return `
    <div class="cal-container">
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
        // Toggle off
        selectedYear = null; selectedMonth = null; selectedDay = null;
      } else {
        selectedYear = y; selectedMonth = m; selectedDay = d;
        calendarDisplayYear = y; calendarDisplayMonth = m;
      }
      renderDatePanel(container);
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
    <div class="cal-container">
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
      updateUI(container);
    });
  });
}

// ─── Year Picker ─────────────────────────────────────────────────────────
function buildYearPickerHTML() {
  const currentYear = new Date().getFullYear();
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
    <div class="cal-container">
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

  // Period mode tabs
  container.querySelectorAll(".period-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const period = tab.dataset.period;
      if (datePeriodMode === period) return;
      datePeriodMode = period;
      selectedYear = null; selectedMonth = null; selectedDay = null;
      const now = new Date();
      calendarDisplayYear = now.getFullYear();
      calendarDisplayMonth = now.getMonth();
      // Update tab styles
      container.querySelectorAll(".period-tab").forEach(t => {
        const isActive = t.dataset.period === period;
        t.style.background = isActive ? "var(--gold)" : "transparent";
        t.style.color = isActive ? "#000" : "var(--text-secondary)";
      });
      renderDatePanel(container);
      updateUI(container);
    });
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
    // Sync period tab styles
    container.querySelectorAll(".period-tab").forEach(tab => {
      const isActive = tab.dataset.period === "day";
      tab.style.background = isActive ? "var(--gold)" : "transparent";
      tab.style.color = isActive ? "#000" : "var(--text-secondary)";
    });
    renderDatePanel(container);
    updateUI(container);
  });

  // Clear date filter
  container.querySelector("#clear-date-btn")?.addEventListener("click", () => {
    selectedYear = null; selectedMonth = null; selectedDay = null;
    renderDatePanel(container);
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
    const key = d.toDateString();
    if (!groups[key]) {
      groups[key] = {
        dateObj: d,
        display: d.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short", year: datePeriodMode === "year" ? "numeric" : undefined }),
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
