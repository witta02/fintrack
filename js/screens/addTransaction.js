import { store } from '../store.js';
import { router } from '../router.js';
import { expenseCategories, incomeCategories, getCategoryInfo } from '../categories.js';

let isIncome = false; // default to Expense
let selectedCategory = 'Food';
let editingTransactionId = null;

export function renderAddTransaction(container, params) {
  editingTransactionId = params?.transactionId || null;
  let transaction = null;

  if (editingTransactionId) {
    transaction = store.getAllTransactions().find(t => t.id === editingTransactionId);
    if (transaction) {
      isIncome = transaction.isIncome;
      selectedCategory = transaction.category;
    }
  } else {
    // Reset defaults for a new transaction
    isIncome = false;
    selectedCategory = 'Food';
  }

  const titleText = editingTransactionId ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่';
  const displayAmount = transaction ? store.toDisplay(transaction.amount).toFixed(2) : '';
  const displayTitle = transaction ? transaction.title : '';
  
  // Format transaction date to YYYY-MM-DDThh:mm for datetime-local input
  let formattedDate = '';
  if (transaction && transaction.date) {
    const d = new Date(transaction.date);
    const pad = (num) => String(num).padStart(2, '0');
    formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } else {
    const d = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  container.innerHTML = `
    <div class="screen-header">
      <h1 class="brand-title">${titleText}</h1>
      <button id="cancel-btn" class="icon-btn" title="ยกเลิก">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <form id="transaction-form" class="transaction-form">
      <!-- Income/Expense Selector -->
      <div class="form-group" style="margin-bottom: 20px;">
        <div class="type-switcher">
          <button type="button" class="type-btn expense-btn ${!isIncome ? 'active' : ''}" id="switch-expense">รายจ่าย</button>
          <button type="button" class="type-btn income-btn ${isIncome ? 'active' : ''}" id="switch-income">รายรับ</button>
        </div>
      </div>

      <!-- Amount Input -->
      <div class="form-group">
        <label class="form-label" for="amount">จำนวนเงิน (${store.getCurrencySymbol()})</label>
        <input 
          type="number" 
          step="0.01" 
          id="amount" 
          placeholder="0.00" 
          required 
          class="form-control amount-input-field" 
          value="${displayAmount}"
          style="font-size: 24px; font-weight: 700; text-align: center;"
        />
      </div>

      <!-- Title Input -->
      <div class="form-group">
        <label class="form-label" for="title">รายละเอียด / ชื่อรายการ</label>
        <input 
          type="text" 
          id="title" 
          placeholder="เช่น ค่าอาหารกลางวัน, เงินเดือน" 
          required 
          class="form-control" 
          value="${escapeHTML(displayTitle)}"
        />
      </div>

      <!-- Date Input -->
      <div class="form-group">
        <label class="form-label" for="date">วันที่และเวลา</label>
        <input 
          type="datetime-local" 
          id="date" 
          required 
          class="form-control" 
          value="${formattedDate}"
        />
      </div>

      <!-- Category Selector -->
      <div class="form-group">
        <label class="form-label">หมวดหมู่</label>
        <div id="category-selector-container" class="category-grid-selector">
          <!-- Rendered dynamically -->
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="margin-top: 32px; display: flex; flex-direction: column; gap: 12px;">
        <button type="submit" class="btn-primary" style="padding: 14px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          บันทึกรายการ
        </button>
        
        ${editingTransactionId ? `
          <button type="button" id="delete-trans-btn" class="btn" style="background: rgba(248, 81, 73, 0.1); color: #F85149; border: 1px solid rgba(248, 81, 73, 0.2); padding: 12px; border-radius: var(--radius-lg); font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            ลบรายการนี้
          </button>
        ` : ''}
      </div>
    </form>

    <div style="height: 100px;"></div>
  `;

  // Initial category picker setup
  renderCategoryPicker(container);

  // Setup form submit & click event listeners
  setupFormListeners(container);
}

function renderCategoryPicker(container) {
  const catContainer = container.querySelector('#category-selector-container');
  catContainer.innerHTML = '';

  const list = isIncome ? incomeCategories : expenseCategories;
  
  // Make sure the selectedCategory fits the list, if not reset to the first option
  if (!list.some(c => c.name === selectedCategory)) {
    selectedCategory = list[0].name;
  }

  list.forEach(cat => {
    const info = getCategoryInfo(cat.name);
    const isSelected = cat.name === selectedCategory;
    
    const item = document.createElement('div');
    item.className = `category-picker-item ${isSelected ? 'selected' : ''}`;
    
    // Style when selected vs unselected
    if (isSelected) {
      item.style.borderColor = info.color;
      item.style.background = `${info.color}15`;
      item.style.color = info.color;
    }

    item.innerHTML = `
      <div class="category-picker-icon" style="background: ${info.color}15; color: ${info.color};">
        ${info.emoji}
      </div>
      <div class="category-picker-label">${info.label}</div>
    `;

    item.addEventListener('click', () => {
      selectedCategory = cat.name;
      renderCategoryPicker(container); // Re-render to update classes
    });

    catContainer.appendChild(item);
  });
}

function setupFormListeners(container) {
  const form = container.querySelector('#transaction-form');

  // Toggle Expense / Income buttons
  const expBtn = container.querySelector('#switch-expense');
  const incBtn = container.querySelector('#switch-income');

  incBtn.addEventListener('click', () => {
    if (isIncome) return; // Already income
    isIncome = true;
    incBtn.classList.add('active');
    expBtn.classList.remove('active');
    selectedCategory = 'Salary'; 
    renderCategoryPicker(container);
  });

  expBtn.addEventListener('click', () => {
    if (!isIncome) return; // Already expense
    isIncome = false;
    expBtn.classList.add('active');
    incBtn.classList.remove('active');
    selectedCategory = 'Food';
    renderCategoryPicker(container);
  });

  // Cancel Button
  container.querySelector('#cancel-btn').addEventListener('click', () => {
    router.navigate('dashboard');
  });

  // Delete transaction button (if editing)
  const delBtn = container.querySelector('#delete-trans-btn');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      if (confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
        store.deleteTransaction(editingTransactionId);
        router.navigate('dashboard');
      }
    });
  }

  // Handle Form Submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const titleVal = container.querySelector('#title').value;
    const amountVal = parseFloat(container.querySelector('#amount').value);
    const dateVal = new Date(container.querySelector('#date').value);

    if (isNaN(amountVal) || amountVal <= 0) {
      alert('กรุณากรอกจำนวนเงินให้ถูกต้อง');
      return;
    }

    // Convert display currency amount back to base THB currency amount
    const thbAmount = store.settings.selectedCurrency === 'THB' 
      ? amountVal 
      : amountVal / store.toDisplay(1.0); // Simple base-rate scale conversion

    if (editingTransactionId) {
      // Update
      const oldTrans = store.getAllTransactions().find(t => t.id === editingTransactionId);
      store.updateTransaction({
        id: editingTransactionId,
        title: titleVal,
        amount: thbAmount,
        isIncome: isIncome,
        category: selectedCategory,
        date: dateVal,
        recurringId: oldTrans ? oldTrans.recurringId : null
      });
    } else {
      // Add
      store.addTransaction({
        title: titleVal,
        amount: thbAmount,
        isIncome: isIncome,
        category: selectedCategory,
        date: dateVal
      });
    }

    // Navigate back
    router.navigate('dashboard');
  });
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
