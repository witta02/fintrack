import { store } from '../store.js';
import { router } from '../router.js';
import { t } from '../i18n.js';
import jsQR from 'jsqr';
import { runLocalOCR, parseReceiptText, parseBankSlipAmount, detectIfBankSlip, parseBankSlipReceiver } from '../utils/ocrParser.js';
import { alerts } from '../utils/alertHelper.js';

// State variables
let payee = "Molly Wiebe";
let tax = 6.87;
let tip = 0.0;
let items = [];
let selectedItems = {};
let selectedQuantities = {};
let isScanning = false;

export function renderSplitBill(container) {
  // Reset state to mockup template if empty
  if (items.length === 0) {
    loadMockupTemplate();
  }

  container.innerHTML = `
    <style>
      .screen-container {
        overflow: hidden !important;
      }
      .split-bill-screen-container {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      .split-bill-screen {
        padding: 20px;
        position: relative;
        height: 100%;
        overflow-y: auto;
        padding-bottom: 350px; /* Spacer for bottom sheet */
      }

      .back-btn-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
      }
      .back-btn-row h1 {
        font-size: 20px;
        font-weight: 800;
        margin: 0;
        letter-spacing: -0.5px;
      }
      .scanning-control-panel {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }
      .panel-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px;
        background: var(--card);
        border: 1px solid var(--border);
        color: var(--text-primary);
        border-radius: 12px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all var(--transition);
      }
      .panel-btn:hover {
        background: var(--surface);
      }
      .paper-receipt {
        background: #FFFFFF;
        color: #1A1A1A;
        border-radius: 12px;
        padding: 24px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
        font-family: 'Courier New', Courier, monospace;
        font-size: 13px;
        line-height: 1.5;
        border: 1px solid #E5E7EB;
        position: relative;
      }
      .receipt-title {
        font-size: 18px;
        font-weight: 800;
        text-align: center;
        margin-bottom: 6px;
        color: #111827;
      }
      .receipt-address {
        text-align: center;
        font-size: 11px;
        color: #6B7280;
        margin-bottom: 16px;
      }
      .receipt-meta-row {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: #4B5563;
        margin-bottom: 4px;
      }
      .dotted-divider {
        border-top: 1.5px dashed #D1D5DB;
        margin: 12px 0;
      }
      .receipt-item-row {
        display: flex;
        align-items: flex-start;
        margin: 8px 0;
      }
      .receipt-item-name {
        flex: 1;
        font-weight: 500;
        color: #1F2937;
      }
      .receipt-item-price {
        font-weight: 500;
        color: #1F2937;
      }
      .receipt-item-delete {
        margin-left: 10px;
        color: #EF4444;
        cursor: pointer;
        display: flex;
        align-items: center;
      }
      .receipt-totals {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 12px;
      }
      .receipt-total-row {
        display: flex;
        justify-content: space-between;
        color: #4B5563;
      }
      .receipt-total-due {
        display: flex;
        justify-content: space-between;
        font-weight: 800;
        font-size: 15px;
        color: #111827;
        margin-top: 4px;
      }
      .add-manual-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        width: 100%;
        padding: 8px;
        margin-top: 16px;
        background: #F3F4F6;
        border: 1px dashed #D1D5DB;
        border-radius: 8px;
        font-family: inherit;
        font-size: 12px;
        font-weight: 600;
        color: #4B5563;
        cursor: pointer;
      }
      .add-manual-btn:hover {
        background: #E5E7EB;
      }
      .pay-share-sheet {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(19, 25, 41, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid var(--border);
        border-top-left-radius: 28px;
        border-top-right-radius: 28px;
        box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.5);
        padding: 16px 20px 24px 20px;
        display: flex;
        flex-direction: column;
        max-height: 330px;
        z-index: 10;
        transform: none;
        width: 100%;
      }
      @media (min-width: 768px) {
        .pay-share-sheet {
          max-width: 960px;
          left: 50% !important;
          transform: translateX(-50%) !important;
          right: auto !important;
          width: 100% !important;
        }
      }
      .sheet-drag-handle {
        width: 36px;
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        margin: 0 auto 16px auto;
      }
      .sheet-header {
        text-align: center;
        margin-bottom: 14px;
      }
      .sheet-title {
        color: #FFFFFF;
        font-size: 18px;
        font-weight: 700;
        margin: 0;
      }
      .sheet-subtitle {
        color: rgba(255, 255, 255, 0.4);
        font-size: 12px;
        margin-top: 2px;
      }
      .sheet-checklist {
        flex: 1;
        overflow-y: auto;
        padding-right: 4px;
        margin-bottom: 16px;
      }
      .sheet-item {
        display: flex;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        cursor: pointer;
      }
      .sheet-checkbox {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        margin-right: 14px;
        flex-shrink: 0;
      }
      .sheet-checkbox svg {
        display: none;
        width: 14px;
        height: 14px;
        color: white;
      }
      .sheet-item.selected .sheet-checkbox {
        background: #007AFF;
        border-color: #007AFF;
      }
      .sheet-item.selected .sheet-checkbox svg {
        display: block;
      }
      .sheet-item-info {
        flex: 1;
        min-width: 0;
        margin-right: 14px;
      }
      .sheet-item-title {
        font-size: 15px;
        color: rgba(255, 255, 255, 0.4);
        transition: color 0.2s;
      }
      .sheet-item.selected .sheet-item-title {
        color: #FFFFFF;
        font-weight: 600;
      }
      .sheet-item-sub {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.2);
        margin-top: 2px;
      }
      .sheet-item.selected .sheet-item-sub {
        color: rgba(255, 255, 255, 0.3);
      }
      .qty-stepper {
        display: none;
        align-items: center;
        background: #242426;
        border-radius: 20px;
        padding: 2px;
        margin-right: 14px;
      }
      .sheet-item.selected .qty-stepper {
        display: flex;
      }
      .stepper-btn {
        width: 26px;
        height: 26px;
        border: none;
        background: transparent;
        color: rgba(255, 255, 255, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        cursor: pointer;
        border-radius: 50%;
      }
      .stepper-btn:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      .stepper-val {
        color: white;
        font-size: 13px;
        font-weight: 700;
        padding: 0 8px;
        min-width: 16px;
        text-align: center;
      }
      .qty-badge {
        display: inline-block;
        padding: 4px 10px;
        background: #1E1E1E;
        border-radius: 12px;
        color: rgba(255, 255, 255, 0.2);
        font-size: 12px;
        font-weight: 600;
        margin-right: 14px;
      }
      .sheet-item.selected .qty-badge {
        display: none;
      }
      .sheet-item-price {
        font-size: 15px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.2);
        transition: color 0.2s;
      }
      .sheet-item.selected .sheet-item-price {
        color: #FFFFFF;
      }
      .sheet-pay-btn {
        width: 100%;
        height: 52px;
        background: #007AFF;
        border: none;
        border-radius: 26px;
        color: white;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: opacity var(--transition);
      }
      .sheet-pay-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .scanning-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 200;
      }
      .scanning-dialog {
        background: #1C2128;
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 24px;
        text-align: center;
        max-width: 280px;
        color: white;
      }
      .scan-spinner {
        width: 48px;
        height: 48px;
        border: 3px solid rgba(255, 184, 0, 0.2);
        border-top-color: var(--gold);
        border-radius: 50%;
        animation: spin 1s infinite linear;
        margin: 0 auto 16px auto;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>

    <div class="split-bill-screen-container">
      <div class="split-bill-screen">
        <!-- Top header -->
        <div class="back-btn-row">
          <button id="split-back-btn" class="icon-btn" style="background: var(--card); border: 1px solid var(--border); border-radius: 10px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <h1>เครื่องมือหารค่าใช้จ่าย (Split Bill)</h1>
        </div>

        <!-- Action Panel -->
        <div class="scanning-control-panel">
          <button id="btn-snap-receipt" class="panel-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            สแกนใบเสร็จ
          </button>
          <button id="btn-edit-bill-meta" class="panel-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            แต่งบิล
          </button>
          <button id="btn-reset-sample" class="panel-btn" style="color: var(--gold); border-color: rgba(255,184,0,0.2);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            ตัวอย่าง
          </button>
        </div>

        <!-- Hidden File input for scanning -->
        <input type="file" id="split-ocr-file-input" accept="image/*" class="hidden" />

        <!-- Background paper receipt mockup -->
        <div id="receipt-paper-container" class="paper-receipt">
          <!-- Rendered dynamically -->
        </div>
      </div>

      <!-- Scanning Spinner -->
      <div id="ocr-spinner-overlay" class="scanning-overlay hidden">
        <div class="scanning-dialog">
          <div class="scan-spinner"></div>
          <h4 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700;">ระบบกำลังอ่านและวิเคราะห์บิล...</h4>
          <p style="margin: 0; font-size: 11px; opacity: 0.6;">ระบบดึงรายการอาหารและราคากำลังทำงาน</p>
        </div>
      </div>

      <!-- Pay Your Share Bottom Sheet -->
      <div class="pay-share-sheet">
        <div class="sheet-drag-handle"></div>
        <div class="sheet-header">
          <h2 class="sheet-title">Pay Your Share</h2>
          <div class="sheet-subtitle" id="selected-items-count-text">0 Item Selected</div>
        </div>

        <div class="sheet-checklist" id="sheet-items-checklist">
          <!-- Checked list items rendered here -->
        </div>

        <button id="sheet-action-pay-btn" class="sheet-pay-btn" disabled>
          Pay Molly Wiebe ฿0.00
        </button>
      </div>
    </div>
  `;

  // Render components
  renderReceiptPaper(container);
  renderShareSheetChecklist(container);

  // Setup UI Listeners
  setupScreenListeners(container);
}

