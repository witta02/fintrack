import { store } from '../store.js';
import { router } from '../router.js';
import { renderSpendingChart } from '../components/spendingChart.js';
import { createTransactionTile } from '../components/transactionTile.js';
import { t } from '../i18n.js';
import { convertToTHB } from '../currency.js';

let activePeriod = 'monthly'; // 'daily', 'monthly', 'yearly', 'all'

export function renderDashboard(container) {
  // Build HTML template
  container.innerHTML = `
    <div class="screen-header" style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 20px;">
      <div class="brand-group" style="display: flex; align-items: center; gap: 8px;">
        <h1 class="brand-title" style="font-size: 24px; font-weight: 800; letter-spacing: -1px; background: linear-gradient(135deg, var(--gold), var(--amber)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">FinTrack</h1>
        <span class="premium-badge" style="background: rgba(255, 193, 7, 0.1); color: var(--gold); padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; border: 1px solid rgba(255, 193, 7, 0.2);">PRO</span>
      </div>
      <button id="theme-toggle-btn" class="icon-btn" style="width: 40px; height: 40px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); transition: all var(--transition);">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/>
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

    <!-- Balance Card -->
    <div class="balance-card" id="balance-card-clickable">
      <div class="period-label">${activePeriod === 'daily' ? t('balanceToday') : activePeriod === 'monthly' ? t('balanceMonth') : activePeriod === 'yearly' ? t('balanceYear') : t('balanceAll')}</div>
      <div class="balance-amount" id="card-balance">฿0.00</div>
      <div class="balance-row">
        <div class="balance-item income">
          <div class="balance-item-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
          </div>
          <div>
            <div class="balance-item-label">${t('income')}</div>
            <div class="balance-item-value" id="card-income">฿0.00</div>
            <div class="balance-item-tax" id="card-income-tax">ภาษี ฿0.00</div>
          </div>
        </div>
        <div class="balance-item expense">
          <div class="balance-item-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
          </div>
          <div>
            <div class="balance-item-label">${t('expense')}</div>
            <div class="balance-item-value" id="card-expense">฿0.00</div>
          </div>
        </div>
      </div>
    </div>

    <div id="starter-guide" class="starter-guide hidden">
      <div class="starter-guide-header">
        <div>
          <div class="eyebrow">${t('starterEyebrow')}</div>
          <h2>${t('starterTitle')}</h2>
        </div>
        <button id="dismiss-starter-btn" class="icon-btn" title="ซ่อนคำแนะนำ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
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
          <span class="step-icon planner-bg">÷</span>
          <span>
            <strong>${t('starterPlannerTitle')}</strong>
            <small>${t('starterPlannerDesc')}</small>
          </span>
        </button>
      </div>
    </div>

    <!-- Chart Section -->
    <div class="chart-card">
      <div class="chart-header">
        <h3 class="card-title">${t('analysis')}</h3>
        <div class="chart-legends">
          <span class="legend"><span class="dot dot-expense"></span>${t('chartExpense')}</span>
          <span class="legend"><span class="dot dot-income"></span>${t('chartIncome')}</span>
        </div>
      </div>
      <div class="chart-container" style="height: 180px;">
        <canvas id="spending-chart-canvas"></canvas>
      </div>
    </div>

    <!-- Recent Transactions -->
    <div class="section-header" style="margin-top: 24px; display: flex; align-items: center; justify-content: space-between;">
      <h3 class="section-title" style="font-size: 16px; font-weight: 800; color: var(--text-primary);">${t('recentTransactions')}</h3>
      <button id="view-all-transactions-btn" class="text-link-btn" style="color: var(--gold); font-size: 13px; font-weight: 600;">${t('viewAll')}</button>
    </div>
    <div id="recent-transactions-list" class="transactions-list-container" style="margin-top: 12px;">
      <!-- Loaded dynamically -->
    </div>

    <div style="height: 100px;"></div>
  `;

  // Setup Event Listeners
  setupEventListeners(container);

  // Initial Update
  updateUI(container);

  // Subscribe to store updates
  const unsubscribe = store.subscribe(() => {
    // Check if the element is still in DOM to prevent memory leak
    if (document.getElementById('card-balance')) {
      updateUI(container);
    } else {
      unsubscribe();
    }
  });
}

