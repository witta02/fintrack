import { store } from "../store.js";
import { router } from "../router.js";
import flatpickr from "flatpickr";
import { Thai } from "flatpickr/dist/l10n/th.js";
import "flatpickr/dist/flatpickr.min.css";
import "flatpickr/dist/themes/dark.css";
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
let selectedDateFilter = null;

export function renderTransactions(container, params) {
  if (params?.category) {
    selectedCategoryFilter = params.category;
  }
  const allCategories = [...getExpenseCategories(), ...getIncomeCategories()];
  const uniqueCategories = [];
  const map = new Map();
  for (const item of allCategories) {
    if (!map.has(item.name)) {
      map.set(item.name, true);
      uniqueCategories.push(item);
    }
  }

  container.innerHTML = `
    <div class="screen screen-enter" style="padding: 0 16px 100px;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0 16px;">
        <h1 style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: var(--text-primary); margin: 0;">${t("transactionsTitle")}</h1>
        <div style="display: flex; gap: 8px;">
          <button id="export-btn" class="icon-btn" title="Export" style="width: 38px; height: 38px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--text-primary);">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button id="add-trans-btn" class="icon-btn" style="width: 38px; height: 38px; border-radius: var(--radius); background: var(--gold); border: none; display: flex; align-items: center; justify-content: center; color: #000; box-shadow: var(--btn-shadow);">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>

      <!-- Search Box -->
      <div style="margin-bottom: 14px; position: relative;">
        <div style="position: relative;">
          <svg style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="search-input" placeholder="${t("searchPlaceholder")}" value="${escapeHTML(searchQuery)}" style="padding-left: 42px; padding-right: 36px; border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--border); width: 100%; height: 44px; font-size: 14px; color: var(--text-primary);" />
          ${searchQuery ? '<button id="clear-search-btn" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: var(--border); color: var(--text-primary); border: none; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer;">&times;</button>' : ""}
        </div>
      </div>

      <!-- Filter Row -->
      <div style="margin-bottom: 14px; display: flex; gap: 8px;">
        <div style="flex: 1; min-width: 120px;">
          <select id="category-filter-select" style="padding: 10px 14px; font-size: 13px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); width: 100%;">
            <option value="all">${t("allCategories")}</option>
            ${uniqueCategories
              .map(
                (cat) => `
              <option value="${cat.name}" ${selectedCategoryFilter === cat.name ? "selected" : ""}>
                ${getCategoryInfo(cat.name).label}
              </option>
            `,
              )
              .join("")}
          </select>
        </div>
        <div style="flex: 1; min-width: 120px; position: relative;">
          <input type="text" id="date-filter-input" placeholder="${t("selectDate")}" style="padding: 10px 14px; font-size: 13px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); width: 100%;" />
          <button id="clear-date-btn" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: var(--border); color: var(--text-primary); border: none; border-radius: 50%; width: 20px; height: 20px; display: none; align-items: center; justify-content: center; cursor: pointer; z-index: 2;">&times;</button>
        </div>
      </div>

      <!-- Type Switcher Tabs -->
      <div class="add-tx-type-tabs" style="margin-bottom: 14px;">
        <button class="add-tx-tab ${activeFilterType === "all" ? "active" : ""}" data-type="all">${t("dashboardAll")}</button>
        <button class="add-tx-tab ${activeFilterType === "income" ? "active income" : ""}" data-type="income">${t("income")}</button>
        <button class="add-tx-tab ${activeFilterType === "expense" ? "active expense" : ""}" data-type="expense">${t("expense")}</button>
      </div>

      <!-- Total Summary Headline (Reference Style) -->
      <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; padding: 0 4px;">
        <div style="font-size: 16px; font-weight: 900; font-family: var(--font-heading); color: var(--text-primary);">
          <span style="font-size: 13px; color: var(--text-secondary); font-weight: 700;">${store.settings.language === 'en' ? 'Total:' : 'ยอดรวม:'} </span>
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

  setupEventListeners(container);
  updateUI(container);

  const unsubscribe = store.subscribe(() => {
    if (document.getElementById("transactions-full-list")) {
      updateUI(container);
    } else {
      unsubscribe();
    }
  });
}

function setupEventListeners(container) {
  const searchInput = container.querySelector("#search-input");
  searchInput?.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    updateUI(container);
  });

  const clearSearchBtn = container.querySelector("#clear-search-btn");
  clearSearchBtn?.addEventListener("click", () => {
    searchQuery = "";
    if (searchInput) searchInput.value = "";
    updateUI(container);
  });

  const select = container.querySelector("#category-filter-select");
  select?.addEventListener("change", (e) => {
    selectedCategoryFilter = e.target.value;
    updateUI(container);
  });

  const dateInput = container.querySelector("#date-filter-input");
  const clearDateBtn = container.querySelector("#clear-date-btn");

  if (dateInput) {
    const fp = flatpickr(dateInput, {
      dateFormat: "Y-m-d",
      disableMobile: true,
      locale: store.settings.language === "en" ? "en" : Thai,
      onChange: (selectedDates, dateStr) => {
        selectedDateFilter = dateStr || null;
        if (clearDateBtn) {
          clearDateBtn.style.display = selectedDateFilter ? "flex" : "none";
        }
        updateUI(container);
      },
    });

    clearDateBtn?.addEventListener("click", () => {
      fp.clear();
      selectedDateFilter = null;
      clearDateBtn.style.display = "none";
      updateUI(container);
    });
  }

  container.querySelectorAll(".add-tx-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      container.querySelectorAll(".add-tx-tab").forEach((t) => t.classList.remove("active", "income", "expense"));
      const type = tab.getAttribute("data-type");
      activeFilterType = type;
      if (type === "income") tab.classList.add("active", "income");
      else if (type === "expense") tab.classList.add("active", "expense");
      else tab.classList.add("active");
      updateUI(container);
    });
  });

  container.querySelector("#add-trans-btn")?.addEventListener("click", () => {
    router.navigate("addTransaction");
  });

  container.querySelector("#export-btn")?.addEventListener("click", () => {
    router.navigate("export");
  });
}

function updateUI(container) {
  const symbol = store.getCurrencySymbol();
  const listContainer = container.querySelector("#transactions-full-list");
  if (!listContainer) return;
  listContainer.innerHTML = "";

  let list = store.getAllTransactions();

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter((tx) => tx.title.toLowerCase().includes(q));
  }

  if (activeFilterType === "income") {
    list = list.filter((tx) => tx.isIncome);
  } else if (activeFilterType === "expense") {
    list = list.filter((tx) => !tx.isIncome);
  }

  if (selectedCategoryFilter !== "all") {
    list = list.filter((tx) => tx.category === selectedCategoryFilter);
  }

  if (selectedDateFilter) {
    list = list.filter((tx) => {
      const txDate = new Date(tx.date);
      const txDateString = txDate.getFullYear() + "-" + String(txDate.getMonth() + 1).padStart(2, '0') + "-" + String(txDate.getDate()).padStart(2, '0');
      return txDateString === selectedDateFilter;
    });
  }

  const resultsEl = container.querySelector("#results-count");
  if (resultsEl) {
    resultsEl.textContent = t("foundItems", { count: list.length });
  }

  const totalSum = list.reduce((sum, tx) => {
    return sum + (tx.isIncome ? Number(tx.amount) : -Number(tx.amount));
  }, 0);

  const totalSumEl = container.querySelector("#transactions-total-sum");
  if (totalSumEl) {
    const formatted = Number(store.toDisplay(Math.abs(totalSum))).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    totalSumEl.textContent = `${totalSum < 0 ? '-' : (totalSum > 0 ? '+' : '')}${symbol}${formatted}`;
    totalSumEl.style.color = totalSum < 0 ? 'var(--expense)' : (totalSum > 0 ? 'var(--income)' : 'var(--text-primary)');
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
  } else {
    const groups = {};
    const locale = store.settings.language === "en" ? "en-GB" : "th-TH";
    list.forEach((tx) => {
      const d = new Date(tx.date);
      const key = d.toDateString(); 
      if (!groups[key]) {
        groups[key] = { 
          dateObj: d, 
          display: d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }), 
          txs: [] 
        };
      }
      groups[key].txs.push(tx);
    });

    const sortedGroups = Object.values(groups).sort((a, b) => b.dateObj - a.dateObj);

    sortedGroups.forEach(group => {
      let dailyIncome = 0;
      let dailyExpense = 0;
      group.txs.forEach((tx) => {
        if (tx.isIncome) dailyIncome += Number(tx.amount);
        else dailyExpense += Number(tx.amount);
      });
      
      const formatAmount = (num) => Number(store.toDisplay(Math.abs(num))).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const groupHeader = document.createElement("div");
      groupHeader.className = "day-group-header";
      
      groupHeader.innerHTML = `
        <span class="day-group-label">${group.display}</span>
        <span class="day-group-total">
          ${dailyIncome > 0 ? `<span class="day-group-income">+${symbol}${formatAmount(dailyIncome)}</span>` : ''}
          ${dailyExpense > 0 ? `<span class="day-group-expense">-${symbol}${formatAmount(dailyExpense)}</span>` : ''}
        </span>
      `;
      listContainer.appendChild(groupHeader);
      
      group.txs.forEach((tx) => {
        const tile = createTransactionTile(
          tx,
          symbol,
          store.toDisplay(tx.amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          (transaction) => {
            router.navigate("addTransaction", { transactionId: transaction.id });
          },
          async (id) => {
            const isConfirmed = await alerts.confirmDelete(
              store.settings.language === "en"
                ? "Delete Transaction?"
                : "ต้องการลบรายการใช่หรือไม่?",
              t("deleteConfirm"),
            );
            if (isConfirmed) {
              store.deleteTransaction(id);
            }
          },
        );
        listContainer.appendChild(tile);
      });
    });
  }
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