function loadMockupTemplate() {
  payee = "Molly Wiebe";
  tax = 6.87;
  tip = 0.0;
  items = [
    { id: "1", name: "Egg Sandwich", price: 14.00, qty: 1 },
    { id: "2", name: "Biscuits & Gravy", price: 18.00, qty: 1 },
    { id: "3", name: "Avocado Toast", price: 14.00, qty: 1 },
    { id: "4", name: "Aimee's Breakfast", price: 18.00, qty: 1 },
    { id: "5", name: "Country Loaf", price: 10.00, qty: 1 },
  ];

  selectedItems = { "1": true };
  selectedQuantities = { "1": 1 };
}

function getSubtotal() {
  return items.reduce((sum, item) => sum + (item.price * item.qty), 0.0);
}

function getTotalDue() {
  return getSubtotal() + tax + tip;
}

function getUserShare() {
  const sub = getSubtotal();
  if (sub === 0) return 0.0;

  let userSubtotal = 0.0;
  Object.keys(selectedItems).forEach(id => {
    if (selectedItems[id]) {
      const item = items.find(i => i.id === id);
      if (item) {
        const qty = selectedQuantities[id] || 1;
        userSubtotal += item.price * qty;
      }
    }
  });

  const ratio = userSubtotal / sub;
  const userTax = tax * ratio;
  const userTip = tip * ratio;

  return userSubtotal + userTax + userTip;
}

