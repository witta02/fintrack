import { store } from "../store.js";
import { router } from "../router.js";
import { t, getMonthNames } from "../i18n.js";
import { calculatePortfolioStats } from "../utils/stockQuotes.js";
import { getWalletIconSvg } from "./wallets.js";

// Category config: emoji + color for each category
const CAT_CONFIG = {
  'Food':          { emoji: '🍜', color: '#FF6B6B' },
  'Transport':     { emoji: '🚗', color: '#4ECDC4' },
  'Shopping':      { emoji: '🛍️', color: '#A855F7' },
  'Bills':         { emoji: '💡', color: '#3B82F6' },
  'Health':        { emoji: '💊', color: '#10B981' },
  'Entertainment': { emoji: '🎮', color: '#F59E0B' },
  'Education':     { emoji: '📚', color: '#EC4899' },
  'Travel':        { emoji: '✈️', color: '#14B8A6' },
  'Salary':        { emoji: '💰', color: '#34D399' },
  'Investment':    { emoji: '📈', color: '#6366F1' },
  'Transfer':      { emoji: '🔁', color: '#8B5CF6' },
  'Other':         { emoji: '📦', color: '#8896B0' },
};

function getCatConfig(category) {
  if (!category) return CAT_CONFIG['Other'];
  const key = Object.keys(CAT_CONFIG).find(k =>
    k.toLowerCase() === category.toLowerCase()
  );
  return CAT_CONFIG[key] || { emoji: '📦', color: '#8896B0' };
}