function setupEventListeners(container) {
  // Theme Toggle
  container.querySelector('#theme-toggle-btn').addEventListener('click', () => {
    store.toggleTheme();
  });

  // Period Selector Tab Clicks
  container.querySelectorAll('.period-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activePeriod = tab.getAttribute('data-period');
      updateUI(container);
    });
  });

  // View All button
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

  // Balance card click to show full amount popup
  const balanceCard = container.querySelector('#balance-card-clickable');
  if (balanceCard) {
    balanceCard.addEventListener('click', () => {
      showBalancePopup(container);
    });
  }
}

function updateUI(container) {
  const metrics = store.getFinanceMetrics();
  const symbol = store.getCurrencySymbol();

  // Get active period metrics
  let balance = 0;
  let income = 0;
  let expense = 0;

  switch (activePeriod) {
    case 'daily':
      balance = metrics.dailyBalance;
      income = metrics.dailyIncome;
      expense = metrics.dailyExpense;
      break;
    case 'monthly':
      balance = metrics.monthlyBalance;
      income = metrics.monthlyIncome;
      expense = metrics.monthlyExpense;
      break;
    case 'yearly':
      balance = metrics.yearlyBalance;
      income = metrics.yearlyIncome;
      expense = metrics.yearlyExpense;
      break;
    case 'all':
      balance = metrics.totalBalance;
      income = metrics.totalIncome;
      expense = metrics.totalExpense;
      break;
  }

  // Render metrics to card
  const formatVal = (val) => `${symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  container.querySelector('#card-balance').textContent = formatVal(balance);
  container.querySelector('#card-income').textContent = formatVal(income);
  container.querySelector('#card-expense').textContent = formatVal(expense);

  // Calculate and display tax (based on yearly income)
  const yearlyIncomeInTHB = store.settings.selectedCurrency === 'THB'
    ? metrics.yearlyIncome
    : convertToTHB(metrics.yearlyIncome, store.settings.selectedCurrency);
  const taxAmountTHB = store.calculateThaiTax(yearlyIncomeInTHB);
  const taxAmountDisplay = store.toDisplay(taxAmountTHB);
  container.querySelector('#card-income-tax').textContent = `${t('tax')} ${formatVal(taxAmountDisplay)}`;

  // Render Spending Chart
  const canvas = container.querySelector('#spending-chart-canvas');
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyExpenses = store.getDailyExpensesForMonth();
  const dailyIncome = store.getDailyIncomeForMonth();
  
  renderSpendingChart(canvas, dailyExpenses, dailyIncome, daysInMonth, symbol);

  // Render Recent Transactions
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
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
        </div>
        <p class="empty-text">${t('emptyTransactions')}</p>
        <p class="empty-subtext">${t('emptyTransactionsHint')}</p>
        <button id="dashboard-add-first-btn" class="btn btn-primary" style="margin-top: 12px; font-size: 13px; padding: 8px 16px;">${t('addFirst')}</button>
      </div>
    `;
    const addBtn = listContainer.querySelector('#dashboard-add-first-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        router.navigate('addTransaction');
      });
    }
  } else {
    transactions.forEach(t => {
      const tile = createTransactionTile(
        t,
        symbol,
        store.toDisplay(t.amount),
        // onEdit callback
        (transaction) => {
          router.navigate('addTransaction', { transactionId: transaction.id });
        },
        // onDelete callback
        (id) => {
          if (confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
            store.deleteTransaction(id);
          }
        }
      );
      listContainer.appendChild(tile);
    });
  }
}