function renderReceiptPaper(container) {
  const paper = container.querySelector('#receipt-paper-container');
  const symbol = store.getCurrencySymbol();
  const subtotal = getSubtotal();
  const total = getTotalDue();

  let itemsHTML = '';
  if (items.length === 0) {
    itemsHTML = `
      <div style="text-align: center; color: #9CA3AF; padding: 30px 0;">
        ยังไม่มีรายการอาหาร<br/>กรุณากดสแกนใบเสร็จหรือเพิ่มข้อมูล
      </div>
    `;
  } else {
    itemsHTML = items.map((item, idx) => `
      <div class="receipt-item-row">
        <div class="receipt-item-name">${escapeHTML(item.name)} (x${item.qty})</div>
        <div class="receipt-item-price">${symbol}${(item.price * item.qty).toFixed(2)}</div>
        <div class="receipt-item-delete" data-idx="${idx}" title="ลบรายการ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </div>
      </div>
    `).join('');
  }

  paper.innerHTML = `
    <div class="receipt-title">${escapeHTML(payee || "ร้านค้า")}</div>
    <div class="receipt-address">50 S. Livermore Ave<br/>Livermore, California 94550</div>
    
    <div class="receipt-meta-row">
      <span>Server: Aimee W</span>
      <span>Table 67</span>
    </div>
    <div class="receipt-meta-row">
      <span>Check #322</span>
      <span>Guest Count: 3</span>
    </div>
    <div class="receipt-meta-row">
      <span>Ordered: 4/1/26 9:04 AM</span>
      <span>Due: 4/1/26 9:04 AM</span>
    </div>
    
    <div class="dotted-divider"></div>
    
    ${itemsHTML}
    
    <div class="dotted-divider"></div>
    
    <div class="receipt-totals">
      <div class="receipt-total-row">
        <span>Subtotal</span>
        <span>${symbol}${subtotal.toFixed(2)}</span>
      </div>
      ${tax > 0 ? `
        <div class="receipt-total-row">
          <span>Tax</span>
          <span>${symbol}${tax.toFixed(2)}</span>
        </div>
      ` : ''}
      ${tip > 0 ? `
        <div class="receipt-total-row">
          <span>Tip</span>
          <span>${symbol}${tip.toFixed(2)}</span>
        </div>
      ` : ''}
      <div class="receipt-total-due">
        <span>TOTAL DUE</span>
        <span>${symbol}${total.toFixed(2)}</span>
      </div>
    </div>

    <button id="receipt-add-item-btn" class="add-manual-btn">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      เพิ่มรายการอาหารด้วยตนเอง
    </button>
  `;

  // Bind Delete item button clicks
  paper.querySelectorAll('.receipt-item-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-idx'));
      const item = items[idx];
      items.splice(idx, 1);
      delete selectedItems[item.id];
      delete selectedQuantities[item.id];
      
      renderReceiptPaper(container);
      renderShareSheetChecklist(container);
    });
  });

  // Bind manual Add Item button
  paper.querySelector('#receipt-add-item-btn').addEventListener('click', () => {
    showAddItemModal(container);
  });
}