function fmt(amount) {
  return store.getCurrencySymbol() + store.toDisplay(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

let dashMonth = new Date().getMonth();
let dashYear  = new Date().getFullYear();
let activeWalletId = "all";

export async function renderDashboard(container) {
  const sym = store.getCurrencySymbol();
  const level = store.settings.level || 1;
  const userInitial = store.user ? store.user.email.charAt(0).toUpperCase() : null;
  const wallets = store.getWallets();
  const isTraderMode = store.settings.isTraderMode;
  const portfolio = store.getPortfolio();
  const portfolioStats = isTraderMode ? await calculatePortfolioStats(portfolio.holdings || []) : null;

  const greetingData = (() => {
    const h = new Date().getHours();
    if (h < 12) return { text: store.settings.language === 'en' ? 'Good morning' : 'สวัสดีตอนเช้า', emoji: '🌅' };
    if (h < 17) return { text: store.settings.language === 'en' ? 'Good afternoon' : 'สวัสดีตอนบ่าย', emoji: '☀️' };
    if (h < 21) return { text: store.settings.language === 'en' ? 'Good evening' : 'สวัสดีตอนเย็น', emoji: '🌇' };
    return { text: store.settings.language === 'en' ? 'Good night' : 'สวัสดีตอนดึก', emoji: '🌙' };
  })();

  container.innerHTML = `
    <div class="screen screen-enter" style="padding: 0 16px 8px;">

      <!-- Top Bar -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0 10px;">
        <div>
          <div style="font-size: 11px; color: var(--text-secondary); display:flex; align-items:center; gap:5px;">
            <span>${greetingData.text}</span>
          </div>
          <h1 style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; margin-top: 1px; color: var(--text-primary);">FinTrack <span style="font-size: 13px; color: var(--gold); font-weight: 800;">3.0</span></h1>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button id="wallets-quick-btn" style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 6px 10px; cursor: pointer; display: flex; align-items: center; gap: 6px;" title="Wallets">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--gold);"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            <span style="font-size: 11.5px; font-weight: 700; color: var(--text-primary);">${wallets.length}</span>
          </button>
          <button id="gamification-modal-btn" style="background: rgba(245,200,66,0.12); border: 1px solid rgba(245,200,66,0.25); border-radius: 12px; padding: 6px 10px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
            <span style="font-size: 12px; font-weight: 800; color: var(--gold);">Lv.${level}</span>
          </button>
          ${userInitial ? `<div class="user-pill"><div class="user-pill-avatar">${userInitial}</div>${store.user.email.split('@')[0]}</div>` : ''}
        </div>
      </div>

      <!-- Wallet Selector Chips (Horizontal Bar) -->
      <div style="display: flex; gap: 8px; margin-bottom: 12px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none;">
        <button class="wallet-chip ${activeWalletId === 'all' ? 'active' : ''}" data-wallet="all" style="flex-shrink: 0; padding: 6px 12px; border-radius: 999px; font-size: 11.5px; font-weight: 700; border: 1px solid ${activeWalletId === 'all' ? 'var(--gold)' : 'var(--border)'}; background: ${activeWalletId === 'all' ? 'var(--gold-soft)' : 'var(--surface)'}; color: ${activeWalletId === 'all' ? 'var(--gold)' : 'var(--text-secondary)'}; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
          ${store.settings.language === 'en' ? 'All Wallets' : 'ทุกกระเป๋า'}
        </button>
        ${wallets.map(w => `
          <button class="wallet-chip ${activeWalletId === w.id ? 'active' : ''}" data-wallet="${w.id}" style="flex-shrink: 0; padding: 6px 12px; border-radius: 999px; font-size: 11.5px; font-weight: 700; border: 1px solid ${activeWalletId === w.id ? (w.color || 'var(--gold)') : 'var(--border)'}; background: ${activeWalletId === w.id ? `${w.color}20` : 'var(--surface)'}; color: ${activeWalletId === w.id ? (w.color || 'var(--gold)') : 'var(--text-secondary)'}; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            ${getWalletIconSvg(w.type, 13)}
            <span>${w.name}</span>
          </button>
        `).join('')}
        <button id="add-wallet-chip" style="flex-shrink: 0; padding: 6px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; border: 1px dashed var(--border); background: transparent; color: var(--text-muted); cursor: pointer;">
          + ${store.settings.language === 'en' ? 'Manage' : 'จัดการ'}
        </button>
      </div>

      <!-- Hero Balance Card -->
      <div class="hero-balance-card" id="hero-balance-card">
        <div class="hero-balance-label" id="hero-balance-label">${store.settings.language === 'en' ? 'Total Balance' : 'ยอดเงินรวม'}</div>
        <div class="hero-balance-amount" id="hero-balance-amount">${sym}0.00</div>
        <div class="hero-balance-row">
          <div class="hero-stat">
            <div class="hero-stat-label income">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
              ${store.settings.language === 'en' ? 'Income' : 'รายรับ'}
            </div>
            <div class="hero-stat-value" id="hero-income-amount">${sym}0.00</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-label expense">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
              ${store.settings.language === 'en' ? 'Expenses' : 'รายจ่าย'}
            </div>
            <div class="hero-stat-value" id="hero-expense-amount">${sym}0.00</div>
          </div>
        </div>
      </div>

      <!-- Trader Mode Portfolio Card (if enabled) -->
      ${isTraderMode && portfolioStats ? `
        <div id="trader-widget-card" style="background: linear-gradient(135deg, #0d1527 0%, #151e36 100%); border: 1px solid rgba(99,102,241,0.3); border-radius: var(--radius-xl); padding: 18px; margin-bottom: 16px; position: relative; cursor: pointer; box-shadow: 0 4px 20px rgba(99,102,241,0.12);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 14px;">📈</span>
              <span style="font-size: 12px; font-weight: 800; color: #fff;">${store.settings.language === 'en' ? 'Stock Portfolio' : 'พอร์ตลงทุน (Trader)'}</span>
              <span style="font-size: 9px; font-weight: 800; background: rgba(99,102,241,0.25); color: #818cf8; padding: 1px 6px; border-radius: 999px;">LIVE</span>
            </div>
            <span style="font-size: 11px; font-weight: 700; color: #818cf8;">${store.settings.language === 'en' ? 'View Details →' : 'ดูพอร์ต →'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <div>
              <div style="font-size: 20px; font-weight: 900; color: #fff; font-family: var(--font-heading);">
                ฿${portfolioStats.totalValueTHB.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600;">
                ≈ $${portfolioStats.totalValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 13px; font-weight: 800; color: ${portfolioStats.totalPLTHB >= 0 ? 'var(--income)' : 'var(--expense)'};">
                ${portfolioStats.totalPLTHB >= 0 ? '+' : ''}${portfolioStats.totalPLPct.toFixed(2)}%
              </div>
              <div style="font-size: 10px; color: var(--text-secondary);">
                ${portfolioStats.holdings.length} ${store.settings.language === 'en' ? 'positions' : 'สินทรัพย์'}
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Month Navigator -->
      <div class="month-nav">
        <button class="month-nav-btn" id="month-prev">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="month-nav-label" id="month-nav-label">-</div>
        <button class="month-nav-btn" id="month-next">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <!-- Ring Chart Card -->
      <div class="ring-chart-card">
        <div class="ring-chart-card-title">${store.settings.language === 'en' ? 'Spending by Category' : 'ค่าใช้จ่ายตามหมวด'}</div>
        <div class="ring-chart-wrap">
          <div class="ring-chart-canvas-wrap">
            <canvas id="ring-chart-canvas" width="130" height="130"></canvas>
            <div class="ring-chart-center-label">
              <div class="ring-chart-center-amount" id="ring-center-amount">${sym}0</div>
              <div class="ring-chart-center-sub">${store.settings.language === 'en' ? 'spent' : 'ใช้ไป'}</div>
            </div>
          </div>
          <div class="ring-legend" id="ring-legend"></div>
        </div>
      </div>

      <!-- Category Breakdown -->
      <div class="category-breakdown-card">
        <div class="ring-chart-card-title" style="margin-bottom:12px;">${store.settings.language === 'en' ? 'Top Categories' : 'หมวดหมู่หลัก'}</div>
        <div id="category-breakdown-list"></div>
      </div>

      <!-- Recent Transactions -->
      <div style="margin-bottom: 4px;">
        <div class="recent-header">
          <div class="recent-title">${store.settings.language === 'en' ? 'Recent' : 'รายการล่าสุด'}</div>
          <button class="recent-see-all" id="view-all-btn">${store.settings.language === 'en' ? 'See all' : 'ดูทั้งหมด'} →</button>
        </div>
        <div id="recent-tx-list"></div>
      </div>

    </div>
  `;

  setupDashboardEvents(container);
  updateDashboard(container);

  const unsub = store.subscribe(() => {
    if (document.getElementById('hero-balance-amount')) {
      updateDashboard(container);
    } else {
      unsub();
    }
  });
}

function setupDashboardEvents(container) {
  container.querySelector('#month-prev')?.addEventListener('click', () => {
    dashMonth--;
    if (dashMonth < 0) { dashMonth = 11; dashYear--; }
    updateDashboard(container);
  });
  container.querySelector('#month-next')?.addEventListener('click', () => {
    dashMonth++;
    if (dashMonth > 11) { dashMonth = 0; dashYear++; }
    updateDashboard(container);
  });
  container.querySelector('#view-all-btn')?.addEventListener('click', () => {
    router.navigate('transactions');
  });
  container.querySelector('#gamification-modal-btn')?.addEventListener('click', () => {
    router.navigate('achievements');
  });
  container.querySelector('#wallets-quick-btn')?.addEventListener('click', () => {
    router.navigate('wallets');
  });
  container.querySelector('#add-wallet-chip')?.addEventListener('click', () => {
    router.navigate('wallets');
  });
  container.querySelector('#trader-widget-card')?.addEventListener('click', () => {
    router.navigate('portfolio');
  });

  // Wallet chips click
  container.querySelectorAll(".wallet-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeWalletId = chip.getAttribute("data-wallet");
      renderDashboard(container);
    });
  });
}

function updateDashboard(container) {
  const allTxs    = store.getAllTransactions(activeWalletId);
  const monthTxs  = allTxs.filter(tx => {
    const d = new Date(tx.date);
    return d.getMonth() === dashMonth && d.getFullYear() === dashYear;
  });

  let balance = 0;
  if (activeWalletId === 'all') {
    let totalBal = 0;
    store.getWallets().forEach(w => {
      totalBal += store.getWalletBalance(w.id);
    });
    balance = totalBal;
  } else {
    balance = store.getWalletBalance(activeWalletId);
  }

  const monthIncome  = monthTxs.filter(t => t.isIncome).reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTxs.filter(t => !t.isIncome).reduce((s, t) => s + t.amount, 0);

  // Update hero card
  const heroAmt = document.getElementById('hero-balance-amount');
  const heroInc = document.getElementById('hero-income-amount');
  const heroExp = document.getElementById('hero-expense-amount');
  const heroLbl = document.getElementById('hero-balance-label');

  if (heroLbl) {
    if (activeWalletId === 'all') {
      heroLbl.textContent = store.settings.language === 'en' ? 'Total Balance' : 'ยอดเงินรวม';
    } else {
      const w = store.getWallet(activeWalletId);
      heroLbl.textContent = `${w ? w.name : ''} Balance`;
    }
  }

  if (heroAmt) heroAmt.textContent = fmt(balance);
  if (heroInc) heroInc.textContent = fmt(monthIncome);
  if (heroExp) heroExp.textContent = fmt(monthExpense);

  // Month label
  const months = getMonthNames();
  const monthLabel = document.getElementById('month-nav-label');
  if (monthLabel) monthLabel.textContent = `${months[dashMonth]} ${dashYear}`;

  // Category data
  const expenseTxs = monthTxs.filter(t => !t.isIncome);
  const catMap = {};
  expenseTxs.forEach(tx => {
    const cat = tx.category || 'Other';
    catMap[cat] = (catMap[cat] || 0) + tx.amount;
  });
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const catTotal   = catEntries.reduce((s, [, v]) => s + v, 0);

  // Ring chart
  const ringCanvas = document.getElementById('ring-chart-canvas');
  const ringCenter = document.getElementById('ring-center-amount');
  const ringLegend = document.getElementById('ring-legend');
  if (ringCenter) ringCenter.textContent = fmt(monthExpense);

  if (ringCanvas && catEntries.length > 0) {
    const ctx = ringCanvas.getContext('2d');
    const colors = catEntries.map(([cat]) => getCatConfig(cat).color);
    const values = catEntries.map(([, v]) => v);

    ctx.clearRect(0, 0, 130, 130);
    const cx = 65, cy = 65, r = 55, inner = 36;
    let start = -Math.PI / 2;
    const gap = 0.03;
    values.forEach((val, i) => {
      const slice = (val / catTotal) * (Math.PI * 2) - gap;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + slice);
      ctx.arc(cx, cy, inner, start + slice, start, true);
      ctx.closePath();
      ctx.fillStyle = colors[i];
      ctx.fill();
      start += slice + gap;
    });
  } else if (ringCanvas) {
    const ctx = ringCanvas.getContext('2d');
    ctx.clearRect(0, 0, 130, 130);
    ctx.beginPath();
    ctx.arc(65, 65, 55, 0, Math.PI * 2);
    ctx.arc(65, 65, 36, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();
  }

  if (ringLegend) {
    ringLegend.innerHTML = catEntries.slice(0, 4).map(([cat, val]) => {
      const cfg = getCatConfig(cat);
      const pct = catTotal > 0 ? Math.round((val / catTotal) * 100) : 0;
      return `
        <div class="ring-legend-item">
          <div class="ring-legend-dot" style="background:${cfg.color}"></div>
          <span class="ring-legend-name">${cat}</span>
          <span class="ring-legend-pct">${pct}%</span>
        </div>`;
    }).join('');
  }

  // Category breakdown list
  const breakdownList = document.getElementById('category-breakdown-list');
  if (breakdownList) {
    if (catEntries.length === 0) {
      breakdownList.innerHTML = `<div style="text-align:center; padding: 20px 0; color: var(--text-muted); font-size:13px;">${store.settings.language === 'en' ? 'No expenses this month' : 'ยังไม่มีรายจ่ายเดือนนี้'} 🎉</div>`;
    } else {
      breakdownList.innerHTML = catEntries.map(([cat, val]) => {
        const cfg = getCatConfig(cat);
        const pct = catTotal > 0 ? (val / catTotal) * 100 : 0;
        return `
          <div class="category-row">
            <div class="category-icon-pill" style="background:${cfg.color}22;">${cfg.emoji}</div>
            <div style="flex:1; min-width:0;">
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span class="category-row-name">${cat}</span>
                <span class="category-row-amount">${fmt(val)}</span>
              </div>
              <div class="category-row-bar-wrap">
                <div class="category-row-bar" style="width:${pct.toFixed(1)}%; background:${cfg.color};"></div>
              </div>
            </div>
          </div>`;
      }).join('');
    }
  }

  // Recent transactions (last 5)
  const recentList = document.getElementById('recent-tx-list');
  if (recentList) {
    const recent = [...allTxs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    if (recent.length === 0) {
      recentList.innerHTML = `<div style="text-align:center; padding:24px 0; color:var(--text-muted); font-size:13px;">${store.settings.language === 'en' ? 'No transactions yet' : 'ยังไม่มีรายการ'}</div>`;
    } else {
      recentList.innerHTML = recent.map(tx => {
        const cfg = getCatConfig(tx.category);
        const d = new Date(tx.date);
        const dateStr = d.toLocaleDateString(store.settings.language === 'en' ? 'en-GB' : 'th-TH', { day: 'numeric', month: 'short' });
        return `
          <div class="tx-tile-30">
            <div class="tx-cat-icon" style="background:${cfg.color}22;">${cfg.emoji}</div>
            <div class="tx-tile-body">
              <div class="tx-tile-title">${tx.title}</div>
              <div class="tx-tile-category">${tx.category} · ${dateStr}</div>
            </div>
            <div class="tx-tile-amount ${tx.isIncome ? 'income' : 'expense'}">
              ${tx.isIncome ? '+' : '-'}${fmt(tx.amount)}
            </div>
          </div>`;
      }).join('');
    }
  }
}
