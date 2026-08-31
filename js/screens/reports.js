import { store } from "../store.js";
import { t, getLanguage } from "../i18n.js";
import { router } from "../router.js";
import { getCategoryInfo, getExpenseCategories, getIncomeCategories } from "../categories.js";
import { showTaxCalculatorModal } from "../components/taxCalculatorModal.js";

let activePeriod = 'month'; // 'week', 'month', 'quarter', 'year', 'all'
let activeChartType = 'expense'; // 'expense' | 'income'

export function renderReports(container) {
  const isEn = store.settings.language === 'en';
  const sym = store.getCurrencySymbol();
  const txs = store.getAllTransactions();

  const now = new Date();
  let periodTxs = [];
  let periodLabel = isEn ? 'This Month' : 'เดือนนี้';
  let daysInPeriod = 30;

  if (activePeriod === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    periodTxs = txs.filter(t => {
      if (!t || !t.date) return false;
      return new Date(t.date) >= weekAgo;
    });
    periodLabel = isEn ? 'This Week' : 'สัปดาห์นี้';
    daysInPeriod = 7;
  } else if (activePeriod === 'quarter') {
    const quarterAgo = new Date(now);
    quarterAgo.setMonth(now.getMonth() - 3);
    periodTxs = txs.filter(t => {
      if (!t || !t.date) return false;
      return new Date(t.date) >= quarterAgo;
    });
    periodLabel = isEn ? 'This Quarter' : 'ไตรมาสนี้';
    daysInPeriod = 90;
  } else if (activePeriod === 'year') {
    const yearStart = new Date(now.getFullYear(), 0, 1);
    periodTxs = txs.filter(t => {
      if (!t || !t.date) return false;
      return new Date(t.date) >= yearStart;
    });
    periodLabel = isEn ? 'This Year' : 'ปีนี้';
    daysInPeriod = 365;
  } else if (activePeriod === 'all') {
    periodTxs = [...txs];
    periodLabel = isEn ? 'All Time' : 'ทั้งหมด';
    daysInPeriod = 30;
  } else {
    // month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    periodTxs = txs.filter(t => {
      if (!t || !t.date) return false;
      return new Date(t.date) >= monthStart;
    });
    periodLabel = isEn ? 'This Month' : 'เดือนนี้';
    daysInPeriod = Math.max(1, now.getDate());
  }

  // Aggregate Totals
  const totalIn = periodTxs.filter(t => t.isIncome).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const totalOut = periodTxs.filter(t => !t.isIncome).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const netSavings = totalIn - totalOut;
  const savingsRate = totalIn > 0 ? Math.max(0, Math.min(100, Math.round((netSavings / totalIn) * 100))) : 0;

  // Group Categories for Active Chart Type (Expense vs Income)
  const isViewingExpense = activeChartType === 'expense';
  const targetTxs = periodTxs.filter(t => isViewingExpense ? !t.isIncome : t.isIncome);
  const targetTotal = isViewingExpense ? totalOut : totalIn;

  const catMap = {};
  const catCountMap = {};
  targetTxs.forEach(t => {
    const cat = t.category || 'Other';
    catMap[cat] = (catMap[cat] || 0) + (parseFloat(t.amount) || 0);
    catCountMap[cat] = (catCountMap[cat] || 0) + 1;
  });

  const sortedCategories = Object.entries(catMap)
    .map(([catName, amt]) => {
      const info = getCategoryInfo(catName);
      const pct = targetTotal > 0 ? (amt / targetTotal) * 100 : 0;
      const count = catCountMap[catName] || 0;
      return { catName, amt, pct, count, info };
    })
    .sort((a, b) => b.amt - a.amt);

  // SVG Ring / Donut Chart Math
  const radius = 64;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius; // ~402.12
  let accumulatedPercent = 0;

  const ringSegments = sortedCategories.map(c => {
    const dashLength = (c.pct / 100) * circumference;
    const dashOffset = -(accumulatedPercent / 100) * circumference;
    accumulatedPercent += c.pct;
    return {
      ...c,
      dashLength,
      dashOffset,
      color: c.info.color || '#F5C842'
    };
  });

  // Timeline dual-bar chart calculation (last 6 months)
  const monthNames = isEn 
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    : ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  const timelineData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mIndex = d.getMonth();
    const label = monthNames[mIndex] + ' ' + String(d.getFullYear()).slice(2);
    
    const mTxs = txs.filter(t => {
      if (!t || !t.date) return false;
      const td = new Date(t.date);
      return td.getMonth() === mIndex && td.getFullYear() === d.getFullYear();
    });

    const mIn = mTxs.filter(t => t.isIncome).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const mOut = mTxs.filter(t => !t.isIncome).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const isCurrent = i === 0;

    timelineData.push({ label, mIn, mOut, isCurrent });
  }

  const maxVal = Math.max(100, ...timelineData.map(d => Math.max(d.mIn, d.mOut)));

  const html = `
    <style>
      .ring-segment {
        transition: stroke-width 0.25s ease, opacity 0.25s ease, filter 0.25s ease;
        cursor: pointer;
      }
      .ring-segment:hover, .ring-segment.active {
        stroke-width: 22;
        filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.4));
      }
      .cat-breakdown-row {
        transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
      }
      .cat-breakdown-row:hover {
        transform: translateY(-1px);
        background: var(--surface-hover) !important;
        border-color: var(--border-strong) !important;
      }
      .time-pill-btn.active {
        background: var(--gold) !important;
        color: #000 !important;
        box-shadow: var(--btn-shadow) !important;
      }
      .type-pill-btn.active {
        background: var(--card) !important;
        color: var(--text-primary) !important;
        border-color: var(--border-strong) !important;
        box-shadow: var(--card-shadow) !important;
      }
    </style>

    <div class="screen screen-enter reports-screen-wrap" style="padding: 0 16px 100px;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0 16px;">
        <button class="back-btn icon-btn" id="reports-back-btn" style="background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: var(--radius);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 style="font-size: 18px; font-weight: 900; color: var(--text-primary); margin: 0; letter-spacing: -0.3px;">
          ${isEn ? 'Cash Flow & Analytics' : 'กระแสเงินสด & การวิเคราะห์'}
        </h1>
        <button id="reports-export-statement-btn" class="icon-btn" title="${isEn ? 'Export Statement' : 'ส่งออกรายงาน'}" style="width: 38px; height: 38px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--gold); cursor: pointer;">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
      </div>

      <!-- Segmented Time Filter Pills -->
      <div style="display: flex; background: var(--surface); border: 1px solid var(--border); padding: 4px; border-radius: 999px; margin-bottom: 18px; box-shadow: var(--card-shadow); gap: 4px;">
        <button class="time-tab time-pill-btn ${activePeriod === 'week' ? 'active' : ''}" data-period="week" style="flex: 1; padding: 7px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 800; border: none; cursor: pointer; transition: all 0.2s; background: transparent; color: var(--text-secondary);">
          ${isEn ? 'Week' : 'สัปดาห์'}
        </button>
        <button class="time-tab time-pill-btn ${activePeriod === 'month' ? 'active' : ''}" data-period="month" style="flex: 1; padding: 7px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 800; border: none; cursor: pointer; transition: all 0.2s; background: transparent; color: var(--text-secondary);">
          ${isEn ? 'Month' : 'เดือน'}
        </button>
        <button class="time-tab time-pill-btn ${activePeriod === 'quarter' ? 'active' : ''}" data-period="quarter" style="flex: 1; padding: 7px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 800; border: none; cursor: pointer; transition: all 0.2s; background: transparent; color: var(--text-secondary);">
          ${isEn ? 'Quarter' : 'ไตรมาส'}
        </button>
        <button class="time-tab time-pill-btn ${activePeriod === 'year' ? 'active' : ''}" data-period="year" style="flex: 1; padding: 7px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 800; border: none; cursor: pointer; transition: all 0.2s; background: transparent; color: var(--text-secondary);">
          ${isEn ? 'Year' : 'ปี'}
        </button>
        <button class="time-tab time-pill-btn ${activePeriod === 'all' ? 'active' : ''}" data-period="all" style="flex: 1; padding: 7px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 800; border: none; cursor: pointer; transition: all 0.2s; background: transparent; color: var(--text-secondary);">
          ${isEn ? 'All' : 'ทั้งหมด'}
        </button>
      </div>

      <!-- 4 Core Executive KPI Cards (Bento 2x2 Grid) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px;">
        <!-- Card 1: Money In -->
        <div style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 14px; box-shadow: var(--card-shadow);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">${isEn ? 'Money In' : 'เงินเข้า'}</span>
            <div style="width: 26px; height: 26px; border-radius: 8px; background: rgba(52, 211, 153, 0.15); color: var(--income); display: flex; align-items: center; justify-content: center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="7 17 17 7 17 17"/><line x1="7" y1="7" x2="17" y2="7"/></svg>
            </div>
          </div>
          <div style="font-size: 18px; font-weight: 900; font-family: var(--font-heading); color: var(--income); letter-spacing: -0.3px;">
            ${sym}${totalIn.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>

        <!-- Card 2: Money Out -->
        <div style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 14px; box-shadow: var(--card-shadow);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">${isEn ? 'Money Out' : 'เงินออก'}</span>
            <div style="width: 26px; height: 26px; border-radius: 8px; background: rgba(251, 113, 133, 0.15); color: var(--expense); display: flex; align-items: center; justify-content: center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="17 7 7 17 7 7"/><line x1="17" y1="17" x2="7" y2="17"/></svg>
            </div>
          </div>
          <div style="font-size: 18px; font-weight: 900; font-family: var(--font-heading); color: var(--expense); letter-spacing: -0.3px;">
            ${sym}${totalOut.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>

        <!-- Card 3: Net Cash Flow -->
        <div style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 14px; box-shadow: var(--card-shadow);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">${isEn ? 'Net Flow' : 'กระแสเงินสุทธิ'}</span>
            <span style="font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 999px; background: ${netSavings >= 0 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(251, 113, 133, 0.15)'}; color: ${netSavings >= 0 ? 'var(--income)' : 'var(--expense)'};">
              ${netSavings >= 0 ? (isEn ? 'Surplus' : 'เหลือเก็บ') : (isEn ? 'Deficit' : 'ติดลบ')}
            </span>
          </div>
          <div style="font-size: 18px; font-weight: 900; font-family: var(--font-heading); color: ${netSavings >= 0 ? 'var(--income)' : 'var(--expense)'}; letter-spacing: -0.3px;">
            ${netSavings >= 0 ? '+' : '-'}${sym}${Math.abs(netSavings).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>

        <!-- Card 4: Savings Rate -->
        <div style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 14px; box-shadow: var(--card-shadow);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">${isEn ? 'Savings Rate' : 'อัตราการออม'}</span>
            <div style="width: 26px; height: 26px; border-radius: 8px; background: rgba(245, 200, 66, 0.15); color: var(--gold); display: flex; align-items: center; justify-content: center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
          </div>
          <div style="font-size: 18px; font-weight: 900; font-family: var(--font-heading); color: var(--gold); letter-spacing: -0.3px;">
            ${savingsRate}%
          </div>
        </div>
      </div>

      <!-- INTERACTIVE CATEGORY RING CHART (DONUT) SECTION -->
      <div style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 20px 18px; box-shadow: var(--card-shadow); margin-bottom: 20px;">
        <!-- Ring Header with Expense / Income Toggle -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
          <div>
            <h2 style="font-size: 15px; font-weight: 900; color: var(--text-primary); margin: 0; letter-spacing: -0.2px;">
              ${isEn ? 'Category Distribution' : 'สัดส่วนตามหมวดหมู่'}
            </h2>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
              ${isEn ? 'Breakdown for ' + periodLabel : 'โครงสร้าง ' + periodLabel}
            </div>
          </div>

          <!-- Type Switcher (Expenses vs Income) -->
          <div style="display: flex; background: var(--surface); border: 1px solid var(--border); border-radius: 999px; padding: 2px;">
            <button id="chart-type-expense" class="type-pill-btn ${isViewingExpense ? 'active' : ''}" style="padding: 5px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; border: 1px solid ${isViewingExpense ? 'var(--border)' : 'transparent'}; background: transparent; color: ${isViewingExpense ? 'var(--expense)' : 'var(--text-secondary)'}; cursor: pointer; transition: all 0.2s;">
              ${isEn ? 'Expenses' : 'รายจ่าย'}
            </button>
            <button id="chart-type-income" class="type-pill-btn ${!isViewingExpense ? 'active' : ''}" style="padding: 5px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; border: 1px solid ${!isViewingExpense ? 'var(--border)' : 'transparent'}; background: transparent; color: ${!isViewingExpense ? 'var(--income)' : 'var(--text-secondary)'}; cursor: pointer; transition: all 0.2s;">
              ${isEn ? 'Income' : 'รายรับ'}
            </button>
          </div>
        </div>

        ${sortedCategories.length === 0 ? `
          <div style="text-align: center; padding: 36px 0; color: var(--text-secondary);">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div style="font-size: 13px; font-weight: 800; color: var(--text-primary); margin-bottom: 2px;">
              ${isEn ? 'No data for this period' : 'ไม่มีข้อมูลในรอบเวลานี้'}
            </div>
            <div style="font-size: 11px; color: var(--text-secondary);">
              ${isEn ? 'Record new transactions to see category insights' : 'บันทึกรายการเพื่อดูสถิติและกราฟวงแหวน'}
            </div>
          </div>
        ` : `
          <!-- Ring Chart Canvas + Center KPI -->
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px 0 16px;">
            <div style="position: relative; width: 190px; height: 190px; display: flex; align-items: center; justify-content: center;">
              <svg width="190" height="190" viewBox="0 0 190 190" style="transform: rotate(-90deg); overflow: visible;">
                <!-- Background Base Track -->
                <circle cx="95" cy="95" r="${radius}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${strokeWidth}" />
                
                <!-- Category Segments -->
                ${ringSegments.map(seg => `
                  <circle
                    class="ring-segment"
                    data-cat-name="${seg.catName}"
                    data-cat-label="${seg.info.label}"
                    data-cat-amt="${sym}${seg.amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}"
                    data-cat-pct="${seg.pct.toFixed(1)}%"
                    data-cat-color="${seg.color}"
                    cx="95"
                    cy="95"
                    r="${radius}"
                    fill="none"
                    stroke="${seg.color}"
                    stroke-width="${strokeWidth}"
                    stroke-dasharray="${seg.dashLength} ${circumference}"
                    stroke-dashoffset="${seg.dashOffset}"
                    stroke-linecap="round"
                  />
                `).join('')}
              </svg>

              <!-- Center Interactive Text -->
              <div id="ring-center-kpi" style="position: absolute; text-align: center; pointer-events: none; max-width: 120px; padding: 0 4px;">
                <div id="ring-center-title" style="font-size: 10.5px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${isViewingExpense ? (isEn ? 'Total Spend' : 'ยอดรวมจ่าย') : (isEn ? 'Total Income' : 'ยอดรวมรับ')}
                </div>
                <div id="ring-center-amt" style="font-size: 16px; font-weight: 900; color: var(--text-primary); font-family: var(--font-heading); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${sym}${targetTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div id="ring-center-sub" style="font-size: 10px; font-weight: 800; color: ${isViewingExpense ? 'var(--expense)' : 'var(--income)'}; margin-top: 1px;">
                  100% (${sortedCategories.length} ${isEn ? 'Categories' : 'หมวดหมู่'})
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Micro Legend Chips -->
          <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-bottom: 8px;">
            ${sortedCategories.map(c => `
              <div class="ring-legend-pill" data-cat-name="${c.catName}" style="display: flex; align-items: center; gap: 5px; background: var(--surface); border: 1px solid var(--border); border-radius: 999px; padding: 4px 10px; cursor: pointer; transition: all 0.2s;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${c.info.color}; flex-shrink: 0;"></span>
                <span style="font-size: 11px; font-weight: 800; color: var(--text-primary);">${c.info.label}</span>
                <span style="font-size: 10px; font-weight: 700; color: var(--text-secondary);">${c.pct.toFixed(0)}%</span>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- FULL CATEGORY BREAKDOWN LIST (ALL CATEGORIES) -->
      <div style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 20px 18px; box-shadow: var(--card-shadow); margin-bottom: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
          <div>
            <h2 style="font-size: 15px; font-weight: 900; color: var(--text-primary); margin: 0;">
              ${isViewingExpense ? (isEn ? 'All Expense Categories' : 'แจกแจงรายจ่ายทุกหมวดหมู่') : (isEn ? 'All Income Categories' : 'แจกแจงรายรับทุกหมวดหมู่')}
            </h2>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
              ${sortedCategories.length} ${isEn ? 'active categories found' : 'หมวดหมู่ที่มีการใช้งาน'}
            </div>
          </div>
        </div>

        ${sortedCategories.length === 0 ? `
          <div style="text-align: center; padding: 20px 0; color: var(--text-secondary); font-size: 12px;">
            ${isEn ? 'No category transactions found' : 'ไม่พบรายการในหมวดหมู่นี้'}
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${sortedCategories.map((c, idx) => `
              <div class="cat-breakdown-row" data-cat-name="${c.catName}" style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 12px 14px; cursor: pointer;">
                <!-- Row Header -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 36px; height: 36px; border-radius: 10px; background: ${c.info.color}20; color: ${c.info.color}; border: 1px solid ${c.info.color}35; display: flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 7px; box-sizing: border-box;">
                      ${c.info.svg || '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/></svg>'}
                    </div>
                    <div>
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 13.5px; font-weight: 800; color: var(--text-primary);">${c.info.label}</span>
                        <span style="font-size: 10px; font-weight: 800; background: rgba(255,255,255,0.06); padding: 1px 6px; border-radius: 4px; color: var(--text-secondary);">#${idx + 1}</span>
                      </div>
                      <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px;">
                        ${c.count} ${isEn ? 'records' : 'รายการ'}
                      </div>
                    </div>
                  </div>

                  <div style="text-align: right;">
                    <div style="font-size: 14.5px; font-weight: 900; font-family: var(--font-heading); color: ${isViewingExpense ? 'var(--expense)' : 'var(--income)'}; letter-spacing: -0.2px;">
                      ${sym}${c.amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style="font-size: 11px; font-weight: 800; color: var(--gold); margin-top: 1px;">
                      ${c.pct.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <!-- Progress Bar -->
                <div style="width: 100%; height: 6px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden;">
                  <div style="width: ${c.pct}%; height: 100%; border-radius: 999px; background: ${c.info.color}; transition: width 0.4s ease;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- COMPARATIVE 6-MONTH DUAL-BAR TIMELINE CHART -->
      <div style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 20px 18px; box-shadow: var(--card-shadow); margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <div style="font-size: 14px; font-weight: 900; color: var(--text-primary); letter-spacing: -0.2px;">
              ${isEn ? 'Cash Flow Trend' : 'แนวโน้มกระแสเงินสด (6 เดือนล่าสุด)'}
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
              ${isEn ? 'Monthly Income vs Expense' : 'เปรียบเทียบรายรับกับรายจ่าย'}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; font-size: 11px; font-weight: 800;">
            <span style="display: flex; align-items: center; gap: 4px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--income);"></span>
              ${isEn ? 'In' : 'รับ'}
            </span>
            <span style="display: flex; align-items: center; gap: 4px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--expense);"></span>
              ${isEn ? 'Out' : 'จ่าย'}
            </span>
          </div>
        </div>

        <!-- Vertical Dual-Bar Timeline Grid -->
        <div style="height: 140px; display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; padding: 0 4px; margin-bottom: 10px;">
          ${timelineData.map(d => {
            const inHeight = Math.max(6, Math.round((d.mIn / maxVal) * 110));
            const outHeight = Math.max(6, Math.round((d.mOut / maxVal) * 110));
            return `
              <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end;">
                <div style="display: flex; gap: 4px; align-items: flex-end; width: 100%; justify-content: center;">
                  <!-- Inflow Bar -->
                  <div style="width: 8px; height: ${inHeight}px; border-radius: 999px; background: ${d.isCurrent ? 'var(--income)' : 'rgba(52, 211, 153, 0.4)'}; transition: height 0.4s ease;" title="${isEn ? 'In' : 'รับ'}: ${sym}${d.mIn.toLocaleString()}"></div>
                  <!-- Outflow Bar -->
                  <div style="width: 8px; height: ${outHeight}px; border-radius: 999px; background: ${d.isCurrent ? 'var(--expense)' : 'rgba(251, 113, 133, 0.4)'}; transition: height 0.4s ease;" title="${isEn ? 'Out' : 'จ่าย'}: ${sym}${d.mOut.toLocaleString()}"></div>
                </div>
                <div style="font-size: 10px; font-weight: 800; color: ${d.isCurrent ? 'var(--gold)' : 'var(--text-muted)'}; text-align: center; white-space: nowrap;">
                  ${d.label}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Financial Tools Hub in Analytics -->
      <div style="margin-bottom: 22px;">
        <div style="font-size: 12px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; padding: 0 4px;">
          ${isEn ? 'Planning & Tax Tools' : 'เครื่องมือวางแผน & จัดการภาษี'}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <!-- Category Budget Limits -->
          <div id="analytics-open-budgets-btn" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 14px 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; box-shadow: var(--card-shadow); transition: transform 0.15s ease;">
            <div style="width: 34px; height: 34px; border-radius: 10px; background: rgba(245, 200, 66, 0.15); color: var(--gold); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div>
              <div style="font-size: 12.5px; font-weight: 800; color: var(--text-primary);">${isEn ? 'Budget Limits' : 'งบประมาณ'}</div>
              <div style="font-size: 10px; color: var(--text-secondary); font-weight: 600;">${isEn ? '50/30/20 & Caps' : 'ลิมิตหมวดหมู่'}</div>
            </div>
          </div>

          <!-- Tax Deductions Calculator -->
          <div id="analytics-open-tax-btn" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 14px 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; box-shadow: var(--card-shadow); transition: transform 0.15s ease;">
            <div style="width: 34px; height: 34px; border-radius: 10px; background: rgba(59, 130, 246, 0.15); color: #3b82f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"/></svg>
            </div>
            <div>
              <div style="font-size: 12.5px; font-weight: 800; color: var(--text-primary);">${isEn ? 'Tax Planner' : 'คำนวณภาษี'}</div>
              <div style="font-size: 10px; color: var(--text-secondary); font-weight: 600;">${isEn ? '2026 Progressive' : 'ลดหย่อนภาษี 2569'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // --- Attach Interactive Event Listeners ---
  // 1. Navigation Actions
  container.querySelector('#reports-back-btn')?.addEventListener('click', () => {
    router.navigate('dashboard');
  });

  container.querySelector('#reports-export-statement-btn')?.addEventListener('click', () => {
    router.navigate('export');
  });

  container.querySelector('#analytics-open-budgets-btn')?.addEventListener('click', () => {
    router.navigate('planner');
  });

  container.querySelector('#analytics-open-tax-btn')?.addEventListener('click', () => {
    showTaxCalculatorModal();
  });

  // 2. Period Switcher Tabs
  container.querySelectorAll('.time-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activePeriod = tab.getAttribute('data-period');
      renderReports(container);
    });
  });

  // 3. Chart Type Switcher (Expenses vs Income)
  container.querySelector('#chart-type-expense')?.addEventListener('click', () => {
    if (activeChartType !== 'expense') {
      activeChartType = 'expense';
      renderReports(container);
    }
  });

  container.querySelector('#chart-type-income')?.addEventListener('click', () => {
    if (activeChartType !== 'income') {
      activeChartType = 'income';
      renderReports(container);
    }
  });

  // 4. Ring Segments Interactive Hover & Click Focus
  const centerTitle = container.querySelector('#ring-center-title');
  const centerAmt = container.querySelector('#ring-center-amt');
  const centerSub = container.querySelector('#ring-center-sub');

  const resetCenter = () => {
    if (centerTitle) centerTitle.textContent = isViewingExpense ? (isEn ? 'Total Spend' : 'ยอดรวมจ่าย') : (isEn ? 'Total Income' : 'ยอดรวมรับ');
    if (centerAmt) centerAmt.textContent = sym + targetTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    if (centerSub) centerSub.textContent = '100% (' + sortedCategories.length + (isEn ? ' Categories' : ' หมวดหมู่') + ')';
  };

  container.querySelectorAll('.ring-segment').forEach(seg => {
    const catLabel = seg.getAttribute('data-cat-label');
    const catAmt = seg.getAttribute('data-cat-amt');
    const catPct = seg.getAttribute('data-cat-pct');
    const catName = seg.getAttribute('data-cat-name');

    seg.addEventListener('mouseenter', () => {
      if (centerTitle) centerTitle.textContent = catLabel;
      if (centerAmt) centerAmt.textContent = catAmt;
      if (centerSub) centerSub.textContent = catPct;
    });

    seg.addEventListener('mouseleave', resetCenter);

    seg.addEventListener('click', () => {
      const row = container.querySelector('.cat-breakdown-row[data-cat-name="' + catName + '"]');
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.style.background = 'var(--surface-hover)';
        row.style.borderColor = 'var(--gold)';
        setTimeout(() => {
          row.style.background = 'var(--surface)';
          row.style.borderColor = 'var(--border)';
        }, 1500);
      }
    });
  });

  // 5. Legend Pill Click Focus
  container.querySelectorAll('.ring-legend-pill').forEach(pill => {
    const catName = pill.getAttribute('data-cat-name');
    pill.addEventListener('click', () => {
      const seg = container.querySelector('.ring-segment[data-cat-name="' + catName + '"]');
      if (seg) {
        seg.dispatchEvent(new Event('mouseenter'));
        const row = container.querySelector('.cat-breakdown-row[data-cat-name="' + catName + '"]');
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          row.style.background = 'var(--surface-hover)';
          row.style.borderColor = 'var(--gold)';
          setTimeout(() => {
            row.style.background = 'var(--surface)';
            row.style.borderColor = 'var(--border)';
          }, 1500);
        }
      }
    });
  });
}
