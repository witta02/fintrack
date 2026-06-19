import { store } from '../store.js';
import { router } from '../router.js';
import { renderSpendingChart, renderCategoryPieChart } from '../components/spendingChart.js';
import { createTransactionTile } from '../components/transactionTile.js';
import { t } from '../i18n.js';
import { convertToTHB } from '../currency.js';
import { alerts } from '../utils/alertHelper.js';

let activePeriod = 'monthly';
let analysisPeriod = 'monthly';
let analysisMonth = new Date().getMonth();
let analysisYear = new Date().getFullYear();

export function renderDashboard(container) {
    container.innerHTML = `
    <!-- Dashboard Top Bar -->
    <div class="dashboard-top-bar">
      <div class="screen-header" style="padding-bottom: 18px; margin-bottom: 0;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <h1 class="brand-title shimmer-text desktop-hide" style="font-size: 26px; font-weight: 900; letter-spacing: -1px; margin-bottom: 0;">FinTrack</h1>
          <span class="premium-badge desktop-hide">PRO</span>
          <h1 class="screen-title-desktop desktop-only" style="font-size: 26px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.5px; margin-bottom: 0;">ภาพรวม</h1>
        </div>
        <button id="theme-toggle-btn" class="icon-btn mobile-only" title="Toggle Theme">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/>
            <path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/>
            <path d="M2 12h2"/><path d="M20 12h2"/>
            <path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/>
          </svg>
        </button>
      </div>

      <!-- Period Selector -->
      <div class="period-selector">
        <button class="period-tab ${activePeriod === 'daily' ? 'active' : ''}" data-period="daily">${t('dashboardToday')}</button>
        <button class="period-tab ${activePeriod === 'monthly' ? 'active' : ''}" data-period="monthly">${t('dashboardMonth')}</button>
        <button class="period-tab ${activePeriod === 'yearly' ? 'active' : ''}" data-period="yearly">${t('dashboardYear')}</button>
        <button class="period-tab ${activePeriod === 'all' ? 'active' : ''}" data-period="all">${t('dashboardAll')}</button>
      </div>
    </div>

    <!-- Balance Cards Container -->
    <div class="balance-cards-container">
      <div class="balance-card-main" id="balance-card-clickable">
        <div class="period-label" id="period-label-text">
          ${activePeriod === 'daily' ? t('balanceToday') : activePeriod === 'monthly' ? t('balanceMonth') : activePeriod === 'yearly' ? t('balanceYear') : t('balanceAll')}
        </div>
        <div class="balance-amount" id="card-balance">฿0.00</div>
      </div>
      <div class="balance-row">
        <div class="balance-item income">
          <div class="balance-item-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <div class="balance-item-label">${t('income')}</div>
              <span style="font-size: 9px; color: var(--gold); font-weight: 800; background: rgba(245,200,66,0.12); padding: 1px 4px; border-radius: 4px;">${t('tax')}</span>
            </div>
            <div class="balance-item-value" id="card-income">฿0.00</div>
            <div class="balance-item-tax" id="card-income-tax">ภาษี ฿0.00</div>
          </div>
        </div>
        <div class="balance-item expense">
          <div class="balance-item-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
          </div>
          <div>
            <div class="balance-item-label">${t('expense')}</div>
            <div class="balance-item-value" id="card-expense">฿0.00</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Starter Guide -->
    <div id="starter-guide" class="starter-guide hidden">
      <div class="starter-guide-header">
        <div>
          <div class="eyebrow">${t('starterEyebrow')}</div>
          <h2>${t('starterTitle')}</h2>
        </div>
        <button id="dismiss-starter-btn" class="icon-btn" title="ซ่อน">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      <div class="starter-steps">
        <button class="starter-step" data-screen-target="addTransaction">
          <span class="step-icon income-bg">+</span>
          <span>
            <strong>${t('starterIncomeTitle')}</strong>
            <small>${t('starterIncomeDesc')}</small>
          </span>
        </button>
        <button class="starter-step" data-screen-target="addTransaction">
          <span class="step-icon expense-bg">-</span>
          <span>
            <strong>${t('starterExpenseTitle')}</strong>
            <small>${t('starterExpenseDesc')}</small>
          </span>
        </button>
        <button class="starter-step" data-screen-target="planner">
          <span class="step-icon planner-bg">✦</span>
          <span>
            <strong>${t('starterPlannerTitle')}</strong>
            <small>${t('starterPlannerDesc')}</small>
          </span>
        </button>
      </div>
    </div>

    <!-- Dashboard Bottom Grid -->
    <div class="dashboard-grid">
      <div class="dashboard-grid-main">
        <!-- Chart Card -->
        <div class="chart-card">
          <div class="chart-header">
            <div>
              <div class="section-eyebrow">${t('analysis')}</div>
              <h3 class="card-title" style="font-size: 15px; margin-top: 2px;">${t('dashboardMonth')}</h3>
            </div>
            <div class="chart-legends">
              <span class="legend"><span class="dot dot-expense"></span>${t('chartExpense')}</span>
              <span class="legend"><span class="dot dot-income"></span>${t('chartIncome')}</span>
            </div>
          </div>

          <div class="analysis-controls">
            <select id="analysis-period-select" class="analysis-select">
              <option value="monthly" ${analysisPeriod === 'monthly' ? 'selected' : ''}>รายเดือน</option>
              <option value="yearly" ${analysisPeriod === 'yearly' ? 'selected' : ''}>รายปี</option>
            </select>
            <select id="analysis-month-select" class="analysis-select ${analysisPeriod !== 'monthly' ? 'hidden' : ''}">
              ${Array.from({ length: 12 }, (_, i) => `
                <option value="${i}" ${analysisMonth === i ? 'selected' : ''}>${new Date(2000, i).toLocaleString('th-TH', { month: 'long' })}</option>
              `).join('')}
            </select>
          </div>

          <div class="chart-container" style="height: 180px;">
            <canvas id="spending-chart-canvas"></canvas>
          </div>
        </div>

        <!-- Category Pie Card -->
        <div class="card pie-chart-card">
          <div class="section-eyebrow" style="margin-bottom: 4px;">สัดส่วนรายจ่าย</div>
          <h3 class="card-title" style="font-size: 15px; margin-bottom: 14px;">แยกตามหมวดหมู่</h3>
          <div style="height: 200px; width: 100%;">
            <canvas id="category-pie-chart-canvas"></canvas>
          </div>
          <div id="pie-chart-legend" class="pie-chart-legend"></div>
        </div>
      </div>

      <div class="dashboard-grid-sidebar">
        <!-- Recent Transactions -->
        <div style="margin-bottom: 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
            <div>
              <div class="section-eyebrow">${t('recentTransactions')}</div>
              <h3 class="section-title" style="font-size: 16px; margin-top: 2px;">${t('recentTransactions')}</h3>
            </div>
            <button id="view-all-transactions-btn" style="
              color: var(--gold);
              font-size: 12px;
              font-weight: 700;
              display: flex;
              align-items: center;
              gap: 4px;
              background: rgba(245,200,66,0.08);
              border: 1px solid rgba(245,200,66,0.15);
              padding: 6px 12px;
              border-radius: 999px;
              transition: all var(--transition);
            ">${t('viewAll')} →</button>
          </div>
          <div id="recent-transactions-list"></div>
        </div>
      </div>
    </div>
  `;

  setupEventListeners(container);
  updateUI(container);

  const unsubscribe = store.subscribe(() => {
    if (document.getElementById('card-balance')) {
      updateUI(container);
    } else {
      unsubscribe();
    }
  });
}

