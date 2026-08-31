import { store } from "../store.js";
import { router } from "../router.js";
import { t } from "../i18n.js";
import { alerts } from "../utils/alertHelper.js";
import { getCategoryInfo } from "../categories.js";

export function renderExport(container) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const isEn = store.settings.language === "en";
  const sym = store.getCurrencySymbol();

  container.innerHTML = `
    <div class="screen screen-enter" style="padding: 0 16px 100px;">
      <!-- Header -->
      <div style="display: flex; align-items: center; gap: 14px; padding: 14px 0 16px;">
        <button id="back-btn" class="icon-btn" style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: var(--text-primary);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <h1 style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: var(--text-primary); margin: 0;">${t("exportTitle")}</h1>
      </div>

      <!-- 1. Apple-Card Style Monthly Statement Preview Card -->
      <div class="apple-statement-card" id="apple-statement-preview" style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
          <div>
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: var(--gold);">FINTRACK MONTHLY STATEMENT</div>
            <h2 id="statement-month-title" style="font-size: 20px; font-weight: 900; color: var(--text-primary); margin: 2px 0 0 0;">This Month</h2>
          </div>
          <div id="statement-health-badge" class="health-grade-tag" style="background: rgba(16, 185, 129, 0.15); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3);">
            Grade A+
          </div>
        </div>

        <!-- Net Flow & Savings Rate -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
          <div class="statement-stat-box">
            <div style="font-size: 10.5px; font-weight: 700; color: var(--text-secondary);">${isEn ? 'Net Savings' : 'เงินคงเหลือสุทธิ'}</div>
            <div id="statement-net-val" style="font-size: 18px; font-weight: 900; font-family: var(--font-heading); color: var(--income); margin-top: 2px;">+฿0.00</div>
          </div>
          <div class="statement-stat-box">
            <div style="font-size: 10.5px; font-weight: 700; color: var(--text-secondary);">${isEn ? 'Savings Rate' : 'อัตราการออม'}</div>
            <div id="statement-savings-rate-val" style="font-size: 18px; font-weight: 900; font-family: var(--font-heading); color: var(--gold); margin-top: 2px;">0%</div>
          </div>
        </div>

        <!-- Income vs Expense Mini Bars -->
        <div style="display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">
          <span>${isEn ? 'Income' : 'รายรับ'}: <strong id="statement-income-val" style="color: var(--income);">+฿0.00</strong></span>
          <span>${isEn ? 'Expenses' : 'รายจ่าย'}: <strong id="statement-expense-val" style="color: var(--expense);">-฿0.00</strong></span>
        </div>
        <div style="width: 100%; height: 8px; border-radius: 999px; background: var(--surface); border: 1px solid var(--border); overflow: hidden; display: flex; margin-bottom: 16px;">
          <div id="statement-flow-bar" style="height: 100%; background: var(--income); width: 50%; transition: width 0.5s ease;"></div>
        </div>

        <!-- Top Spending Categories -->
        <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 8px; letter-spacing: 0.5px;">
          ${isEn ? 'Top Spending Breakdown' : 'หมวดหมู่ที่ใช้จ่ายสูงสุด'}
        </div>
        <div id="statement-top-cats" style="display: flex; flex-direction: column; gap: 6px;"></div>

        <!-- Download PNG Infographic Button -->
        <button id="download-card-png-btn" class="primary-btn" style="width: 100%; margin-top: 18px; height: 44px; border-radius: var(--radius); background: var(--gold); color: var(--btn-text-primary); font-weight: 800; font-size: 13px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          ${isEn ? 'Download Statement Card (PNG)' : 'ดาวน์โหลดการ์ดสรุปรายเดือน (PNG)'}
        </button>
      </div>

      <!-- 2. Traditional Report Options -->
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div class="add-tx-type-tabs" style="margin-bottom: 2px;">
          <button class="add-tx-tab active" data-mode="month">${t("exportMonth")}</button>
          <button class="add-tx-tab" data-mode="year">${t("exportYear")}</button>
          <button class="add-tx-tab" data-mode="range">${t("exportRange")}</button>
        </div>

        <!-- Month Selector -->
        <div id="month-selector-container" class="filter-section">
          <label style="display: block; margin-bottom: 6px; font-weight: 700; font-size: 12px; color: var(--text-secondary);">${t("selectMonth")}</label>
          <input type="month" id="export-month" class="form-control" value="${currentYear}-${String(currentMonth + 1).padStart(2, "0")}" style="width: 100%; height: 44px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); padding: 0 14px;">
        </div>

        <!-- Year Selector -->
        <div id="year-selector-container" class="filter-section" style="display: none;">
          <label style="display: block; margin-bottom: 6px; font-weight: 700; font-size: 12px; color: var(--text-secondary);">${t("selectYear")}</label>
          <select id="export-year" class="form-control" style="width: 100%; height: 44px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); padding: 0 14px;">
            ${Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => `<option value="${y}">${y}</option>`).join("")}
          </select>
        </div>

        <!-- Range Selector -->
        <div id="range-selector-container" class="filter-section" style="display: none; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%;">
          <div>
            <label style="display: block; margin-bottom: 6px; font-weight: 700; font-size: 12px; color: var(--text-secondary);">${t("startDate")}</label>
            <input type="date" id="export-start-date" class="form-control" value="${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01" style="width: 100%; height: 44px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); padding: 0 12px; font-size: 12.5px;">
          </div>
          <div>
            <label style="display: block; margin-bottom: 6px; font-weight: 700; font-size: 12px; color: var(--text-secondary);">${t("endDate")}</label>
            <input type="date" id="export-end-date" class="form-control" value="${now.toISOString().split("T")[0]}" style="width: 100%; height: 44px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); padding: 0 12px; font-size: 12.5px;">
          </div>
        </div>

        <!-- Print / PDF Button -->
        <button id="print-report-btn" class="icon-btn" style="width: 100%; height: 46px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); font-weight: 800; font-size: 13.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          ${t("printReport")}
        </button>
      </div>
    </div>
  `;

  setupEventListeners(container);
  updateStatementPreview(container);
}

