import { store } from '../store.js';
import { router } from '../router.js';
import { t, locale, getLanguage } from '../i18n.js';
import { alerts } from '../utils/alertHelper.js';
import { getCategoryInfo } from '../categories.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function renderExport(container) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  container.innerHTML = `
    <div class="screen-header" style="display: flex; align-items: center; gap: 16px; padding-bottom: 20px;">
      <button id="back-btn" class="icon-btn-secondary" style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: var(--text-primary);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      </button>
      <h1 class="brand-title" style="font-size: 24px; font-weight: 800; letter-spacing: -1px; color: var(--text-primary); margin: 0;">${t('exportTitle')}</h1>
    </div>

    <div class="export-options" style="display: flex; flex-direction: column; gap: 20px;">
      <!-- Filter Type Selector -->
      <div class="form-group">
        <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: var(--text-secondary);">${t('category')}</label>
        <div class="period-selector" style="margin-bottom: 16px;">
          <button class="period-tab active" data-mode="month">${t('exportMonth')}</button>
          <button class="period-tab" data-mode="year">${t('exportYear')}</button>
          <button class="period-tab" data-mode="range">${t('exportRange')}</button>
        </div>
      </div>

      <!-- Month Selector -->
      <div id="month-selector-container" class="filter-section">
        <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: var(--text-secondary);">${t('selectMonth')}</label>
        <input type="month" id="export-month" class="form-control" value="${currentYear}-${String(currentMonth + 1).padStart(2, '0')}" style="width: 100%; height: 50px; border-radius: 14px; background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); padding: 0 16px;">
      </div>

      <!-- Year Selector -->
      <div id="year-selector-container" class="filter-section" style="display: none;">
        <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: var(--text-secondary);">${t('selectYear')}</label>
        <select id="export-year" class="form-control" style="width: 100%; height: 50px; border-radius: 14px; background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); padding: 0 16px;">
          ${Array.from({length: 5}, (_, i) => currentYear - i).map(y => `<option value="${y}">${y}</option>`).join('')}
        </select>
      </div>

      <!-- Range Selector (Responsive Fix) -->
      <div id="range-selector-container" class="filter-section" style="display: none; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; width: 100%;">
        <div style="width: 100%;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: var(--text-secondary);">${t('startDate')}</label>
          <input type="date" id="export-start-date" class="form-control" value="${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01" style="width: 100%; height: 50px; border-radius: 14px; background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); padding: 0 16px; font-size: 14px;">
        </div>
        <div style="width: 100%;">
          <label style="display: block; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: var(--text-secondary);">${t('endDate')}</label>
          <input type="date" id="export-end-date" class="form-control" value="${now.toISOString().split('T')[0]}" style="width: 100%; height: 50px; border-radius: 14px; background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); padding: 0 16px; font-size: 14px;">
        </div>
      </div>

      <button id="print-report-btn" class="primary-btn" style="margin-top: 20px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, var(--gold), var(--amber)); color: #000; font-weight: 700; font-size: 16px; border: none; box-shadow: var(--shadow-gold); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        ${t('printReport')}
      </button>
    </div>

    <div id="print-area" style="display: none;"></div>

    <div style="height: 100px;"></div>
  `;

  setupEventListeners(container);
}

function setupEventListeners(container) {
  const backBtn = container.querySelector('#back-btn');
  backBtn.addEventListener('click', () => {
    router.navigate('transactions');
  });

  const tabs = container.querySelectorAll('.period-tab');
  const sections = {
    month: container.querySelector('#month-selector-container'),
    year: container.querySelector('#year-selector-container'),
    range: container.querySelector('#range-selector-container')
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const mode = tab.getAttribute('data-mode');
      Object.keys(sections).forEach(k => {
        sections[k].style.display = k === mode ? (k === 'range' ? 'grid' : 'block') : 'none';
      });
    });
  });

  const printBtn = container.querySelector('#print-report-btn');
  printBtn.addEventListener('click', () => {
    printReport(container);
  });
}

function getFilteredData(container) {
  const mode = container.querySelector('.period-tab.active').getAttribute('data-mode');
  let filteredTransactions = store.getAllTransactions();
  let titleSuffix = '';

  try {
    if (mode === 'month') {
      const monthVal = container.querySelector('#export-month').value;
      if (!monthVal) return null;
      const [y, m] = monthVal.split('-').map(Number);
      filteredTransactions = filteredTransactions.filter(t => t.date.getFullYear() === y && t.date.getMonth() === (m - 1));
      titleSuffix = monthVal;
    } else if (mode === 'year') {
      const y = parseInt(container.querySelector('#export-year').value);
      filteredTransactions = filteredTransactions.filter(t => t.date.getFullYear() === y);
      titleSuffix = y.toString();
    } else if (mode === 'range') {
      const startInput = container.querySelector('#export-start-date').value;
      const endInput = container.querySelector('#export-end-date').value;
      if (!startInput || !endInput) return null;
      const start = new Date(startInput);
      const end = new Date(endInput);
      end.setHours(23, 59, 59, 999);
      filteredTransactions = filteredTransactions.filter(t => t.date >= start && t.date <= end);
      titleSuffix = `${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}`;
    }

    filteredTransactions.sort((a, b) => a.date - b.date);
    return { data: filteredTransactions, suffix: titleSuffix };
  } catch (err) {
    console.error('Filtering error:', err);
    return null;
  }
}

function printReport(container) {
  const result = getFilteredData(container);
  if (!result) return;
  const { data: filteredTransactions, suffix: titleSuffix } = result;

  const symbol = store.getCurrencySymbol();
  const totalIncome = filteredTransactions.filter(t => t.isIncome).reduce((sum, t) => sum + store.toDisplay(t.amount), 0);
  const totalExpense = filteredTransactions.filter(t => !t.isIncome).reduce((sum, t) => sum + store.toDisplay(t.amount), 0);
  const net = totalIncome - totalExpense;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alerts.warning(
      store.settings.language === 'en' ? 'Popups Blocked' : 'การแสดงป๊อปอัปถูกบล็อก',
      store.settings.language === 'en' ? 'Please allow popups to print the report.' : 'กรุณาอนุญาตให้แสดงหน้าต่างป๊อปอัปเพื่อพิมพ์รายงาน'
    );
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${t('pdfHeaderTitle')} - ${titleSuffix}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #333; }
          h1 { color: #000; margin-bottom: 5px; }
          .meta { color: #666; font-size: 14px; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { border: 1px solid #eee; padding: 12px; text-align: left; }
          th { background: #f9f9f9; font-weight: bold; }
          tr:nth-child(even) { background: #fafafa; }
          .income { color: #22c55e; font-weight: bold; }
          .expense { color: #ef4444; font-weight: bold; }
          .summary { margin-left: auto; width: 300px; }
          .summary-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .summary-item.total { border-bottom: none; font-weight: 800; font-size: 18px; margin-top: 10px; color: #000; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>${t('pdfHeaderTitle')}</h1>
        <div class="meta">${t('foundItems', { count: filteredTransactions.length })} | ${t('pdfGeneratedOn')} ${new Date().toLocaleString(locale())}</div>
        
        <table>
          <thead>
            <tr>
              <th>${t('pdfTableDate')}</th>
              <th>${t('pdfTableTitle')}</th>
              <th>${t('pdfTableCategory')}</th>
              <th>${t('pdfTableAmount')}</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTransactions.map(t => `
              <tr>
                <td>${t.date.toLocaleDateString(locale())}</td>
                <td>${t.title}</td>
                <td>${getCategoryInfo(t.category).label}</td>
                <td class="${t.isIncome ? 'income' : 'expense'}">
                  ${t.isIncome ? '+' : '-'}${symbol}${store.toDisplay(t.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-item">
            <span>${t('pdfTotalIncome')}</span>
            <span class="income">${symbol}${totalIncome.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
          <div class="summary-item">
            <span>${t('pdfTotalExpense')}</span>
            <span class="expense">${symbol}${totalExpense.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
          <div class="summary-item total">
            <span>${t('pdfNetBalance')}</span>
            <span>${symbol}${net.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
          </div>
        </div>

        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
