import { store } from '../store.js';
import { getCategoryInfo, expenseCategories, incomeCategories } from '../categories.js';
import { alerts } from '../utils/alertHelper.js';

export function renderRecurring(container) {
  container.innerHTML = `
    <div class="screen-header">
      <h1 class="brand-title">รายการประจำ</h1>
      <button id="add-recurring-btn" class="icon-btn icon-btn-primary" title="เพิ่มรายการประจำ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>

    <div class="info-card" style="margin-bottom: 20px; background: rgba(124, 58, 237, 0.08); border-color: rgba(124, 58, 237, 0.2);">
      <div style="display: flex; gap: 12px; align-items: flex-start;">
        <div style="color: var(--violet); font-size: 20px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
        </div>
        <div>
          <h4 style="margin: 0 0 4px 0; font-weight: 600; color: var(--text-primary);">ระบบบันทึกอัตโนมัติ</h4>
          <p style="margin: 0; font-size: 12px; color: var(--text-secondary); line-height: 1.5;">แอปจะทำการบันทึกรายรับหรือรายจ่ายนี้ให้โดยอัตโนมัติเมื่อถึงรอบกำหนดวันที่กำหนดไว้ด้านล่าง</p>
        </div>
      </div>
    </div>

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
    if (document.getElementById('recurring-rules-list')) {
      updateUI(container);
    } else {
      unsubscribe();
    }
  });
}

function setupEventListeners(container) {
  container.querySelector('#add-recurring-btn').addEventListener('click', () => {
    showAddRecurringModal();
  });
}

function updateUI(container) {
  const symbol = store.getCurrencySymbol();
  const listContainer = container.querySelector('#recurring-rules-list');
  listContainer.innerHTML = '';

  const rules = store.getAllRecurringRules();

  if (rules.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
        </div>
        <p class="empty-text">ยังไม่มีรายการประจำใดๆ ถูกตั้งค่าไว้</p>
        <button id="add-first-recurring-btn" class="btn btn-primary" style="margin-top: 12px; font-size: 13px; padding: 8px 16px;">ตั้งค่ารายการประจำแรก</button>
      </div>
    `;
    listContainer.querySelector('#add-first-recurring-btn').addEventListener('click', () => {
      showAddRecurringModal();
    });
    return;
  }

  rules.forEach(rule => {
    const cat = getCategoryInfo(rule.category);
    const amountVal = store.toDisplay(rule.amount);
    const dateStr = new Date(rule.nextDueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    
    // Type display label
    let frequencyText = '';
    if (rule.type === 'monthly') frequencyText = 'รายเดือน';
    else if (rule.type === 'yearly') frequencyText = 'รายปี';
    else if (rule.type === 'custom') frequencyText = `ทุกๆ ${rule.customDays} วัน`;

    const card = document.createElement('div');
    card.className = `recurring-card ${!rule.isActive ? 'inactive' : ''}`;
    card.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="tile-icon" style="background: ${cat.color}15; color: ${cat.color}; width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
            ${cat.emoji}
          </div>
          <div>
            <h4 style="margin: 0; font-size: 14px; font-weight: 600; color: var(--text-primary);">${escapeHTML(rule.title)}</h4>
            <span style="font-size: 11px; color: ${cat.color}; font-weight: 500;">${cat.label}</span>
          </div>
        </div>
        <!-- Status Switch toggle button -->
        <label class="switch-toggle">
          <input type="checkbox" class="toggle-status-chk" ${rule.isActive ? 'checked' : ''} />
          <span class="switch-slider"></span>
        </label>
      </div>
      <div style="display: flex; align-items: flex-end; justify-content: space-between;">
        <div>
          <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 2px;">กำหนดชำระรอบถัดไป</div>
          <div style="font-size: 12px; color: var(--text-primary); font-weight: 500; display: flex; align-items: center; gap: 6px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
            ${dateStr} (${frequencyText})
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 15px; font-weight: 700; color: ${rule.isIncome ? 'var(--income)' : 'var(--expense)'};">
            ${rule.isIncome ? '+' : '-'}${symbol}${amountVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <button class="rule-delete-btn" style="background: none; border: none; padding: 4px; color: var(--text-secondary); cursor: pointer;" title="ลบ">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;

    // Listen status change toggle
    card.querySelector('.toggle-status-chk').addEventListener('change', () => {
      store.toggleRecurringRule(rule.id);
    });

    // Listen delete button click
    card.querySelector('.rule-delete-btn').addEventListener('click', async () => {
      const isConfirmed = await alerts.confirmDelete(
        store.settings.language === 'en' ? 'Delete Recurring Rule?' : 'ต้องการยกเลิกรายการประจำใช่หรือไม่?',
        store.settings.language === 'en' ? 'This recurring rule will be deleted.' : 'รายการประจำนี้จะถูกลบออกและยกเลิกบันทึกอัตโนมัติ'
      );
      if (isConfirmed) {
        store.deleteRecurringRule(rule.id);
      }
    });

    listContainer.appendChild(card);
  });
}

function showAddRecurringModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;

  let ruleIsIncome = false;
  let ruleSelectedCategory = 'Food';

  overlay.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 class="modal-title">ตั้งค่ารายการประจำใหม่</h3>
        <button id="modal-close" class="modal-close-btn">&times;</button>
      </div>
      <form id="recurring-modal-form">
        <!-- Type Switcher -->
        <div class="form-group" style="margin-bottom: 16px;">
          <div class="type-switcher">
            <button type="button" class="type-btn expense-btn active" id="modal-switch-expense">รายจ่าย</button>
            <button type="button" class="type-btn income-btn" id="modal-switch-income">รายรับ</button>
          </div>
        </div>

        <!-- Amount -->
        <div class="form-group">
          <label class="form-label">จำนวนเงิน (${store.getCurrencySymbol()})</label>
          <input type="number" step="0.01" id="modal-amount" placeholder="0.00" required class="form-control" style="font-size: 18px; font-weight: 600; text-align: center;" />
        </div>

        <!-- Title -->
        <div class="form-group">
          <label class="form-label">ชื่อรายการ</label>
          <input type="text" id="modal-title" placeholder="เช่น ค่าห้อง, ค่าน้ำมัน" required class="form-control" />
        </div>

        <!-- Frequency type -->
        <div class="form-group">
          <label class="form-label">รอบความถี่</label>
          <select id="modal-freq-type" class="form-control">
            <option value="monthly">รายเดือน</option>
            <option value="yearly">รายปี</option>
            <option value="custom">กำหนดจำนวนวันเอง (Custom)</option>
          </select>
        </div>

        <!-- Custom Days (hidden by default) -->
        <div class="form-group hidden" id="modal-custom-days-wrapper">
          <label class="form-label">ทำซ้ำทุกๆ (จำนวนวัน)</label>
          <input type="number" id="modal-custom-days" value="30" min="1" class="form-control" />
        </div>

        <!-- Next Due Date -->
        <div class="form-group">
          <label class="form-label">วันที่เริ่มบันทึกรอบแรก</label>
          <input type="date" id="modal-due-date" required class="form-control" />
        </div>

        <!-- Category Grid Selector -->
        <div class="form-group">
          <label class="form-label">หมวดหมู่</label>
          <div id="modal-category-picker-container" class="category-grid-selector" style="grid-template-columns: repeat(3, 1fr); gap: 6px; max-height: 180px; overflow-y: auto; padding: 4px;">
            <!-- Categories rendered dynamically -->
          </div>
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; margin-top: 12px;">ยืนยันการตั้งค่า</button>
      </form>
    </div>
  `;

  // Prefill today's date
  const today = new Date();
  const pad = (num) => String(num).padStart(2, '0');
  overlay.querySelector('#modal-due-date').value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  // Category Picker Rendering helper inside Modal
  function renderModalCategoryPicker() {
    const listContainer = overlay.querySelector('#modal-category-picker-container');
    listContainer.innerHTML = '';
    const list = ruleIsIncome ? incomeCategories : expenseCategories;
    
    if (!list.some(c => c.name === ruleSelectedCategory)) {
      ruleSelectedCategory = list[0].name;
    }

    list.forEach(cat => {
      const info = getCategoryInfo(cat.name);
      const isSelected = cat.name === ruleSelectedCategory;

      const item = document.createElement('div');
      item.className = `category-picker-item ${isSelected ? 'selected' : ''}`;
      item.style.padding = '8px 4px';
      
      if (isSelected) {
        item.style.borderColor = info.color;
        item.style.background = `${info.color}15`;
        item.style.color = info.color;
      }

      item.innerHTML = `
        <div class="category-picker-icon" style="font-size: 18px; color: ${info.color}; display: flex; align-items: center; justify-content: center; margin-bottom: 2px;">
          ${info.emoji}
        </div>
        <div class="category-picker-label" style="font-size: 11px;">${info.label}</div>
      `;

      item.addEventListener('click', () => {
        ruleSelectedCategory = cat.name;
        renderModalCategoryPicker();
      });

      listContainer.appendChild(item);
    });
  }

  renderModalCategoryPicker();

  // Show Modal Overlay
  overlay.classList.remove('hidden');

  // Handle Close buttons
  const closeModal = () => {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
  };

  overlay.querySelector('#modal-close').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Switch Expense / Income
  const expBtn = overlay.querySelector('#modal-switch-expense');
  const incBtn = overlay.querySelector('#modal-switch-income');

  expBtn.addEventListener('click', () => {
    ruleIsIncome = false;
    expBtn.classList.add('active');
    incBtn.classList.remove('active');
    ruleSelectedCategory = 'Food';
    renderModalCategoryPicker();
  });

  incBtn.addEventListener('click', () => {
    ruleIsIncome = true;
    incBtn.classList.add('active');
    expBtn.classList.remove('active');
    ruleSelectedCategory = 'Salary';
    renderModalCategoryPicker();
  });

  // Custom Days toggle depending on type select
  const freqSelect = overlay.querySelector('#modal-freq-type');
  const customDaysWrap = overlay.querySelector('#modal-custom-days-wrapper');
  freqSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      customDaysWrap.classList.remove('hidden');
    } else {
      customDaysWrap.classList.add('hidden');
    }
  });

  // Handle Form submit
  overlay.querySelector('#recurring-modal-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const amountVal = parseFloat(overlay.querySelector('#modal-amount').value);
    const titleVal = overlay.querySelector('#modal-title').value;
    const typeVal = freqSelect.value;
    const customDaysVal = parseInt(overlay.querySelector('#modal-custom-days').value) || 30;
    const dueDateVal = new Date(overlay.querySelector('#modal-due-date').value);

    if (isNaN(amountVal) || amountVal <= 0) {
      alerts.warning(store.settings.language === 'en' ? 'Please enter a valid amount' : 'กรุณากรอกจำนวนเงินให้ถูกต้อง');
      return;
    }

    // Convert display currency back to THB base currency
    const thbAmount = store.settings.selectedCurrency === 'THB' 
      ? amountVal 
      : amountVal / store.toDisplay(1.0);

    store.addRecurringRule({
      title: titleVal,
      amount: thbAmount,
      isIncome: ruleIsIncome,
      category: ruleSelectedCategory,
      type: typeVal,
      customDays: customDaysVal,
      nextDueDate: dueDateVal
    });

    closeModal();
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