function setupEventListeners(container) {
  const backBtn = container.querySelector("#back-btn");
  backBtn?.addEventListener("click", () => {
    router.navigate("dashboard");
  });

  const tabs = container.querySelectorAll(".add-tx-tab");
  const sections = {
    month: container.querySelector("#month-selector-container"),
    year: container.querySelector("#year-selector-container"),
    range: container.querySelector("#range-selector-container"),
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const mode = tab.getAttribute("data-mode");
      Object.keys(sections).forEach((k) => {
        if (sections[k]) {
          sections[k].style.display = k === mode ? (k === "range" ? "grid" : "block") : "none";
        }
      });
      updateStatementPreview(container);
    });
  });

  container.querySelector("#export-month")?.addEventListener("change", () => updateStatementPreview(container));
  container.querySelector("#export-year")?.addEventListener("change", () => updateStatementPreview(container));
  container.querySelector("#export-start-date")?.addEventListener("change", () => updateStatementPreview(container));
  container.querySelector("#export-end-date")?.addEventListener("change", () => updateStatementPreview(container));

  container.querySelector("#print-report-btn")?.addEventListener("click", () => printReport(container));
  container.querySelector("#download-card-png-btn")?.addEventListener("click", () => generateAndDownloadStatementPNG(container));
}

function getFilteredData(container) {
  const mode = container.querySelector(".add-tx-tab.active")?.getAttribute("data-mode") || "month";
  let filteredTransactions = store.getAllTransactions();
  let titleSuffix = "";

  try {
    if (mode === "month") {
      const monthVal = container.querySelector("#export-month")?.value;
      if (!monthVal) return null;
      const [y, m] = monthVal.split("-").map(Number);
      filteredTransactions = filteredTransactions.filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === y && d.getMonth() === m - 1;
      });
      titleSuffix = monthVal;
    } else if (mode === "year") {
      const y = parseInt(container.querySelector("#export-year")?.value || "");
      filteredTransactions = filteredTransactions.filter((t) => new Date(t.date).getFullYear() === y);
      titleSuffix = y.toString();
    } else if (mode === "range") {
      const startInput = container.querySelector("#export-start-date")?.value;
      const endInput = container.querySelector("#export-end-date")?.value;
      if (!startInput || !endInput) return null;
      const start = new Date(startInput);
      const end = new Date(endInput);
      end.setHours(23, 59, 59, 999);
      filteredTransactions = filteredTransactions.filter((t) => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
      titleSuffix = `${start.toISOString().split("T")[0]}_to_${end.toISOString().split("T")[0]}`;
    }

    filteredTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    return { data: filteredTransactions, suffix: titleSuffix };
  } catch (err) {
    console.error("Filtering error:", err);
    return null;
  }
}

