import { getCategoryInfo } from "../categories.js";
import { t, locale } from "../i18n.js";

export function createTransactionTile(
  transaction,
  symbol,
  displayAmount,
  onEdit,
  onDelete,
) {
  const cat = getCategoryInfo(transaction.category);

  // Format Date dynamically using locale() from i18n.js
  const dateObj = new Date(transaction.date);
  const dateStr = dateObj.toLocaleDateString(locale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const amountSign = transaction.isIncome ? "+" : "-";

  let cleanTitle = transaction.title;
  if (!cleanTitle || cleanTitle.toLowerCase().startsWith("category") || cleanTitle.toLowerCase() === (transaction.category || "").toLowerCase()) {
    cleanTitle = cat.label;
  }

  const tile = document.createElement("div");
  tile.className = "transaction-tile";
  tile.dataset.id = transaction.id;

  // Set CSS custom property for the left accent bar color
  tile.style.setProperty("--accent-color", cat.color);

  tile.innerHTML = `
    <div class="cat-icon" style="background: ${cat.color}22; color: ${cat.color}; border: 1px solid ${cat.color}35;">
      <span style="display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;">${cat.svg || cat.emoji}</span>
    </div>
    <div class="tile-info">
      <div class="tile-title">${escapeHTML(cleanTitle || cat.label || '')}</div>
      <div class="tile-meta">
        <span style="color: ${cat.color}; font-weight: 700; font-size: 11px;">${cat.label}</span>
        <span style="opacity: 0.35;">•</span>
        <span style="color: var(--text-secondary); font-size: 11px;">${dateStr}</span>
      </div>
    </div>
    <div class="tile-amount ${transaction.isIncome ? "income" : "expense"}" style="font-size: 15px; font-weight: 900; letter-spacing: -0.3px;">
      ${amountSign}${symbol}${displayAmount}
    </div>
    <button class="tile-delete" title="${t("deleteTransaction")}" aria-label="${t("deleteTransaction")}">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
      </svg>
    </button>
  `;

  // Delete button
  tile.querySelector(".tile-delete").addEventListener("click", (e) => {
    e.stopPropagation();
    onDelete(transaction.id);
  });

  // Tile click → edit
  tile.addEventListener("click", () => {
    onEdit(transaction);
  });

  return tile;
}

function escapeHTML(str) {
  return str.replace(
    /[&<>'\"]/g,
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
