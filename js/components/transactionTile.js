import { getCategoryInfo } from '../categories.js';

export function createTransactionTile(transaction, symbol, displayAmount, onEdit, onDelete) {
  const cat = getCategoryInfo(transaction.category);
  
  // Format Date to: "21 May 2026, 22:30" or Thai: "21 พ.ค. 2026, 22:30"
  const dateObj = new Date(transaction.date);
  const options = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  const dateStr = dateObj.toLocaleDateString('th-TH', options);

  const amountSign = transaction.isIncome ? '+' : '-';
  const amountClass = transaction.isIncome ? 'amount-income' : 'amount-expense';

  const tile = document.createElement('div');
  tile.className = 'transaction-tile';
  tile.dataset.id = transaction.id;
  
  tile.innerHTML = `
    <div class="cat-icon" style="background: ${cat.color}15; color: ${cat.color}; border: 1px solid ${cat.color}30;">
      <span class="cat-emoji">${cat.emoji}</span>
    </div>
    <div class="tile-info">
      <div class="tile-title" style="color: var(--text-primary);">${escapeHTML(transaction.title)}</div>
      <div class="tile-meta" style="color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
        <span class="cat-name" style="color: ${cat.color};">${cat.label}</span>
        <span style="opacity: 0.3;">•</span>
        <span>${dateStr}</span>
      </div>
    </div>
    <div class="tile-amount ${transaction.isIncome ? 'income' : 'expense'}">
      ${amountSign}${symbol}${displayAmount}
    </div>
    <button class="tile-delete" title="ลบรายการ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
    </button>
  `;

  // Attach event listeners
  tile.querySelector('.tile-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    onDelete(transaction.id);
  });

  // Make tile clickable to edit too
  tile.addEventListener('click', () => {
    onEdit(transaction);
  });

  return tile;
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