function renderShareSheetChecklist(container) {
  const checklist = container.querySelector('#sheet-items-checklist');
  const symbol = store.getCurrencySymbol();
  const selectedCount = Object.keys(selectedItems).filter(id => selectedItems[id]).length;

  // Render subtitle text
  container.querySelector('#selected-items-count-text').textContent = `${selectedCount} Item${selectedCount === 1 ? '' : 's'} Selected`;

  if (items.length === 0) {
    checklist.innerHTML = `
      <div style="text-align: center; color: rgba(255,255,255,0.2); padding: 40px 0; font-size: 13px;">
        ไม่มีรายการสำหรับเลือก
      </div>
    `;
    updatePayButton(container);
    return;
  }

  checklist.innerHTML = items.map(item => {
    const isChecked = !!selectedItems[item.id];
    const selQty = selectedQuantities[item.id] || 1;
    const totalPrice = item.price * selQty;

    return `
      <div class="sheet-item ${isChecked ? 'selected' : ''}" data-id="${item.id}">
        <div class="sheet-checkbox">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="sheet-item-info">
          <div class="sheet-item-title">${escapeHTML(item.name)}</div>
          <div class="sheet-item-sub">${selQty} of ${item.qty}</div>
        </div>
        
        <!-- Stepper if selected -->
        <div class="qty-stepper" data-id="${item.id}">
          <button class="stepper-btn btn-dec">&minus;</button>
          <span class="stepper-val">${selQty}</span>
          <button class="stepper-btn btn-inc">&plus;</button>
        </div>
        
        <!-- Quantity Badge if NOT selected -->
        <div class="qty-badge">${item.qty}</div>
        
        <div class="sheet-item-price">${symbol}${totalPrice.toFixed(2)}</div>
      </div>
    `;
  }).join('');

  // Bind clicks on item rows
  checklist.querySelectorAll('.sheet-item').forEach(row => {
    row.addEventListener('click', (e) => {
      // Prevent double trigger when tapping stepper buttons
      if (e.target.closest('.qty-stepper')) return;

      const id = row.getAttribute('data-id');
      selectedItems[id] = !selectedItems[id];
      if (selectedItems[id] && !selectedQuantities[id]) {
        selectedQuantities[id] = 1;
      }
      
      renderShareSheetChecklist(container);
    });
  });

  // Bind Stepper buttons
  checklist.querySelectorAll('.qty-stepper').forEach(stepper => {
    const id = stepper.getAttribute('data-id');
    const item = items.find(i => i.id === id);
    if (!item) return;

    stepper.querySelector('.btn-dec').addEventListener('click', (e) => {
      e.stopPropagation();
      const current = selectedQuantities[id] || 1;
      if (current > 1) {
        selectedQuantities[id] = current - 1;
      } else {
        selectedItems[id] = false;
      }
      renderShareSheetChecklist(container);
    });

    stepper.querySelector('.btn-inc').addEventListener('click', (e) => {
      e.stopPropagation();
      const current = selectedQuantities[id] || 1;
      if (current < item.qty) {
        selectedQuantities[id] = current + 1;
      }
      renderShareSheetChecklist(container);
    });
  });

  updatePayButton(container);
}

