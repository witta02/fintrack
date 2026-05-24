import { store } from '../store.js';
import { router } from '../router.js';
import { renderSpendingChart } from '../components/spendingChart.js';
import { createTransactionTile } from '../components/transactionTile.js';

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
      <button class="period-tab ${activePeriod === 'daily' ? 'active' : ''}" data-period="daily">วันนี้</button>
      <button class="period-tab ${activePeriod === 'monthly' ? 'active' : ''}" data-period="monthly">เดือนนี้</button>
      <button class="period-tab ${activePeriod === 'yearly' ? 'active' : ''}" data-period="yearly">ปีนี้</button>
      <button class="period-tab ${activePeriod === 'all' ? 'active' : ''}" data-period="all">ทั้งหมด</button>
    </div>

    <!-- Balance Card -->
    <div class="balance-card">
      <div class="period-label">${activePeriod === 'daily' ? 'ยอดวันนี้' : activePeriod === 'monthly' ? 'ยอดเดือนนี้' : activePeriod === 'yearly' ? 'ยอดปีนี้' : 'ยอดทั้งหมด'}</div>
      <div class="balance-amount" id="card-balance">฿0.00</div>
      <div class="balance-row">
        <div class="balance-item income">
          <div class="balance-item-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
          </div>
          <div>
            <div class="balance-item-label">รายรับ</div>
            <div class="balance-item-value" id="card-income">฿0.00</div>
          </div>
        </div>
        <div class="balance-item expense">
          <div class="balance-item-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
          </div>
          <div>
            <div class="balance-item-label">รายจ่าย</div>
            <div class="balance-item-value" id="card-expense">฿0.00</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Chart Section -->
    <div class="chart-card">
      <div class="chart-header">
        <h3 class="card-title">วิเคราะห์การเงิน</h3>
        <div class="chart-legends">
          <span class="legend"><span class="dot dot-expense"></span>จ่าย</span>
          <span class="legend"><span class="dot dot-income"></span>รับ</span>
        </div>
      </div>
      <div class="chart-container" style="height: 180px;">
        <canvas id="spending-chart-canvas"></canvas>
      </div>
    </div>

    <!-- Recent Transactions -->
    <div class="section-header" style="margin-top: 24px; display: flex; align-items: center; justify-content: space-between;">
      <h3 class="section-title" style="font-size: 16px; font-weight: 800; color: var(--text-primary);">รายการล่าสุด</h3>
      <button id="view-all-transactions-btn" class="text-link-btn" style="color: var(--gold); font-size: 13px; font-weight: 600;">ดูทั้งหมด</button>
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

  if (transactions.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
        </div>
        <p class="empty-text">ยังไม่มีการบันทึกรายการใดๆ</p>
        <button id="dashboard-add-first-btn" class="btn btn-primary" style="margin-top: 12px; font-size: 13px; padding: 8px 16px;">เพิ่มรายการแรก</button>
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