function updateStatementPreview(container) {
  const result = getFilteredData(container);
  if (!result) return;
  const { data: txs, suffix } = result;

  const sym = store.getCurrencySymbol();
  let income = 0;
  let expense = 0;
  const catMap = {};

  txs.forEach(t => {
    if (t.isIncome) {
      income += Number(t.amount);
    } else {
      expense += Number(t.amount);
      const c = t.category || "Other";
      catMap[c] = (catMap[c] || 0) + Number(t.amount);
    }
  });

  const net = income - expense;
  const savingsRate = income > 0 ? Math.round((Math.max(0, net) / income) * 100) : 0;
  const health = store.getFinancialHealthScore();

  const titleEl = container.querySelector("#statement-month-title");
  if (titleEl) titleEl.textContent = suffix || "Statement";

  const netEl = container.querySelector("#statement-net-val");
  if (netEl) {
    netEl.textContent = `${net >= 0 ? '+' : '-'}${sym} ${Math.abs(net).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
    netEl.style.color = net >= 0 ? "var(--income)" : "var(--expense)";
  }

  const rateEl = container.querySelector("#statement-savings-rate-val");
  if (rateEl) rateEl.textContent = `${savingsRate}%`;

  const incEl = container.querySelector("#statement-income-val");
  if (incEl) incEl.textContent = `+${sym} ${income.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

  const expEl = container.querySelector("#statement-expense-val");
  if (expEl) expEl.textContent = `-${sym} ${expense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

  const barEl = container.querySelector("#statement-flow-bar");
  if (barEl) {
    const totalFlow = income + expense;
    const incPct = totalFlow > 0 ? (income / totalFlow) * 100 : 50;
    barEl.style.width = `${incPct}%`;
  }

  const healthBadge = container.querySelector("#statement-health-badge");
  if (healthBadge) {
    healthBadge.textContent = `Grade ${health.grade}`;
    healthBadge.style.color = health.color;
    healthBadge.style.borderColor = health.color;
  }

  // Top 3 Categories
  const topCatsEl = container.querySelector("#statement-top-cats");
  if (topCatsEl) {
    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (sorted.length === 0) {
      topCatsEl.innerHTML = `<div style="font-size: 11px; color: var(--text-secondary);">ไม่มีรายการใช้จ่ายในช่วงนี้</div>`;
    } else {
      topCatsEl.innerHTML = sorted.map(([catName, amt]) => {
        const info = getCategoryInfo(catName);
        const pct = expense > 0 ? Math.round((amt / expense) * 100) : 0;
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
            <span>${info.label || catName}</span>
            <span style="font-weight: 800; color: var(--text-primary);">${sym} ${amt.toLocaleString()} (${pct}%)</span>
          </div>
        `;
      }).join('');
    }
  }
}