function updatePayButton(container) {
  const payBtn = container.querySelector('#sheet-action-pay-btn');
  const userShare = getUserShare();
  const symbol = store.getCurrencySymbol();
  const hasSelected = Object.values(selectedItems).some(v => v);

  payBtn.disabled = !hasSelected;
  payBtn.textContent = `Pay ${payee || 'Molly Wiebe'} ${symbol}${userShare.toFixed(2)}`;
}

function setupScreenListeners(container) {
  // Back Button
  container.querySelector('#split-back-btn').addEventListener('click', () => {
    router.navigate('dashboard');
  });

  // Reset/Sample template Button
  container.querySelector('#btn-reset-sample').addEventListener('click', () => {
    loadMockupTemplate();
    renderReceiptPaper(container);
    renderShareSheetChecklist(container);
  });

  // Edit Meta Button
  container.querySelector('#btn-edit-bill-meta').addEventListener('click', () => {
    showEditMetaModal(container);
  });

  // Snap/Scan Receipt Button
  const fileInput = container.querySelector('#split-ocr-file-input');
  container.querySelector('#btn-snap-receipt').addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const spinner = container.querySelector('#ocr-spinner-overlay');
      const statusSubtitle = container.querySelector('#ocr-spinner-overlay p') || spinner;
      spinner.classList.remove('hidden');
      
      try {
        // 1. Try local QR scanner first
        const qrData = await scanImageQR(file);
        if (qrData) {
          const parsed = parseSlipQR(qrData);
          if (parsed) {
            payee = parsed.title;
            tax = 0.0;
            tip = 0.0;
            
            let amountVal = parsed.amount;
            if (!amountVal) {
              try {
                const originalText = statusSubtitle.textContent;
                if (statusSubtitle) {
                  statusSubtitle.textContent = store.settings.language === 'en' 
                    ? 'Reading transaction amount from slip...' 
                    : 'กำลังอ่านยอดเงินจากสลิป...';
                }
                
                const rawText = await runLocalOCR(file, (msg) => {
                  if (statusSubtitle) statusSubtitle.textContent = msg;
                });
                
                if (statusSubtitle) statusSubtitle.textContent = originalText;
                
                amountVal = parseBankSlipAmount(rawText);
              } catch (ocrErr) {
                console.error("Failed to read amount from slip via OCR:", ocrErr);
              }
            }
            
            // Create a single item list for the parsed bank slip/payment details
            items = [
              {
                id: Math.random().toString(36).substring(2, 11),
                name: parsed.type === 'slip' ? 'รายการโอนเงิน' : 'ชำระเงินพร้อมเพย์',
                price: amountVal || 0.0,
                qty: 1
              }
            ];
            
            selectedItems = { [items[0].id]: true };
            selectedQuantities = { [items[0].id]: 1 };
            
            alerts.success(store.settings.language === 'en'
              ? `Successfully scanned QR!`
              : `สแกน QR Code สำเร็จ!`, parsed.title);
            
            spinner.classList.add('hidden');
            renderReceiptPaper(container);
            renderShareSheetChecklist(container);
            return;
          }
        }
      } catch (qrErr) {
        console.error("Local QR Scan failed, falling back to OCR:", qrErr);
      }
      
      // 2. Fallback to Local OCR scanner
      try {
        const originalText = statusSubtitle.textContent;
        const rawText = await runLocalOCR(file, (msg) => {
          if (statusSubtitle) statusSubtitle.textContent = msg;
        });
        
        if (statusSubtitle) statusSubtitle.textContent = originalText;
        
        if (detectIfBankSlip(rawText)) {
          // It's a bank/e-wallet slip without a QR code
          payee = parseBankSlipReceiver(rawText);
          tax = 0.0;
          tip = 0.0;
          const amountVal = parseBankSlipAmount(rawText);
          
          items = [
            {
              id: Math.random().toString(36).substring(2, 11),
              name: "รายการโอนเงิน / ชำระเงิน",
              price: amountVal || 0.0,
              qty: 1
            }
          ];
          
          alerts.success(store.settings.language === 'en'
            ? `Successfully scanned bank slip!`
            : `สแกนสลิปธนาคารสำเร็จ!`, payee);
        } else {
          // It's a regular receipt
          const parsed = parseReceiptText(rawText);
          
          payee = parsed.payee || "ร้านค้า";
          tax = parsed.tax || 0.0;
          tip = parsed.tip || 0.0;
          
          if (parsed.items.length > 0) {
            items = parsed.items;
            alerts.success(store.settings.language === 'en'
              ? `Successfully scanned receipt!`
              : `สแกนใบเสร็จสำเร็จ!`, payee);
          } else {
            // If no items, we add one manual placeholder item
            items = [
              {
                id: Math.random().toString(36).substring(2, 11),
                name: "อาหาร / เครื่องดื่ม (ระบุข้อมูลเอง)",
                price: parsed.total > 0 ? (parsed.total - tax - tip) : 100.0,
                qty: 1
              }
            ];
            alerts.warning(store.settings.language === 'en'
              ? "Could not auto-extract items. You can add them manually."
              : "ระบบไม่สามารถดึงข้อมูลรายการอาหารได้อัตโนมัติ คุณสามารถเพิ่มและแก้ไขรายการเองได้เลยค่ะ");
          }
        }
        
        selectedItems = {};
        selectedQuantities = {};
        
      } catch (ocrErr) {
        console.error("Local OCR failed:", ocrErr);
        alerts.error(store.settings.language === 'en'
          ? 'Failed to scan receipt. Please enter items manually.'
          : 'สแกนใบเสร็จล้มเหลว ขออภัยในความไม่สะดวกค่ะ คุณสามารถเพิ่มรายการเองได้เลย');
      } finally {
        spinner.classList.add('hidden');
        renderReceiptPaper(container);
        renderShareSheetChecklist(container);
      }
    }
  });

  // Sheet Pay Button Actions
  container.querySelector('#sheet-action-pay-btn').addEventListener('click', () => {
    executePayment(container);
  });
}

