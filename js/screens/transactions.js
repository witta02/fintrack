import { store } from "../store.js";
import { router } from "../router.js";
import { createTransactionTile } from "../components/transactionTile.js";
import {
  expenseCategories,
  incomeCategories,
  getCategoryInfo,
} from "../categories.js";
import { t } from "../i18n.js";
import { alerts } from "../utils/alertHelper.js";

let searchQuery = "";
let activeFilterType = "all"; // 'all', 'income', 'expense'
let selectedCategoryFilter = "all";

export function renderTransactions(container) {
  // Combine all categories for the dropdown filter
  const allCategories = [...expenseCategories, ...incomeCategories];
  // Remove duplicates by name
  const uniqueCategories = [];
  const map = new Map();
  for (const item of allCategories) {
    if (!map.has(item.name)) {
      map.set(item.name, true);
      uniqueCategories.push(item);
    }
  }

  container.innerHTML = `
    <div class="screen-header" style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 20px;">
      <h1 class="brand-title" style="font-size: 24px; font-weight: 800; letter-spacing: -1px; color: var(--text-primary);">${t("transactionsTitle")}</h1>
      <div style="display: flex; gap: 10px;">
        <button id="export-btn" class="icon-btn-secondary" style="width: 44px; height: 44px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--text-primary); transition: all var(--transition);">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button id="add-trans-btn" class="icon-btn" style="width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, var(--gold), var(--amber)); border: none; display: flex; align-items: center; justify-content: center; color: #000; box-shadow: var(--shadow-gold); transition: all var(--transition);">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
    </div>

    <!-- Search Box -->
    <div class="search-container" style="margin-bottom: 20px; position: relative;">
      <div class="search-input-wrapper" style="position: relative;">
        <svg class="search-icon" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="search-input" placeholder="${t("searchPlaceholder")}" value="${escapeHTML(searchQuery)}" style="padding-left: 48px; border-radius: 16px; background: var(--surface); border: 1px solid var(--border); width: 100%; height: 50px; font-size: 15px;" />
        ${searchQuery ? '<button id="clear-search-btn" class="clear-btn" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: var(--border); color: var(--text-primary); border: none; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer;">&times;</button>' : ""}
      </div>
    </div>

    <!-- Filter Row -->
    <div class="filter-row" style="margin-bottom: 20px; display: flex; gap: 12px;">
      <div class="select-wrapper" style="flex: 1;">
        <select id="category-filter-select" class="form-control" style="padding: 12px 16px; font-size: 14px; border-radius: 14px; background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); width: 100%;">
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
    </div>

    <!-- Type Tabs (All, Income, Expense) -->
    <div class="period-selector" style="margin-bottom: 16px;">
      <button class="period-tab ${activeFilterType === "all" ? "active" : ""}" data-type="all">${t("dashboardAll")}</button>
      <button class="period-tab ${activeFilterType === "income" ? "active" : ""}" data-type="income">${t("income")}</button>
      <button class="period-tab ${activeFilterType === "expense" ? "active" : ""}" data-type="expense">${t("expense")}</button>
    </div>

    <div class="results-meta" style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px; padding: 0 4px;" id="results-count">
      ${t("foundItems", { count: 0 })}
    </div>

    <div id="transactions-full-list" class="transactions-list-container">
      <!-- Dynamic list -->
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
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;

    let clearBtn = container.querySelector("#clear-search-btn");
    if (searchQuery) {
      if (!clearBtn) {
        const btn = document.createElement("button");
        btn.id = "clear-search-btn";
        btn.className = "clear-btn";
        btn.innerHTML = "&times;";
        btn.addEventListener("click", () => {
          searchQuery = "";
          searchInput.value = "";
          btn.remove();
          updateUI(container);
        });
        searchInput.parentNode.appendChild(btn);
      }
    } else {
      if (clearBtn) clearBtn.remove();
    }

    updateUI(container);
  });

  // Category filter select handler
  const select = container.querySelector("#category-filter-select");
  select.addEventListener("change", (e) => {
    selectedCategoryFilter = e.target.value;
    updateUI(container);
  });

  // Type tabs clicks
  container.querySelectorAll(".period-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      container
        .querySelectorAll(".period-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      activeFilterType = tab.getAttribute("data-type");
      updateUI(container);
    });
  });

  // Add transaction button
  container.querySelector("#add-trans-btn").addEventListener("click", () => {
    router.navigate("addTransaction");
  });

  // Export button
  container.querySelector("#export-btn").addEventListener("click", () => {
    router.navigate("export");
  });
}

function updateUI(container) {
  const symbol = store.getCurrencySymbol();
  const listContainer = container.querySelector("#transactions-full-list");
  listContainer.innerHTML = "";

  let list = store.getAllTransactions();

  // Filter by search query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter((t) => t.title.toLowerCase().includes(q));
  }

  // Filter by type
  if (activeFilterType === "income") {
    list = list.filter((t) => t.isIncome);
  } else if (activeFilterType === "expense") {
    list = list.filter((t) => !t.isIncome);
  }

  // Filter by category
  if (selectedCategoryFilter !== "all") {
    list = list.filter((t) => t.category === selectedCategoryFilter);
  }

  // Update Count Meta
  container.querySelector("#results-count").textContent = t("foundItems", {
    count: list.length,
  });

  if (list.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <p class="empty-text">${t("noSearchResults")}</p>
      </div>
    `;
  } else {
    list.forEach((t) => {
      const tile = createTransactionTile(
        t,
        symbol,
        store.toDisplay(t.amount),
        // onEdit
        (transaction) => {
          router.navigate("addTransaction", { transactionId: transaction.id });
        },
        // onDelete
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