function showBalancePopup(container) {
  const metrics = store.getFinanceMetrics();
  const symbol = store.getCurrencySymbol();
  let amount = 0;
  let label = '';

  switch (activePeriod) {
    case 'daily':   amount = metrics.dailyBalance;   label = t('balanceToday'); break;
    case 'monthly': amount = metrics.monthlyBalance; label = t('balanceMonth'); break;
    case 'yearly':  amount = metrics.yearlyBalance;  label = t('balanceYear');  break;
    case 'all':     amount = metrics.totalBalance;   label = t('balanceAll');   break;
  }

  const isPositive = amount >= 0;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 class="modal-title">รายละเอียดยอดคงเหลือ</h3>
        <button class="modal-close-btn">×</button>
      </div>
      <div class="amount-popup-content">
        <div class="amount-popup-label">${label}</div>
        <div class="amount-popup-value" style="${isPositive ? '' : 'background: linear-gradient(135deg,#f87171,#ef4444); -webkit-background-clip:text; -webkit-text-fill-color:transparent;'}">
          ${symbol}${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style="margin-top: 12px; font-size: 12px; color: var(--text-secondary);">
          ${isPositive ? '✅ ยอดคงเหลือเป็นบวก' : '⚠️ ยอดคงเหลือติดลบ'}
        </div>
      </div>
      <button class="btn-primary modal-ok-btn" style="margin-top: 24px;">ตกลง</button>
    </div>
  `;

  document.body.appendChild(modal);
  const close = () => document.body.removeChild(modal);
  modal.querySelector('.modal-close-btn').onclick = close;
  modal.querySelector('.modal-ok-btn').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };
}

function setupEventListeners(container) {
  container.querySelector('#theme-toggle-btn').addEventListener('click', () => {
    store.toggleTheme();
  });

  container.querySelectorAll('.period-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activePeriod = tab.getAttribute('data-period');
      updateUI(container);
    });
  });

  container.querySelector('#analysis-period-select').addEventListener('change', (e) => {
    analysisPeriod = e.target.value;
    container.querySelector('#analysis-month-select').classList.toggle('hidden', analysisPeriod !== 'monthly');
    updateUI(container);
  });

  container.querySelector('#analysis-month-select').addEventListener('change', (e) => {
    analysisMonth = parseInt(e.target.value);
    updateUI(container);
  });

  container.querySelector('#view-all-transactions-btn').addEventListener('click', () => {
    router.navigate('transactions');
  });

  container.querySelectorAll('[data-screen-target]').forEach(btn => {
    btn.addEventListener('click', () => {
      router.navigate(btn.getAttribute('data-screen-target'));
    });
  });

  container.querySelector('#dismiss-starter-btn').addEventListener('click', () => {
    store.completeOnboarding();
    const guide = container.querySelector('#starter-guide');
    if (guide) guide.classList.add('hidden');
  });

  const balanceCard = container.querySelector('#balance-card-clickable');
  if (balanceCard) {
    balanceCard.addEventListener('click', () => showBalancePopup(container));
  }
}

function updateUI(container) {
  const metrics = store.getFinanceMetrics();
  const symbol = store.getCurrencySymbol();

  let balance = 0, income = 0, expense = 0;
  switch (activePeriod) {
    case 'daily':
      balance = metrics.dailyBalance; income = metrics.dailyIncome; expense = metrics.dailyExpense; break;
    case 'monthly':
      balance = metrics.monthlyBalance; income = metrics.monthlyIncome; expense = metrics.monthlyExpense; break;
    case 'yearly':
      balance = metrics.yearlyBalance; income = metrics.yearlyIncome; expense = metrics.yearlyExpense; break;
    case 'all':
      balance = metrics.totalBalance; income = metrics.totalIncome; expense = metrics.totalExpense; break;
  }

  const labelText = activePeriod === 'daily' ? t('balanceToday') : activePeriod === 'monthly' ? t('balanceMonth') : activePeriod === 'yearly' ? t('balanceYear') : t('balanceAll');
  const periodLabel = container.querySelector('#period-label-text');
  if (periodLabel) periodLabel.textContent = labelText;

  const formatVal = (val) => `${symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  container.querySelector('#card-balance').textContent = formatVal(balance);
  container.querySelector('#card-income').textContent = formatVal(income);
  container.querySelector('#card-expense').textContent = formatVal(expense);

  // Tax estimate
  const yearlyIncomeInTHB = store.settings.selectedCurrency === 'THB'
    ? metrics.yearlyIncome
    : convertToTHB(metrics.yearlyIncome, store.settings.selectedCurrency);
  const taxAmountTHB = store.calculateThaiTax(yearlyIncomeInTHB);
  const taxAmountDisplay = store.toDisplay(taxAmountTHB);
  container.querySelector('#card-income-tax').textContent = `ประมาณการภาษี: ${formatVal(taxAmountDisplay)}`;

  // Bar chart
  const canvas = container.querySelector('#spending-chart-canvas');
  if (analysisPeriod === 'monthly') {
    const daysInMonth = new Date(analysisYear, analysisMonth + 1, 0).getDate();
    renderSpendingChart(canvas, store.getDailyExpensesForMonth(), store.getDailyIncomeForMonth(), daysInMonth, symbol);
  } else {
    renderSpendingChart(canvas, store.getDailyExpensesForMonth(), store.getDailyIncomeForMonth(), 31, symbol);
  }

  // Pie chart
  const pieCanvas = container.querySelector('#category-pie-chart-canvas');
  const categoryData = store.getCategorySpending(analysisPeriod, analysisMonth, analysisYear);
  const pieInfo = renderCategoryPieChart(pieCanvas, categoryData, symbol);

  const legendContainer = container.querySelector('#pie-chart-legend');
  legendContainer.innerHTML = '';
  if (pieInfo) {
    pieInfo.categories.forEach((cat, i) => {
      const val = pieInfo.dataValues[i];
      const percent = ((val / pieInfo.total) * 100).toFixed(1);
      const item = document.createElement('div');
      item.className = 'pie-legend-item';
      item.innerHTML = `
        <span class="pie-dot" style="background: ${pieInfo.colors[i]}"></span>
        <span>${cat} <strong style="color:var(--text-primary)">${percent}%</strong></span>
      `;
      legendContainer.appendChild(item);
    });
  }

  // Recent transactions
  const listContainer = container.querySelector('#recent-transactions-list');
  listContainer.innerHTML = '';

  const transactions = store.getAllTransactions().slice(0, 5);
  const allTransactions = store.getAllTransactions();
  const starterGuide = container.querySelector('#starter-guide');

  if (starterGuide) {
    starterGuide.classList.toggle('hidden', allTransactions.length > 0 || store.settings.hasCompletedOnboarding);
  }

  if (transactions.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state" style="padding: 32px 20px;">
        <div class="empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
        </div>
        <p class="empty-text">${t('emptyTransactions')}</p>
        <p class="empty-subtext">${t('emptyTransactionsHint')}</p>
        <button id="dashboard-add-first-btn" class="btn-primary" style="margin-top: 16px; width: auto; padding: 10px 24px; font-size: 13px;">${t('addFirst')}</button>
      </div>
    `;
    const addBtn = listContainer.querySelector('#dashboard-add-first-btn');
    if (addBtn) addBtn.addEventListener('click', () => router.navigate('addTransaction'));
  } else {
    transactions.forEach(tx => {
      const tile = createTransactionTile(
        tx, symbol, store.toDisplay(tx.amount),
        (transaction) => router.navigate('addTransaction', { transactionId: transaction.id }),
        async (id) => {
          const isConfirmed = await alerts.confirmDelete(
            store.settings.language === 'en' ? 'Delete Transaction?' : 'ต้องการลบรายการ?',
            store.settings.language === 'en' ? 'This action cannot be undone.' : 'รายการนี้จะถูกลบออกอย่างถาวร'
          );
          if (isConfirmed) store.deleteTransaction(id);
        }
      );
      listContainer.appendChild(tile);
    });
  }
}