function showEditMetaModal(container) {
  const isDark = store.settings.isDarkMode;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-dialog" style="background: ${isDark ? '#1C2128' : '#FFFFFF'}; color: var(--text-primary);">
      <div class="modal-header">
        <h3 class="modal-title">แก้ไขข้อมูลใบเสร็จ</h3>
        <button class="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body" style="padding-top: 10px; display: flex; flex-direction: column; gap: 16px;">
        <div class="form-group">
          <label class="form-label">ชื่อผู้รับเงิน / ร้านค้า</label>
          <input type="text" id="edit-payee-name" class="form-control" value="${escapeHTML(payee)}" />
        </div>
        <div style="display: flex; gap: 12px;">
          <div class="form-group" style="flex: 1;">
            <label class="form-label">ภาษี (Tax)</label>
            <input type="number" step="0.01" id="edit-tax-val" class="form-control" value="${tax.toFixed(2)}" />
          </div>
          <div class="form-group" style="flex: 1;">
            <label class="form-label">ทิป (Tip)</label>
            <input type="number" step="0.01" id="edit-tip-val" class="form-control" value="${tip.toFixed(2)}" />
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 24px;">
        <button class="btn modal-cancel-btn" style="flex: 1; border: 1px solid var(--border); padding: 12px; border-radius: 12px; font-weight: 700;">ยกเลิก</button>
        <button class="btn-primary modal-save-btn" style="flex: 1; padding: 12px; border-radius: 12px;">บันทึก</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => document.body.removeChild(modal);
  modal.querySelector('.modal-close-btn').onclick = close;
  modal.querySelector('.modal-cancel-btn').onclick = close;
  modal.querySelector('.modal-save-btn').onclick = () => {
    payee = modal.querySelector('#edit-payee-name').value.trim() || "ร้านค้า";
    tax = parseFloat(modal.querySelector('#edit-tax-val').value) || 0.0;
    tip = parseFloat(modal.querySelector('#edit-tip-val').value) || 0.0;
    
    close();
    renderReceiptPaper(container);
    renderShareSheetChecklist(container);
  };
}