function generateAndDownloadStatementPNG(container) {
  const result = getFilteredData(container);
  if (!result) return;
  const { data: txs, suffix } = result;

  const canvas = document.createElement('canvas');
  const dpr = 2;
  const width = 480;
  const height = 620;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const isDark = store.settings.isDarkMode;
  const bg = isDark ? '#0F172A' : '#F8FAFC';
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const textPrimary = isDark ? '#F1F5F9' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const gold = '#F5C842';
  const incomeColor = '#10B981';
  const expenseColor = '#EF4444';
  const sym = store.getCurrencySymbol();

  let income = 0;
  let expense = 0;
  const catMap = {};
  txs.forEach(t => {
    if (t.isIncome) income += Number(t.amount);
    else {
      expense += Number(t.amount);
      const c = t.category || "Other";
      catMap[c] = (catMap[c] || 0) + Number(t.amount);
    }
  });
  const net = income - expense;
  const savingsRate = income > 0 ? Math.round((Math.max(0, net) / income) * 100) : 0;
  const health = store.getFinancialHealthScore();

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Card
  ctx.fillStyle = cardBg;
  ctx.beginPath();
  ctx.roundRect(20, 20, width - 40, height - 40, 24);
  ctx.fill();
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Header Title
  ctx.fillStyle = gold;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('FINTRACK FINANCIAL STATEMENT', 40, 60);

  ctx.fillStyle = textPrimary;
  ctx.font = '900 24px sans-serif';
  ctx.fillText(suffix || 'Monthly Summary', 40, 92);

  // Health Badge
  ctx.fillStyle = health.color;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`Grade ${health.grade} (${health.score}/100)`, width - 180, 75);

  // Divider
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  ctx.beginPath();
  ctx.moveTo(40, 110);
  ctx.lineTo(width - 40, 110);
  ctx.stroke();

  // Net Savings & Rate Box
  ctx.fillStyle = isDark ? '#0F172A' : '#F1F5F9';
  ctx.beginPath();
  ctx.roundRect(40, 125, width - 80, 80, 16);
  ctx.fill();

  ctx.fillStyle = textSecondary;
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('NET SAVINGS (เงินคงเหลือสุทธิ)', 55, 150);
  ctx.fillText('SAVINGS RATE (อัตราการออม)', 260, 150);

  ctx.fillStyle = net >= 0 ? incomeColor : expenseColor;
  ctx.font = '900 20px sans-serif';
  ctx.fillText(`${net >= 0 ? '+' : '-'}${sym} ${Math.abs(net).toLocaleString()}`, 55, 182);

  ctx.fillStyle = gold;
  ctx.fillText(`${savingsRate}%`, 260, 182);

  // Income vs Expense
  ctx.fillStyle = textSecondary;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`Total Inflow: +${sym} ${income.toLocaleString()}`, 40, 240);
  ctx.fillText(`Total Outflow: -${sym} ${expense.toLocaleString()}`, 250, 240);

  // Top Categories
  ctx.fillStyle = textPrimary;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('TOP SPENDING BREAKDOWN', 40, 290);

  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 4);
  let yOffset = 320;
  sorted.forEach(([catName, amt]) => {
    const info = getCategoryInfo(catName);
    const pct = expense > 0 ? Math.round((amt / expense) * 100) : 0;
    
    ctx.fillStyle = textPrimary;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`${info.label || catName}`, 40, yOffset);

    ctx.fillStyle = textSecondary;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`${sym} ${amt.toLocaleString()} (${pct}%)`, width - 180, yOffset);

    yOffset += 35;
  });

  // Footer branding
  ctx.fillStyle = textSecondary;
  ctx.font = '11px sans-serif';
  ctx.fillText('Generated by FinTrack 3.0 • Verified Financial Ledger', 40, height - 50);

  // Download Trigger
  const dataURL = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `FinTrack_Statement_${suffix || 'Report'}.png`;
  a.click();
  alerts.success('Statement card exported as PNG!');
}

function printReport(container) {
  const result = getFilteredData(container);
  if (!result) return;
  const { data: filteredTransactions, suffix: titleSuffix } = result;

  const symbol = store.getCurrencySymbol();
  const totalIncome = filteredTransactions.filter((t) => t.isIncome).reduce((sum, t) => sum + store.toDisplay(t.amount), 0);
  const totalExpense = filteredTransactions.filter((t) => !t.isIncome).reduce((sum, t) => sum + store.toDisplay(t.amount), 0);
  const net = totalIncome - totalExpense;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alerts.warning(t("popupBlockedTitle"), t("popupBlockedBody"));
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>FinTrack Statement - ${titleSuffix}</title>
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
        </style>
      </head>
      <body>
        <h1>FinTrack Financial Statement</h1>
        <div class="meta">${titleSuffix} | Generated: ${new Date().toLocaleString()}</div>
        <table>
          <thead>
            <tr><th>Date</th><th>Category</th><th>Title</th><th style="text-align:right">Amount</th></tr>
          </thead>
          <tbody>
            ${filteredTransactions.map(t => `
              <tr>
                <td>${new Date(t.date).toLocaleDateString()}</td>
                <td>${t.category}</td>
                <td>${t.title}</td>
                <td style="text-align:right" class="${t.isIncome ? 'income' : 'expense'}">${t.isIncome ? '+' : '-'}${symbol}${store.toDisplay(t.amount).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="summary">
          <div class="summary-item"><span>Total Income:</span><span class="income">+${symbol}${totalIncome.toFixed(2)}</span></div>
          <div class="summary-item"><span>Total Expense:</span><span class="expense">-${symbol}${totalExpense.toFixed(2)}</span></div>
          <div class="summary-item total"><span>Net:</span><span>${symbol}${net.toFixed(2)}</span></div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
