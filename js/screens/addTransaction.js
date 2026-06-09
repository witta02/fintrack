import { store } from '../store.js';
import { router } from '../router.js';
import { expenseCategories, incomeCategories, getCategoryInfo } from '../categories.js';
import { t } from '../i18n.js';

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

  const titleText = editingTransactionId ? t('editTransactionTitle') : t('addTransactionTitle');
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
    <div class="screen-header" style="display: flex; align-items: center; justify-content: space-between;">
      <h1 class="brand-title">${titleText}</h1>
      <div style="display: flex; align-items: center; gap: 8px;">
        ${!editingTransactionId ? `
          <button id="scan-receipt-btn" type="button" class="icon-btn" title="สแกนใบเสร็จเพิ่มรายจ่าย" style="color: var(--gold); border: 1px solid var(--border); border-radius: 12px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: var(--surface);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
          </button>
        ` : ''}
        <button id="cancel-btn" class="icon-btn" title="${t('cancel')}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>

    <!-- Hidden file input -->
    <input type="file" id="scan-receipt-file-input" accept="image/*" class="hidden" />

    <!-- Scanning Spinner -->
    <div id="ocr-spinner-overlay" class="scanning-overlay hidden" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 200;">
      <div class="scanning-dialog" style="background: #1C2128; border: 1px solid var(--border); border-radius: 16px; padding: 24px; text-align: center; max-width: 280px; color: white; font-family: sans-serif;">
        <div class="scan-spinner" style="width: 48px; height: 48px; border: 3px solid rgba(255, 184, 0, 0.2); border-top-color: var(--gold); border-radius: 50%; animation: spin 1s infinite linear; margin: 0 auto 16px auto;"></div>
        <h4 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: white;">AI กำลังอ่านและวิเคราะห์บิล...</h4>
        <p style="margin: 0; font-size: 11px; opacity: 0.6; color: #9CA3AF;">ระบบดึงราคาและชื่อร้านค้ากำลังทำงาน</p>
      </div>
    </div>

    <form id="transaction-form" class="transaction-form">
      <!-- Income/Expense Selector -->
      <div class="form-group" style="margin-bottom: 20px;">
        <div class="type-switcher">
          <button type="button" class="type-btn expense-btn ${!isIncome ? 'active' : ''}" id="switch-expense">${t('expense')}</button>
          <button type="button" class="type-btn income-btn ${isIncome ? 'active' : ''}" id="switch-income">${t('income')}</button>
        </div>
      </div>

      <!-- Amount Input -->
      <div class="form-group">
        <label class="form-label" for="amount">${t('amount')} (${store.getCurrencySymbol()})</label>
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
        <label class="form-label" for="title">${t('title')}</label>
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
        <label class="form-label" for="date">${t('dateTime')}</label>
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
        <label class="form-label">${t('category')}</label>
        <div id="category-selector-container" class="category-grid-selector">
          <!-- Rendered dynamically -->
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="margin-top: 32px; display: flex; flex-direction: column; gap: 12px;">
        <button type="submit" class="btn-primary" style="padding: 14px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ${t('saveTransaction')}
        </button>
        
        ${editingTransactionId ? `
          <button type="button" id="delete-trans-btn" class="btn" style="background: rgba(248, 81, 73, 0.1); color: #F85149; border: 1px solid rgba(248, 81, 73, 0.2); padding: 12px; border-radius: var(--radius-lg); font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            ${t('deleteThis')}
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

  // Scan Receipt Action
  const scanBtn = container.querySelector('#scan-receipt-btn');
  const fileInput = container.querySelector('#scan-receipt-file-input');
  
  if (scanBtn && fileInput) {
    scanBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        if (!store.settings.geminiApiKey) {
          showGeminiKeyModal(container, file, (key) => {
            processImageWithKey(container, file, key);
          });
        } else {
          processImageWithKey(container, file, store.settings.geminiApiKey);
        }
      }
    });
  }

  // Delete transaction button (if editing)
  const delBtn = container.querySelector('#delete-trans-btn');
  if (delBtn) {
    delBtn.addEventListener('click', () => {
      if (confirm(t('deleteConfirm'))) {
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
      alert(store.settings.language === 'en' ? 'Please enter a valid amount' : 'กรุณากรอกจำนวนเงินให้ถูกต้อง');
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

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

function showGeminiKeyModal(container, file, onSuccess) {
  const isEn = store.settings.language === 'en';
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-dialog" style="background: #1C2128; border-radius: 20px; text-align: center; color: white; padding: 24px; border: 1px solid var(--border);">
      <div style="padding: 10px 0;">
        <div style="width: 56px; height: 56px; background: rgba(255, 193, 7, 0.1); color: var(--gold); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/></svg>
        </div>
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: white;">
          ${isEn ? 'Gemini API Key Required' : 'ต้องระบุ Gemini API Key'}
        </h3>
        <p style="margin: 0 0 16px 0; font-size: 12.5px; color: rgba(255, 255, 255, 0.6); line-height: 1.5;">
          ${isEn 
            ? 'To scan and analyze real receipts, bills or bank slips, please enter your Gemini API Key.' 
            : 'เพื่อวิเคราะห์สแกนใบเสร็จหรือสลิปธนาคารจริง กรุณากรอกรหัส Gemini API Key ของคุณ'}
          <br/>
          <a href="https://aistudio.google.com/" target="_blank" style="color: var(--gold); font-weight: 700; text-decoration: underline; display: inline-block; margin-top: 6px;">
            ${isEn ? 'Get free key here' : 'ขอรับกุญแจฟรีคลิกที่นี่'}
          </a>
        </p>
        
        <input 
          type="password" 
          id="modal-gemini-key-input" 
          class="form-control" 
          placeholder="AIzaSy..." 
          style="font-family: monospace; font-size: 13px; text-align: center; margin-bottom: 18px; background: #0d1117; color: white; border: 1px solid var(--border);"
        />
        
        <div style="display: flex; gap: 10px; margin-top: 10px;">
          <button id="modal-cancel-btn" class="btn" style="flex: 1; border: 1px solid var(--border); padding: 12px; border-radius: 12px; font-weight: 700; color: white;">
            ${isEn ? 'Cancel' : 'ยกเลิก'}
          </button>
          <button id="modal-save-btn" class="btn-primary" style="flex: 1; padding: 12px; border-radius: 12px; font-weight: 700; margin-top:0;">
            ${isEn ? 'Save & Scan' : 'บันทึกและสแกน'}
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector('#modal-cancel-btn').onclick = () => {
    document.body.removeChild(modal);
  };
  
  modal.querySelector('#modal-save-btn').onclick = () => {
    const keyVal = modal.querySelector('#modal-gemini-key-input').value.trim();
    if (keyVal) {
      store.settings.geminiApiKey = keyVal;
      store.save();
      document.body.removeChild(modal);
      onSuccess(keyVal);
    } else {
      alert(isEn ? 'Please enter a valid key' : 'กรุณากรอกรหัสคีย์ที่ถูกต้อง');
    }
  };
}

async function processImageWithKey(container, file, apiKey) {
  const spinner = container.querySelector('#ocr-spinner-overlay');
  spinner.classList.remove('hidden');
  
  try {
    const base64Data = await readAsBase64(file);
    const mimeType = file.type || "image/jpeg";
    const rawBase64 = base64Data.split(',')[1];
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: rawBase64
                }
              },
              {
                text: `Analyze this image. It can be a restaurant/store receipt OR a bank transfer e-slip (e.g. Thai mobile banking transaction slip).
                Extract the following details and return JSON format ONLY (no markdown blocks, no backticks, no comments, just valid JSON):
                {
                  "title": "Title for this transaction (e.g. 'บิลจาก [Store Name]' or 'โอนเงินให้ [Receiver Name]' or 'รับเงินจาก [Sender Name]')",
                  "amount": Total amount in THB (double),
                  "isIncome": true if it is a deposit/incoming transfer, false if it is a payment/outgoing transfer,
                  "category": "Suitable choice from: Food, Transport, Shopping, Salary, Bills, Entertainment, Health, Gift, Travel, Education, Investment, Other",
                  "date": "Transaction date and time in YYYY-MM-DDTHH:mm format (e.g. '2026-06-09T12:27', else empty string)"
                }`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData.error?.message || "API call failed";
      throw new Error(msg);
    }

    const data = await response.json();
    const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResult) throw new Error("Empty response from Gemini");

    const cleanJson = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJson);

    const titleVal = result.title || "รายการโอนเงิน";
    const amountVal = parseFloat(result.amount) || 0.0;
    const isInc = result.isIncome === true;
    const cat = result.category || "Other";
    const dateVal = result.date || "";

    container.querySelector('#title').value = titleVal;
    if (amountVal > 0) {
      container.querySelector('#amount').value = amountVal.toFixed(2);
    }
    if (dateVal) {
      container.querySelector('#date').value = dateVal;
    }
    
    isIncome = isInc;
    selectedCategory = cat;
    
    if (isIncome) {
      container.querySelector('#switch-income').classList.add('active');
      container.querySelector('#switch-expense').classList.remove('active');
    } else {
      container.querySelector('#switch-expense').classList.add('active');
      container.querySelector('#switch-income').classList.remove('active');
    }
    renderCategoryPicker(container);

  } catch (err) {
    console.error("AI Scanner Error:", err);
    alert(store.settings.language === 'en' 
      ? `AI Scan Failed: ${err.message}. Please check your API key in Settings.` 
      : `การสแกนด้วย AI ล้มเหลว: ${err.message} กรุณาตรวจสอบ API Key ของคุณในเมนูตั้งค่า`);
  } finally {
    spinner.classList.add('hidden');
  }
}