function showAddItemModal(container) {
  const isDark = store.settings.isDarkMode;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-dialog" style="background: ${isDark ? '#1C2128' : '#FFFFFF'}; color: var(--text-primary);">
      <div class="modal-header">
        <h3 class="modal-title">เพิ่มรายการอาหาร</h3>
        <button class="modal-close-btn">&times;</button>
      </div>
      <div class="modal-body" style="padding-top: 10px; display: flex; flex-direction: column; gap: 16px;">
        <div class="form-group">
          <label class="form-label">ชื่ออาหาร / สินค้า</label>
          <input type="text" id="add-item-name" class="form-control" placeholder="เช่น สลัดผัก, กาแฟร้อน" />
        </div>
        <div style="display: flex; gap: 12px;">
          <div class="form-group" style="flex: 1;">
            <label class="form-label">ราคาต่อหน่วย</label>
            <input type="number" step="0.01" id="add-item-price" class="form-control" placeholder="0.00" />
          </div>
          <div class="form-group" style="flex: 1;">
            <label class="form-label">จำนวน</label>
            <input type="number" id="add-item-qty" class="form-control" value="1" />
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 24px;">
        <button class="btn modal-cancel-btn" style="flex: 1; border: 1px solid var(--border); padding: 12px; border-radius: 12px; font-weight: 700;">ยกเลิก</button>
        <button class="btn-primary modal-save-btn" style="flex: 1; padding: 12px; border-radius: 12px;">เพิ่ม</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => document.body.removeChild(modal);
  modal.querySelector('.modal-close-btn').onclick = close;
  modal.querySelector('.modal-cancel-btn').onclick = close;
  modal.querySelector('.modal-save-btn').onclick = () => {
    const name = modal.querySelector('#add-item-name').value.trim();
    const price = parseFloat(modal.querySelector('#add-item-price').value) || 0.0;
    const qty = parseInt(modal.querySelector('#add-item-qty').value) || 1;

    if (!name || price <= 0 || qty <= 0) return;

    items.push({
      id: Math.random().toString(36).substring(2, 11),
      name: name,
      price: price,
      qty: qty
    });

    close();
    renderReceiptPaper(container);
    renderShareSheetChecklist(container);
  };
}



