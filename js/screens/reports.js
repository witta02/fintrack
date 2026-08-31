import { store } from "../store.js";
import { t, getLanguage } from "../i18n.js";
import { router } from "../router.js";
import { getCategoryInfo } from "../categories.js";
import { showTaxCalculatorModal } from "../components/taxCalculatorModal.js";

let activePeriod = 'month'; // 'week', 'month', 'quarter', 'year'

export function renderReports(container) {
  const isEn = store.settings.language === 'en';
  const sym = store.getCurrencySymbol();
  const txs = store.getAllTransactions();

  const now = new Date();
  let periodTxs = [];
  let periodLabel = isEn ? 'This Month' : 'เดือนนี้';

  if (activePeriod === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    periodTxs = txs.filter(t => new Date(t.date) >= weekAgo);
    periodLabel = isEn ? 'This Week' : 'สัปดาห์นี้';
  } else if (activePeriod === 'quarter') {
    const quarterAgo = new Date(now);
    quarterAgo.setMonth(now.getMonth() - 3);
    periodTxs = txs.filter(t => new Date(t.date) >= quarterAgo);
    periodLabel = isEn ? 'This Quarter' : 'ไตรมาสนี้';
  } else if (activePeriod === 'year') {
    const yearStart = new Date(now.getFullYear(), 0, 1);
    periodTxs = txs.filter(t => new Date(t.date) >= yearStart);
    periodLabel = isEn ? 'This Year' : 'ปีนี้';
  } else {
    // month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    periodTxs = txs.filter(t => new Date(t.date) >= monthStart);
    periodLabel = isEn ? 'This Month' : 'เดือนนี้';
  }

  const totalIn = periodTxs.filter(t => t.isIncome).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  const totalOut = periodTxs.filter(t => !t.isIncome).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  // Group top 3 spending categories
  const catSpendMap = {};
  periodTxs.filter(t => !t.isIncome).forEach(t => {
    const cat = t.category || 'Other';
    catSpendMap[cat] = (catSpendMap[cat] || 0) + (parseFloat(t.amount) || 0);
  });

  const sortedCats = Object.entries(catSpendMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Fallback defaults if no spends yet
  const topSpends = sortedCats.length > 0 ? sortedCats : [
    ['Food', 0],
    ['Transport', 0],
    ['Shopping', 0]
  ];

  // Timeline dual-bar chart calculation (last 6 months / periods)
  const monthNames = isEn 
    ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    : ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  const timelineData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mIndex = d.getMonth();
    const label = `${monthNames[mIndex]} ${String(d.getFullYear()).slice(2)}`;
    
    // Txs in that month
    const mTxs = txs.filter(t => {
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
    <div class="screen screen-enter reports-screen-wrap" style="padding: 0 16px 100px;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0 16px;">
        <button class="back-btn icon-btn" id="reports-back-btn" style="background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: var(--radius);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0; letter-spacing: -0.3px;">
          ${isEn ? 'Cash Flow & Analytics' : 'กระแสเงินสด & สถิติ'}
        </h1>
        <button id="reports-export-statement-btn" class="icon-btn" title="${isEn ? 'Export Statement' : 'ส่งออกรายงาน'}" style="width: 38px; height: 38px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--gold);">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
      </div>

      <!-- Segmented Time Filter Pills (Matching Screen 3: Week, Month, Quarter) -->
      <div style="display: flex; background: var(--surface); border: 1px solid var(--border); padding: 4px; border-radius: 999px; margin-bottom: 20px; box-shadow: var(--card-shadow);">
        <button class="time-tab ${activePeriod === 'week' ? 'active' : ''}" data-period="week" style="flex: 1; padding: 8px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; border: none; cursor: pointer; transition: all 0.2s; background: ${activePeriod === 'week' ? 'var(--text-primary)' : 'transparent'}; color: ${activePeriod === 'week' ? 'var(--bg)' : 'var(--text-secondary)'};">
          ${isEn ? 'Week' : 'สัปดาห์'}
        </button>
        <button class="time-tab ${activePeriod === 'month' ? 'active' : ''}" data-period="month" style="flex: 1; padding: 8px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; border: none; cursor: pointer; transition: all 0.2s; background: ${activePeriod === 'month' ? 'var(--text-primary)' : 'transparent'}; color: ${activePeriod === 'month' ? 'var(--bg)' : 'var(--text-secondary)'};">
          ${isEn ? 'Month' : 'เดือน'}
        </button>
        <button class="time-tab ${activePeriod === 'quarter' ? 'active' : ''}" data-period="quarter" style="flex: 1; padding: 8px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; border: none; cursor: pointer; transition: all 0.2s; background: ${activePeriod === 'quarter' ? 'var(--text-primary)' : 'transparent'}; color: ${activePeriod === 'quarter' ? 'var(--bg)' : 'var(--text-secondary)'};">
          ${isEn ? 'Quarter' : 'ไตรมาส'}
        </button>
        <button class="time-tab ${activePeriod === 'year' ? 'active' : ''}" data-period="year" style="flex: 1; padding: 8px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; border: none; cursor: pointer; transition: all 0.2s; background: ${activePeriod === 'year' ? 'var(--text-primary)' : 'transparent'}; color: ${activePeriod === 'year' ? 'var(--bg)' : 'var(--text-secondary)'};">
          ${isEn ? 'Year' : 'ปี'}
        </button>
      </div>

      <!-- Money in / Money out Badges (Matching Screen 3) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
        <!-- Money In Card -->
        <div style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 16px; box-shadow: var(--card-shadow); display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--income-soft); color: var(--income); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="7 17 17 7 17 17"/><line x1="7" y1="7" x2="17" y2="7"/></svg>
          </div>
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary);">${isEn ? 'Money in' : 'เงินเข้า'}</div>
            <div style="font-size: 16px; font-weight: 900; font-family: var(--font-heading); color: var(--income); margin-top: 2px;">
              ${sym}${totalIn.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        <!-- Money Out Card -->
        <div style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 16px; box-shadow: var(--card-shadow); display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--expense-soft); color: var(--expense); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="17 7 7 17 7 7"/><line x1="17" y1="17" x2="7" y2="17"/></svg>
          </div>
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary);">${isEn ? 'Money out' : 'เงินออก'}</div>
            <div style="font-size: 16px; font-weight: 900; font-family: var(--font-heading); color: var(--expense); margin-top: 2px;">
              ${sym}${totalOut.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      </div>

      <!-- Comparative Dual-Bar Timeline Chart (Matching Screen 3) -->
      <div style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 20px; box-shadow: var(--card-shadow); margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div style="font-size: 13px; font-weight: 800; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px;">
            ${isEn ? 'Cash Flow History' : 'ประวัติกระแสเงินสด'}
          </div>
          <div style="display: flex; align-items: center; gap: 12px; font-size: 11px; font-weight: 700; color: var(--text-secondary);">
            <span style="display: flex; align-items: center; gap: 4px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--income);"></span>
              ${isEn ? 'In' : 'เข้า'}
            </span>
            <span style="display: flex; align-items: center; gap: 4px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--expense);"></span>
              ${isEn ? 'Out' : 'ออก'}
            </span>
          </div>
        </div>

        <!-- Vertical Dual-Bar Timeline Grid -->
        <div style="height: 140px; display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; padding: 0 4px; margin-bottom: 10px;">
          ${timelineData.map(d => {
            const inHeight = Math.max(8, Math.round((d.mIn / maxVal) * 120));
            const outHeight = Math.max(8, Math.round((d.mOut / maxVal) * 120));
            return `
              <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; height: 100%; justify-content: flex-end;">
                <div style="display: flex; gap: 4px; align-items: flex-end; width: 100%; justify-content: center;">
                  <!-- Inflow Bar -->
                  <div style="width: 8px; height: ${inHeight}px; border-radius: 999px; background: ${d.isCurrent ? 'var(--income)' : 'var(--border-strong)'}; transition: height 0.4s ease;" title="${isEn ? 'In' : 'เข้า'}: ${sym}${d.mIn.toLocaleString()}"></div>
                  <!-- Outflow Bar -->
                  <div style="width: 8px; height: ${outHeight}px; border-radius: 999px; background: ${d.isCurrent ? 'var(--expense)' : 'var(--border)'}; transition: height 0.4s ease;" title="${isEn ? 'Out' : 'ออก'}: ${sym}${d.mOut.toLocaleString()}"></div>
                </div>
                <div style="font-size: 10px; font-weight: 700; color: ${d.isCurrent ? 'var(--text-primary)' : 'var(--text-muted)'}; text-align: center; white-space: nowrap;">
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
          <div id="analytics-open-budgets-btn" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 14px 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; box-shadow: var(--card-shadow);">
            <div style="width: 34px; height: 34px; border-radius: 10px; background: rgba(245, 200, 66, 0.15); color: var(--gold); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div>
              <div style="font-size: 12.5px; font-weight: 800; color: var(--text-primary);">${isEn ? 'Budget Limits' : 'งบประมาณ'}</div>
              <div style="font-size: 10px; color: var(--text-secondary); font-weight: 600;">${isEn ? '50/30/20 & Caps' : 'ลิมิตหมวดหมู่'}</div>
            </div>
          </div>

          <!-- Tax Deductions Calculator -->
          <div id="analytics-open-tax-btn" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 14px 12px; display: flex; align-items: center; gap: 10px; cursor: pointer; box-shadow: var(--card-shadow);">
            <div style="width: 34px; height: 34px; border-radius: 10px; background: rgba(59, 130, 246, 0.15); color: #3b82f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"/></svg>
            </div>
            <div>
              <div style="font-size: 12.5px; font-weight: 800; color: var(--text-primary);">${isEn ? 'Tax Planner' : 'คำนวณภาษี'}</div>
              <div style="font-size: 10px; color: var(--text-secondary); font-weight: 600;">${isEn ? 'Personal deductions' : 'ลดหย่อนภาษี'}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Financial Insight Advisory Banner (Matching Screen 3) -->
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 14px 16px; display: flex; align-items: center; gap: 12px; margin-bottom: 22px;">
        <div style="width: 36px; height: 36px; border-radius: 12px; background: var(--gold-soft); color: var(--gold); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v1"/><path d="M12 21v1"/><path d="m4.93 4.93.7.7"/><path d="m18.36 18.36.7.7"/><path d="M2 12h1"/><path d="M21 12h1"/><path d="m4.93 19.07.7-.7"/><path d="m18.36 5.64.7-.7"/><circle cx="12" cy="12" r="4"/></svg>
        </div>
        <div style="font-size: 12px; font-weight: 700; color: var(--text-primary); line-height: 1.4;">
          ${totalOut > totalIn && totalIn > 0 
            ? (isEn ? 'Spending is outpacing income this period. Focus on essential needs.' : 'รายจ่ายเกินรายรับในช่วงนี้ แนะนำจำกัดค่าใช้จ่ายฟุ่มเฟือย') 
            : (isEn ? 'Great discipline! Setting aside funds early in the month boosts your savings rate.' : 'วินัยการเงินดีเยี่ยม! การแยกเงินเก็บตั้งแต่ต้นช่วงเวลาช่วยเพิ่มอัตราการออม')}
        </div>
      </div>

      <!-- Top 3 Spends Section (Matching Screen 3 Bento Cards) -->
      <div>
        <div style="font-size: 13px; font-weight: 800; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; padding: 0 4px;">
          ${isEn ? `Top Spends (${periodLabel})` : `หมวดหมู่จ่ายสูงสุด (${periodLabel})`}
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
          ${topSpends.map(([catName, amt]) => {
            const info = getCategoryInfo(catName);
            return `
              <div class="bento-spend-card" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px 10px; text-align: center; box-shadow: var(--card-shadow);">
                <div style="width: 38px; height: 38px; border-radius: 12px; background: ${info.color}18; color: ${info.color}; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; padding: 6px; box-sizing: border-box;">
                  ${info.svg || ''}
                </div>
                <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${info.label || catName}
                </div>
                <div style="font-size: 13px; font-weight: 900; font-family: var(--font-heading); color: var(--text-primary);">
                  ${sym}${amt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Event Listeners
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

  container.querySelectorAll('.time-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activePeriod = tab.getAttribute('data-period');
      renderReports(container);
    });
  });
}