function executePayment(container) {
  const shareVal = getUserShare();
  if (shareVal <= 0) return;

  // Convert display share amount back to base THB currency for store storage
  const thbShare = store.settings.selectedCurrency === 'THB'
    ? shareVal
    : shareVal / store.toDisplay(1.0);

  // Add transaction to store
  store.addTransaction({
    title: `ส่วนแบ่งบิล (${payee || "Molly Wiebe"})`,
    amount: thbShare,
    isIncome: false,
    category: "Food",
    date: new Date()
  });

  // Show premium success overlay/modal
  const isDark = store.settings.isDarkMode;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-dialog" style="background: #1C2128; border-radius: 20px; text-align: center; color: white;">
      <div style="padding: 10px 0;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" style="margin: 0 auto 16px auto;"><circle cx="12" cy="12" r="10"/><polyline points="8 12 11 15 16 10"/></svg>
        <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: white;">ชำระเงินสำเร็จ!</h3>
        <p style="margin: 0; font-size: 13px; color: rgba(255, 255, 255, 0.5); line-height: 1.5;">
          บันทึกค่าใช้จ่ายส่วนแบ่งบิลจำนวน ${store.getCurrencySymbol()}${shareVal.toFixed(2)} ลงใน FinTrack สำเร็จแล้ว
        </p>
        <button id="success-done-btn" class="btn-primary" style="margin-top: 24px; width: 100%; border-radius: 12px; padding: 12px; font-weight: 700;">เสร็จสิ้น</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#success-done-btn').onclick = () => {
    document.body.removeChild(modal);
    router.navigate('dashboard');
  };
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

function scanImageQR(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          resolve(code ? code.data : null);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (err) => reject(err);
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function parseSlipQR(qrData) {
  if (!qrData.startsWith('00')) return null;
  
  // Helper to parse TLV
  const parseTLV = (s) => {
    const res = {};
    let idx = 0;
    while (idx < s.length) {
      const tag = s.substr(idx, 2);
      const len = parseInt(s.substr(idx + 2, 2));
      if (isNaN(len)) break;
      const val = s.substr(idx + 4, len);
      res[tag] = val;
      idx += 4 + len;
    }
    return res;
  };

  const outerTags = parseTLV(qrData);
  
  // Detect if it is a Slip Verification QR (Mini QR)
  if (outerTags['00'] && outerTags['00'].length > 10) {
    const subTags = parseTLV(outerTags['00']);
    const sendingBankCode = subTags['01'] || '';
    const ref = subTags['02'] || '';
    const amountVal = subTags['04'] ? parseFloat(subTags['04']) : null;
    
    // Map bank code to name
    const bankMap = {
      '002': 'ธนาคารกรุงเทพ',
      '004': 'ธนาคารกสิกรไทย',
      '006': 'ธนาคารกรุงไทย',
      '011': 'ธนาคารทหารไทยธนชาต',
      '014': 'ธนาคารไทยพาณิชย์',
      '025': 'ธนาคารกรุงศรีอยุธยา',
      '030': 'ธนาคารออมสิน',
      '034': 'ธ.ก.ส.',
      '065': 'ธนาคารอาคารสงเคราะห์',
      '073': 'ธนาคารแลนด์ แอนด์ เฮ้าส์'
    };
    const bankName = bankMap[sendingBankCode] || 'ธนาคาร';

    // Parse date from ref (YYYYMMDDHHmm)
    let parsedDate = '';
    if (ref.length >= 12) {
      const match = ref.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);
      if (match) {
        parsedDate = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`;
      }
    }

    return {
      type: 'slip',
      title: `โอนเงินผ่าน${bankName}`,
      amount: amountVal,
      date: parsedDate,
      bankCode: sendingBankCode,
      ref: ref
    };
  }
  
  // Detect if it is a Payment PromptPay QR
  if (outerTags['29'] || outerTags['30']) {
    const amountVal = outerTags['54'] ? parseFloat(outerTags['54']) : null;
    return {
      type: 'payment',
      title: 'สแกนจ่ายพร้อมเพย์',
      amount: amountVal,
      date: '',
      ref: ''
    };
  }

  return null;
}
