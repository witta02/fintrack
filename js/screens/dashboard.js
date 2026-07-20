import { store } from "../store.js";
import { router } from "../router.js";
import {
  renderSpendingChart,
  renderCategoryPieChart,
} from "../components/spendingChart.js";
import { createTransactionTile } from "../components/transactionTile.js";
import { t } from "../i18n.js";
import { convertToTHB } from "../currency.js";
import { alerts } from "../utils/alertHelper.js";
import VanillaTilt from "vanilla-tilt";
import Swal from "sweetalert2";

let activePeriod = "monthly";
let analysisPeriod = "monthly";
let analysisMonth = new Date().getMonth();
let analysisYear = new Date().getFullYear();
export function renderDashboard(container) {
  const openDownPayments = store.getDownPayments().filter((plan) => plan.paidAmount < plan.totalAmount);
  const nextDownPayment = openDownPayments[0];
  const greetingData = (() => {
    const h = new Date().getHours();
    if (h < 12) {
      return {
        text: store.settings.language === 'en' ? 'Good morning' : 'สวัสดีตอนเช้า',
        svg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M22 22H2"/><circle cx="12" cy="16" r="4"/><path d="m8 12 4-4 4 4"/><path d="M12 8v8"/></svg>`
      };
    }
    if (h < 17) {
      return {
        text: store.settings.language === 'en' ? 'Good afternoon' : 'สวัสดีตอนบ่าย',
        svg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5C842" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`
      };
    }
    if (h < 21) {
      return {
        text: store.settings.language === 'en' ? 'Good evening' : 'สวัสดีตอนเย็น',
        svg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F0A500" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M22 22H2"/><circle cx="12" cy="16" r="4"/><path d="m16 16-4 4-4-4"/><path d="M12 12v8"/></svg>`
      };
    }
    return {
      text: store.settings.language === 'en' ? 'Good night' : 'สวัสดีตอนดึก',
      svg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C5CFC" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`
    };
  })();
  const userInitial = store.user ? store.user.email.charAt(0).toUpperCase() : null;

  const allTxs = store.getAllTransactions();
  const allIncome = allTxs.filter(t => t.isIncome).reduce((sum, t) => sum + (t.amount || 0), 0);
  const allExpense = allTxs.filter(t => !t.isIncome).reduce((sum, t) => sum + (t.amount || 0), 0);
  const isBroke = (allIncome - allExpense) < 0;

  const level = store.settings.level || 1;
  const boosts = store.getActiveBoosts();
  let boostHTML = "";
  if (boosts.xpMulti > 1.0) {
    boostHTML += `<div style="font-size: 9px; font-weight: 800; color: #a855f7; background: rgba(168,85,247,0.15); padding: 2px 6px; border-radius: 4px; margin-left: 6px;">+${Math.round((boosts.xpMulti - 1) * 100)}% XP</div>`;
  }
  if (boosts.coinMulti > 1.0) {
    boostHTML += `<div style="font-size: 9px; font-weight: 800; color: var(--gold); background: rgba(245,200,66,0.15); padding: 2px 6px; border-radius: 4px; margin-left: 6px;">+${Math.round((boosts.coinMulti - 1) * 100)}% 🪙</div>`;
  }
  
  let userTitle = "";
  let titleColor = "var(--text-primary)";

  if (isBroke) {
    userTitle = store.settings.language === 'en' ? "Broke" : "ถังแตก";
    titleColor = "var(--expense)";
  } else if (level >= 20) {
    userTitle = store.settings.language === 'en' ? "Financial Guru" : "ตัวเทพการเงิน";
  } else if (level >= 10) {
    userTitle = store.settings.language === 'en' ? "Master Investor" : "ตัวตึงเรื่องลงทุน";
  } else if (level >= 5) {
    userTitle = store.settings.language === 'en' ? "Smart Spender" : "นักใช้จ่ายชาญฉลาด";
  } else {
    userTitle = store.settings.language === 'en' ? "Baby" : "เบบี๋ออมเงิน";
  }

  container.innerHTML = `
    <!-- Dashboard Top Bar -->
    <div class="dashboard-top-bar">
      <div class="screen-header" style="padding-bottom: 18px; margin-bottom: 0;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div>
            <h1 class="brand-title shimmer-text desktop-hide" style="font-size: 26px; font-weight: 900; letter-spacing: -1px; margin-bottom: 0;">FinTrack</h1>
            <h1 class="screen-title-desktop desktop-only" style="font-size: 26px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.5px; margin-bottom: 0;">ภาพรวม</h1>
            <div class="greeting-text desktop-hide" style="font-size: 12px; color: var(--text-secondary); margin-top: 3px; display: inline-flex; align-items: center; gap: 6px;">
              ${greetingData.svg}
              <span>${greetingData.text}</span>
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="gamification-modal-btn" style="background: linear-gradient(135deg, rgba(255, 184, 0, 0.15), rgba(255, 184, 0, 0.05)); border: 1px solid rgba(255,184,0,0.3); border-radius: 20px; padding: 4px 10px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(255,184,0,0.1); transition: all 0.2s;" title="Player Profile">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--gold)" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span style="font-size: 12px; font-weight: 800; color: var(--gold); letter-spacing: 0.5px; text-shadow: 0 0 8px rgba(255,184,0,0.3);">Lv.${level}</span>
          </button>
          ${userInitial ? `<div class="user-pill"><div class="user-pill-avatar">${userInitial}</div>${store.user.email.split('@')[0]}</div>` : ''}
          <button id="daily-quests-btn" class="icon-btn" title="Daily Quests" style="color: var(--gold);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Period Selector -->
      <div class="period-dropdown-container">
        <select id="period-select" class="period-select">
          <option value="daily" ${activePeriod === "daily" ? "selected" : ""}>${t("balanceToday")}</option>
          <option value="weekly" ${activePeriod === "weekly" ? "selected" : ""}>${t("balanceWeek")}</option>
          <option value="monthly" ${activePeriod === "monthly" ? "selected" : ""}>${t("balanceMonth")}</option>
          <option value="yearly" ${activePeriod === "yearly" ? "selected" : ""}>${t("balanceYear")}</option>
          <option value="all" ${activePeriod === "all" ? "selected" : ""}>${t("balanceAll")}</option>
        </select>
      </div>
    </div>

    <!-- Balance Cards Container -->
    <div class="balance-cards-container">
      <div class="balance-card-main tilt-card" id="balance-card-clickable" data-tilt data-tilt-max="10" data-tilt-speed="400" data-tilt-glare="true" data-tilt-max-glare="0.2">
        <div class="tilt-card-inner">
          <div class="period-label" id="period-label-text">
            ${activePeriod === "daily" ? t("balanceToday") : activePeriod === "weekly" ? t("balanceWeek") : activePeriod === "monthly" ? t("balanceMonth") : activePeriod === "yearly" ? t("balanceYear") : t("balanceAll")}
          </div>
          <div class="balance-amount" id="card-balance">฿0.00</div>
        </div>
      </div>
      <div class="balance-row">
        <div class="balance-item income">
          <div class="balance-item-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <div class="balance-item-label">${t("income")}</div>
              <span style="font-size: 9px; color: var(--gold); font-weight: 800; background: rgba(245,200,66,0.12); padding: 1px 4px; border-radius: 4px;">${t("tax")}</span>
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
            <div class="balance-item-label">${t("expense")}</div>
            <div class="balance-item-value" id="card-expense">฿0.00</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Net Worth Card -->
    <div class="card net-worth-card" id="net-worth-card-clickable" style="padding: 16px; margin-top: 16px; margin-bottom: 20px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, rgba(255, 184, 0, 0.05), var(--card)); border: 1px solid var(--border); border-radius: 16px; transition: all var(--transition);">
      <div style="display: flex; align-items: center; gap: 14px;">
        <div class="setting-icon-badge" style="background: rgba(255, 184, 0, 0.12); width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--gold);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div style="text-align: left;">
          <div style="font-size: 11.5px; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">ความมั่งคั่งสุทธิ (Net Worth)</div>
          <div style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin-top: 2px;" id="dashboard-net-worth">฿0.00</div>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
        <div style="font-size: 10px; color: var(--income); font-weight: 600;" id="dashboard-net-assets">สินทรัพย์: ฿0.00</div>
        <div style="font-size: 10px; color: var(--expense); font-weight: 600;" id="dashboard-net-liabilities">หนี้สิน: ฿0.00</div>
      </div>
    </div>

    <button id="down-payment-dashboard-card" class="down-payment-dashboard-card" type="button">
      <span class="down-payment-dashboard-icon">◔</span>
      <span class="down-payment-dashboard-copy"><small>${t("downPaymentDashboard")}</small><strong id="dashboard-down-payment-title">${nextDownPayment ? escapeDashboard(nextDownPayment.title) : t("downPaymentNoItems")}</strong></span>
      <span class="down-payment-dashboard-amount" id="dashboard-down-payment-amount">${nextDownPayment ? `${store.getCurrencySymbol()}${store.toDisplay(Math.max(0, nextDownPayment.totalAmount - nextDownPayment.paidAmount)).toLocaleString()}` : `+ ${t("downPaymentAdd")}`}</span>
    </button>

    <!-- Starter Guide -->
    <div id="starter-guide" class="starter-guide hidden">
      <div class="starter-guide-header">
        <div>
          <div class="eyebrow">${t("starterEyebrow")}</div>
          <h2>${t("starterTitle")}</h2>
        </div>
        <button id="dismiss-starter-btn" class="icon-btn" title="ซ่อน">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
      <div class="starter-steps">
        <button class="starter-step" data-screen-target="addTransaction">
          <span class="step-icon income-bg">+</span>
          <span>
            <strong>${t("starterIncomeTitle")}</strong>
            <small>${t("starterIncomeDesc")}</small>
          </span>
        </button>
        <button class="starter-step" data-screen-target="addTransaction">
          <span class="step-icon expense-bg">-</span>
          <span>
            <strong>${t("starterExpenseTitle")}</strong>
            <small>${t("starterExpenseDesc")}</small>
          </span>
        </button>
        <button class="starter-step" data-screen-target="planner">
          <span class="step-icon planner-bg">✦</span>
          <span>
            <strong>${t("starterPlannerTitle")}</strong>
            <small>${t("starterPlannerDesc")}</small>
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
              <div class="section-eyebrow">${t("analysis")}</div>
              <h3 class="card-title" style="font-size: 15px; margin-top: 2px;">${t("dashboardMonth")}</h3>
            </div>
            <div class="chart-legends">
              <span class="legend"><span class="dot dot-expense"></span>${t("chartExpense")}</span>
              <span class="legend"><span class="dot dot-income"></span>${t("chartIncome")}</span>
            </div>
          </div>

          <div class="analysis-controls">
            <select id="analysis-period-select" class="analysis-select">
              <option value="monthly" ${analysisPeriod === "monthly" ? "selected" : ""}>รายเดือน</option>
              <option value="yearly" ${analysisPeriod === "yearly" ? "selected" : ""}>รายปี</option>
            </select>
            <select id="analysis-month-select" class="analysis-select ${analysisPeriod !== "monthly" ? "hidden" : ""}">
              ${Array.from(
                { length: 12 },
                (_, i) => `
                <option value="${i}" ${analysisMonth === i ? "selected" : ""}>${new Date(2000, i).toLocaleString("th-TH", { month: "long" })}</option>
              `,
              ).join("")}
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
              <div class="section-eyebrow">${t("recentTransactions")}</div>
              <h3 class="section-title" style="font-size: 16px; margin-top: 2px;">${t("recentTransactions")}</h3>
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
            ">${t("viewAll")} →</button>
          </div>
          <div id="recent-transactions-list"></div>
        </div>
      </div>
    </div>
  `;

  setupEventListeners(container);
  updateUI(container);

  // Initialize VanillaTilt for 3D Cards
  VanillaTilt.init(container.querySelectorAll(".tilt-card"), {
    max: 15,
    speed: 400,
    glare: true,
    "max-glare": 0.2,
  });

  const unsubscribe = store.subscribe(() => {
    if (document.getElementById("card-balance")) {
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
  let label = "";

  switch (activePeriod) {
    case "daily":
      amount = metrics.dailyBalance;
      label = t("balanceToday");
      break;
    case "weekly":
      amount = metrics.weeklyBalance;
      label = t("balanceWeek");
      break;
    case "monthly":
      amount = metrics.monthlyBalance;
      label = t("balanceMonth");
      break;
    case "yearly":
      amount = metrics.yearlyBalance;
      label = t("balanceYear");
      break;
    case "all":
      amount = metrics.totalBalance;
      label = t("balanceAll");
      break;
  }

  const isPositive = amount >= 0;
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h3 class="modal-title">รายละเอียดยอดคงเหลือ</h3>
        <button class="modal-close-btn">×</button>
      </div>
      <div class="amount-popup-content">
        <div class="amount-popup-label">${label}</div>
        <div class="amount-popup-value" style="${isPositive ? "" : "background: linear-gradient(135deg,#f87171,#ef4444); -webkit-background-clip:text; -webkit-text-fill-color:transparent;"}">
          ${symbol}${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style="margin-top: 12px; font-size: 12px; color: var(--text-secondary);">
          ${isPositive ? "✅ ยอดคงเหลือเป็นบวก" : "⚠️ ยอดคงเหลือติดลบ"}
        </div>
      </div>
      <button class="btn-primary modal-ok-btn" style="margin-top: 24px;">ตกลง</button>
    </div>
  `;

  document.body.appendChild(modal);
  const close = () => document.body.removeChild(modal);
  modal.querySelector(".modal-close-btn").onclick = close;
  modal.querySelector(".modal-ok-btn").onclick = close;
  modal.onclick = (e) => {
    if (e.target === modal) close();
  };
}

function setupEventListeners(container) {
  container.querySelector("#daily-quests-btn").addEventListener("click", () => {
    showQuestsModal();
  });

  const periodSelect = container.querySelector("#period-select");
  if (periodSelect) {
    periodSelect.addEventListener("change", (e) => {
      activePeriod = e.target.value;
      updateUI(container);
    });
  }

  container
    .querySelector("#analysis-period-select")
    .addEventListener("change", (e) => {
      analysisPeriod = e.target.value;
      container
        .querySelector("#analysis-month-select")
        .classList.toggle("hidden", analysisPeriod !== "monthly");
      updateUI(container);
    });

  container
    .querySelector("#analysis-month-select")
    .addEventListener("change", (e) => {
      analysisMonth = parseInt(e.target.value);
      updateUI(container);
    });

  container
    .querySelector("#view-all-transactions-btn")
    .addEventListener("click", () => {
      router.navigate("transactions");
    });

  container.querySelectorAll("[data-screen-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      router.navigate(btn.getAttribute("data-screen-target"));
    });
  });

  container
    .querySelector("#dismiss-starter-btn")
    .addEventListener("click", () => {
      store.completeOnboarding();
      const guide = container.querySelector("#starter-guide");
      if (guide) guide.classList.add("hidden");
    });

  const gamificationBtn = container.querySelector("#gamification-modal-btn");
  if (gamificationBtn) {
    gamificationBtn.addEventListener("click", () => {
      const allTxs = store.getAllTransactions();
      const allIncome = allTxs.filter(t => t.isIncome).reduce((sum, t) => sum + (t.amount || 0), 0);
      const allExpense = allTxs.filter(t => !t.isIncome).reduce((sum, t) => sum + (t.amount || 0), 0);
      const isBroke = (allIncome - allExpense) < 0;

      const level = store.settings.level || 1;
      let userTitle = "";
      let titleColor = "var(--text-primary)";

      if (isBroke) {
        userTitle = store.settings.language === 'en' ? "Broke" : "ถังแตก";
        titleColor = "var(--expense)";
      } else if (level >= 20) {
        userTitle = store.settings.language === 'en' ? "Financial Guru" : "ตัวเทพการเงิน";
      } else if (level >= 10) {
        userTitle = store.settings.language === 'en' ? "Master Investor" : "ตัวตึงเรื่องลงทุน";
      } else if (level >= 5) {
        userTitle = store.settings.language === 'en' ? "Smart Spender" : "นักใช้จ่ายชาญฉลาด";
      } else {
        userTitle = store.settings.language === 'en' ? "Baby" : "เบบี๋ออมเงิน";
      }

      const boosts = store.getActiveBoosts();
      let boostHTML = "";
      if (boosts.xpMulti > 1.0) boostHTML += `XP Boost: x${boosts.xpMulti.toFixed(1)} `;
      if (boosts.coinMulti > 1.0) boostHTML += `Coin Boost: x${boosts.coinMulti.toFixed(1)}`;
      openGamificationModal(level, userTitle, boostHTML.trim() || 'Experience Points', titleColor);
    });
  }

  const balanceCard = container.querySelector("#balance-card-clickable");
  if (balanceCard) {
    balanceCard.addEventListener("click", () => showBalancePopup(container));
  }

  const netWorthCard = container.querySelector("#net-worth-card-clickable");
  if (netWorthCard) {
    netWorthCard.addEventListener("click", () => showNetWorthModal(container));
  }

  container.querySelector("#down-payment-dashboard-card")?.addEventListener("click", () => router.navigate("downPayments"));
  
  container.querySelector("#trophy-room-btn")?.addEventListener("click", () => router.navigate("achievements"));
  container.querySelector("#rewards-shop-btn")?.addEventListener("click", () => router.navigate("rewards"));
  container.querySelector("#vault-btn")?.addEventListener("click", () => router.navigate("collectibles"));

  updateUI(container);
}

function openGamificationModal(level, userTitle, boostHTML, titleColor) {
  const xp = store.settings.xp || 0;
  const xpNeeded = level * 100;
  const xpPct = Math.min((xp / xpNeeded) * 100, 100).toFixed(1);
  const coins = store.settings.coins || 0;
  const lang = store.settings.language;

  const gamificationHTML = `
    <div style="padding: 4px 0 8px; font-family: 'Sora', sans-serif;">

      <!-- Hero Section: Level + Title -->
      <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 24px;">
        <div style="
          position: relative;
          width: 80px; height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #FFB800, #FF6B00);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 6px rgba(255,184,0,0.15), 0 8px 24px rgba(255,184,0,0.35);
          font-size: 36px; font-weight: 900; color: #000;
        ">${level}</div>
        <div>
          <div style="font-size: 18px; font-weight: 800; color: var(--text-primary); text-align: center;">${lang === 'en' ? 'Player Profile' : 'โปรไฟล์ผู้เล่น'}</div>
          <div style="font-size: 13px; font-weight: 600; color: ${titleColor}; text-align: center; margin-top: 2px;">${userTitle}</div>
        </div>
      </div>

      <!-- XP + Coin Row -->
      <div style="display: flex; gap: 10px; margin-bottom: 20px;">
        <div style="flex: 1; background: rgba(255,184,0,0.08); border: 1px solid rgba(255,184,0,0.2); border-radius: 14px; padding: 12px 14px;">
          <div style="font-size: 10px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">⚡ Experience</div>
          <div style="font-size: 16px; font-weight: 800; color: var(--gold);">${xp} <span style="font-size: 11px; font-weight: 500; color: var(--text-secondary);">/ ${xpNeeded} XP</span></div>
          <div style="margin-top: 8px; background: rgba(255,255,255,0.08); border-radius: 99px; height: 6px; overflow: hidden;">
            <div style="width: ${xpPct}%; height: 100%; background: linear-gradient(90deg, #FFB800, #FF6B00); border-radius: 99px; transition: width 0.6s ease;"></div>
          </div>
          <div style="font-size: 10px; color: var(--text-secondary); margin-top: 4px; text-align: right;">${xpPct}%</div>
        </div>
        <div style="background: rgba(255,184,0,0.08); border: 1px solid rgba(255,184,0,0.2); border-radius: 14px; padding: 12px 14px; min-width: 90px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;">
          <div style="font-size: 24px;">🪙</div>
          <div style="font-size: 16px; font-weight: 800; color: var(--gold);">${coins.toLocaleString()}</div>
          <div style="font-size: 10px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.6px;">FinCoins</div>
        </div>
      </div>

      ${boostHTML ? `<div style="margin-bottom: 16px; background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.25); border-radius: 10px; padding: 8px 12px; font-size: 12px; font-weight: 700; color: #c084fc; text-align: center;">⚡ ${boostHTML}</div>` : ''}

      <!-- Navigation Buttons -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
        <button id="modal-trophy-room-btn" style="
          background: linear-gradient(135deg, #FFB800, #FF6B00);
          border: none; border-radius: 14px; padding: 14px 8px;
          cursor: pointer; display: flex; flex-direction: column;
          align-items: center; gap: 6px;
          box-shadow: 0 4px 12px rgba(255,184,0,0.3);
          transition: transform 0.15s, box-shadow 0.15s;
        ">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
          <span style="font-size: 11px; font-weight: 700; color: #000;">${lang === 'en' ? 'Trophies' : 'ถ้วยรางวัล'}</span>
        </button>
        <button id="modal-rewards-shop-btn" style="
          background: rgba(255,184,0,0.08);
          border: 1.5px solid rgba(255,184,0,0.35); border-radius: 14px; padding: 14px 8px;
          cursor: pointer; display: flex; flex-direction: column;
          align-items: center; gap: 6px;
          transition: transform 0.15s, background 0.15s;
        ">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFB800" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
          <span style="font-size: 11px; font-weight: 700; color: var(--gold);">${lang === 'en' ? 'Shop' : 'ร้านค้า'}</span>
        </button>
        <button id="modal-vault-btn" style="
          background: rgba(255,184,0,0.08);
          border: 1.5px solid rgba(255,184,0,0.35); border-radius: 14px; padding: 14px 8px;
          cursor: pointer; display: flex; flex-direction: column;
          align-items: center; gap: 6px;
          transition: transform 0.15s, background 0.15s;
        ">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFB800" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          <span style="font-size: 11px; font-weight: 700; color: var(--gold);">${lang === 'en' ? 'Vault' : 'คลังสมบัติ'}</span>
        </button>
      </div>
    </div>
  `;

  Swal.fire({
    html: gamificationHTML,
    background: 'var(--card)',
    color: 'var(--text-primary)',
    showConfirmButton: false,
    showCloseButton: true,
    width: 380,
    padding: '24px',
    customClass: {
      popup: 'custom-swal-popup'
    },
    didOpen: () => {
      const popup = Swal.getPopup();
      const trophyBtn = popup.querySelector("#modal-trophy-room-btn");
      const shopBtn = popup.querySelector("#modal-rewards-shop-btn");
      const vaultBtn = popup.querySelector("#modal-vault-btn");

      [trophyBtn, shopBtn, vaultBtn].forEach(btn => {
        btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.05)'; });
        btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });
      });

      trophyBtn.addEventListener("click", () => { Swal.close(); router.navigate("achievements"); });
      shopBtn.addEventListener("click", () => { Swal.close(); router.navigate("rewards"); });
      vaultBtn.addEventListener("click", () => { Swal.close(); router.navigate("collectibles"); });
    }
  });
}

function showQuestsModal() {
  const quests = store.settings.questsState || { checkIn: false, firstIncome: false, stayClean: true, claimed: [] };
  const boosts = store.getActiveBoosts();
  
  const questList = [
    { id: 'checkIn', label: store.settings.language === 'en' ? 'Daily Check-in' : 'เข้าใช้งานแอป', reward: 20, done: quests.checkIn },
    { id: 'firstIncome', label: store.settings.language === 'en' ? 'First Income' : 'รายรับแรกของวัน', reward: 50, done: quests.firstIncome },
    { id: 'stayClean', label: store.settings.language === 'en' ? 'Stay Clean' : 'หลีกเลี่ยงนิสัยเสีย', reward: 50, done: quests.stayClean },
  ];

  let questsListHTML = "";
  questList.forEach(q => {
    const finalReward = Math.floor(q.reward * boosts.coinMulti);
    const isClaimed = (quests.claimed || []).includes(q.id);
    let rightSide = '';
    
    if (isClaimed) {
      rightSide = `<div style="font-size: 10px; font-weight: 800; color: var(--text-muted);">${store.settings.language === 'en' ? 'Claimed' : 'รับแล้ว'}</div>`;
    } else if (q.done) {
      rightSide = `<button class="claim-quest-btn" data-id="${q.id}" data-reward="${finalReward}" style="padding: 6px 12px; font-size: 11px; font-weight: 800; border-radius: 6px; background: var(--gold); color: #000; border: none; cursor: pointer;">Claim +${finalReward} 🪙</button>`;
    } else {
      rightSide = `<div style="font-size: 11px; font-weight: 800; color: var(--text-secondary);">+${finalReward} 🪙</div>`;
    }

    questsListHTML += `
      <div style="display: flex; justify-content: space-between; align-items: center; background: var(--surface); padding: 12px; border-radius: 12px; margin-bottom: 10px; opacity: ${isClaimed ? 0.6 : 1};">
        <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
          ${q.done ? '✅' : '⏳'} ${q.label}
        </div>
        ${rightSide}
      </div>
    `;
  });

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog" style="max-width: 400px; padding: 24px;">
      <div class="modal-header">
        <h3 class="modal-title" style="display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5"><path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></svg> 
          ${store.settings.language === 'en' ? 'Daily Quests' : 'ภารกิจประจำวัน'}
        </h3>
        <button class="modal-close-btn">×</button>
      </div>
      <div style="margin-top: 16px;">
        ${questsListHTML}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => {
    modal.classList.add("fade-out");
    setTimeout(() => modal.remove(), 250);
  };

  modal.querySelector(".modal-close-btn").addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  modal.querySelectorAll(".claim-quest-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const target = e.currentTarget;
      const id = target.getAttribute("data-id");
      const reward = parseInt(target.getAttribute("data-reward"));
      
      store.settings.coins = (store.settings.coins || 0) + reward;
      store.settings.questsState.claimed = store.settings.questsState.claimed || [];
      if (!store.settings.questsState.claimed.includes(id)) {
        store.settings.questsState.claimed.push(id);
      }
      store.save();
      
      target.outerHTML = `<div style="font-size: 10px; font-weight: 800; color: var(--text-muted);">${store.settings.language === 'en' ? 'Claimed' : 'รับแล้ว'}</div>`;
      
      router.navigate("dashboard");
    });
  });
}

function updateUI(container) {
  const metrics = store.getFinanceMetrics();
  const symbol = store.getCurrencySymbol();

  let balance = 0,
    income = 0,
    expense = 0;
  switch (activePeriod) {
    case "daily":
      balance = metrics.dailyBalance;
      income = metrics.dailyIncome;
      expense = metrics.dailyExpense;
      break;
    case "weekly":
      balance = metrics.weeklyBalance;
      income = metrics.weeklyIncome;
      expense = metrics.weeklyExpense;
      break;
    case "monthly":
      balance = metrics.monthlyBalance;
      income = metrics.monthlyIncome;
      expense = metrics.monthlyExpense;
      break;
    case "yearly":
      balance = metrics.yearlyBalance;
      income = metrics.yearlyIncome;
      expense = metrics.yearlyExpense;
      break;
    case "all":
      balance = metrics.totalBalance;
      income = metrics.totalIncome;
      expense = metrics.totalExpense;
      break;
  }

  const labelText =
    activePeriod === "daily"
      ? t("balanceToday")
      : activePeriod === "weekly"
        ? t("balanceWeek")
        : activePeriod === "monthly"
          ? t("balanceMonth")
          : activePeriod === "yearly"
            ? t("balanceYear")
            : t("balanceAll");
  const periodLabel = container.querySelector("#period-label-text");
  if (periodLabel) periodLabel.textContent = labelText;

  const formatVal = (val) =>
    `${symbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  container.querySelector("#card-balance").textContent = formatVal(balance);
  container.querySelector("#card-income").textContent = formatVal(income);
  container.querySelector("#card-expense").textContent = formatVal(expense);

  // Tax estimate
  const yearlyIncomeInTHB =
    store.settings.selectedCurrency === "THB"
      ? metrics.yearlyIncome
      : convertToTHB(metrics.yearlyIncome, store.settings.selectedCurrency);
  const taxAmountTHB = store.calculateThaiTax(yearlyIncomeInTHB);
  const taxAmountDisplay = store.toDisplay(taxAmountTHB);
  container.querySelector("#card-income-tax").textContent =
    `ประมาณการภาษี: ${formatVal(taxAmountDisplay)}`;

  // Update Net Worth elements
  const netWorth = store.getNetWorth();
  const totalAssets = store.getTotalAssets();
  const totalLiabilities = store.getTotalLiabilities();

  const netWorthEl = container.querySelector("#dashboard-net-worth");
  const assetsEl = container.querySelector("#dashboard-net-assets");
  const liabilitiesEl = container.querySelector("#dashboard-net-liabilities");

  if (netWorthEl) netWorthEl.textContent = formatVal(netWorth);
  if (assetsEl)
    assetsEl.textContent = `${store.settings.language === "en" ? "Assets" : "สินทรัพย์"}: ${formatVal(totalAssets)}`;
  if (liabilitiesEl)
    liabilitiesEl.textContent = `${store.settings.language === "en" ? "Liabilities" : "หนี้สิน"}: ${formatVal(totalLiabilities)}`;

  const nextPlan = store.getDownPayments().find((plan) => plan.paidAmount < plan.totalAmount);
  const planTitle = container.querySelector("#dashboard-down-payment-title");
  const planAmount = container.querySelector("#dashboard-down-payment-amount");
  if (planTitle) planTitle.textContent = nextPlan ? nextPlan.title : t("downPaymentNoItems");
  if (planAmount) planAmount.textContent = nextPlan ? formatVal(Math.max(0, nextPlan.totalAmount - nextPlan.paidAmount)) : `+ ${t("downPaymentAdd")}`;

  // Bar chart
  const canvas = container.querySelector("#spending-chart-canvas");
  if (analysisPeriod === "monthly") {
    const daysInMonth = new Date(analysisYear, analysisMonth + 1, 0).getDate();
    renderSpendingChart(
      canvas,
      store.getDailyExpensesForMonth(),
      store.getDailyIncomeForMonth(),
      daysInMonth,
      symbol,
    );
  } else {
    renderSpendingChart(
      canvas,
      store.getDailyExpensesForMonth(),
      store.getDailyIncomeForMonth(),
      31,
      symbol,
    );
  }

  // Pie chart
  const pieCanvas = container.querySelector("#category-pie-chart-canvas");
  const categoryData = store.getCategorySpending(
    analysisPeriod,
    analysisMonth,
    analysisYear,
  );
  const pieInfo = renderCategoryPieChart(pieCanvas, categoryData, symbol);

  const legendContainer = container.querySelector("#pie-chart-legend");
  legendContainer.innerHTML = "";
  if (pieInfo) {
    pieInfo.categories.forEach((cat, i) => {
      const val = pieInfo.dataValues[i];
      const percent = ((val / pieInfo.total) * 100).toFixed(1);
      const item = document.createElement("div");
      item.className = "pie-legend-item";
      item.innerHTML = `
        <span class="pie-dot" style="background: ${pieInfo.colors[i]}"></span>
        <span>${cat} <strong style="color:var(--text-primary)">${percent}%</strong></span>
      `;
      legendContainer.appendChild(item);
    });
  }

  // Recent transactions
  const listContainer = container.querySelector("#recent-transactions-list");
  listContainer.innerHTML = "";

  const transactions = store.getAllTransactions().slice(0, 5);
  const allTransactions = store.getAllTransactions();
  const starterGuide = container.querySelector("#starter-guide");

  if (starterGuide) {
    starterGuide.classList.toggle(
      "hidden",
      allTransactions.length > 0 || store.settings.hasCompletedOnboarding,
    );
  }

  if (transactions.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state" style="padding: 32px 20px;">
        <div class="empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
        </div>
        <p class="empty-text">${t("emptyTransactions")}</p>
        <p class="empty-subtext">${t("emptyTransactionsHint")}</p>
        <button id="dashboard-add-first-btn" class="btn-primary" style="margin-top: 16px; width: auto; padding: 10px 24px; font-size: 13px;">${t("addFirst")}</button>
      </div>
    `;
    const addBtn = listContainer.querySelector("#dashboard-add-first-btn");
    if (addBtn)
      addBtn.addEventListener("click", () => router.navigate("addTransaction"));
  } else {
    transactions.forEach((tx) => {
      const tile = createTransactionTile(
        tx,
        symbol,
        store.toDisplay(tx.amount),
        (transaction) =>
          router.navigate("addTransaction", { transactionId: transaction.id }),
        async (id) => {
          const isConfirmed = await alerts.confirmDelete(
            store.settings.language === "en"
              ? "Delete Transaction?"
              : "ต้องการลบรายการ?",
            store.settings.language === "en"
              ? "This action cannot be undone."
              : "รายการนี้จะถูกลบออกอย่างถาวร",
          );
          if (isConfirmed) store.deleteTransaction(id);
        },
      );
      listContainer.appendChild(tile);
    });
  }
}

function escapeDashboard(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function showNetWorthModal(container) {
  const isDark = store.settings.isDarkMode;
  const lang = store.settings.language;
  const nw = store.netWorth || {
    assets: { cash: 0, investments: 0, property: 0, other: 0 },
    liabilities: { creditCard: 0, loans: 0, other: 0 },
  };
  const symbol = store.getCurrencySymbol();

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog" style="max-width: 480px; padding: 22px;">
      <div class="modal-header">
        <h3 class="modal-title">${lang === "en" ? "Balance Sheet (Net Worth)" : "งบดุลยภาพ (สินทรัพย์ & หนี้สิน)"}</h3>
        <button class="modal-close-btn">×</button>
      </div>
      <div style="padding-top: 6px; display: flex; flex-direction: column; gap: 16px;">
        <p style="font-size: 11px; color: var(--text-secondary); line-height: 1.5; margin: 0; text-align: left;">
          ${
            lang === "en"
              ? "Track your total net worth by logging your assets and liabilities. This data is saved locally."
              : "บันทึกมูลค่าทรัพย์สินและหนี้สินทั้งหมดของคุณเพื่อคำนวณความมั่งคั่งสุทธิ ข้อมูลนี้จะถูกจัดเก็บในเครื่องอย่างปลอดภัย"
          }
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; text-align: left;">
          <!-- Assets column -->
          <div>
            <h4 style="font-size: 13px; font-weight: 700; color: var(--income); margin-bottom: 10px; display: flex; align-items: center; gap: 6px; margin-top: 0;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              ${lang === "en" ? "Assets" : "สินทรัพย์ (+)"}
            </h4>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 10px; margin-bottom: 4px;">${lang === "en" ? "Cash & Bank" : "เงินสดและเงินฝาก"}</label>
                <input type="number" id="nw-asset-cash" class="form-control" style="font-size:12px; padding:8px 12px;" value="${nw.assets.cash || ""}" placeholder="0.00" />
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 10px; margin-bottom: 4px;">${lang === "en" ? "Investments" : "หุ้น/กองทุน/ทองคำ"}</label>
                <input type="number" id="nw-asset-investments" class="form-control" style="font-size:12px; padding:8px 12px;" value="${nw.assets.investments || ""}" placeholder="0.00" />
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 10px; margin-bottom: 4px;">${lang === "en" ? "Property & Vehicles" : "บ้าน/ที่ดิน/รถยนต์"}</label>
                <input type="number" id="nw-asset-property" class="form-control" style="font-size:12px; padding:8px 12px;" value="${nw.assets.property || ""}" placeholder="0.00" />
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 10px; margin-bottom: 4px;">${lang === "en" ? "Other Assets" : "สินทรัพย์อื่น ๆ"}</label>
                <input type="number" id="nw-asset-other" class="form-control" style="font-size:12px; padding:8px 12px;" value="${nw.assets.other || ""}" placeholder="0.00" />
              </div>
            </div>
          </div>

          <!-- Liabilities column -->
          <div>
            <h4 style="font-size: 13px; font-weight: 700; color: var(--expense); margin-bottom: 10px; display: flex; align-items: center; gap: 6px; margin-top: 0;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              ${lang === "en" ? "Liabilities" : "หนี้สิน (-)"}
            </h4>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 10px; margin-bottom: 4px;">${lang === "en" ? "Credit Cards" : "หนี้บัตรเครดิต"}</label>
                <input type="number" id="nw-lia-credit" class="form-control" style="font-size:12px; padding:8px 12px;" value="${nw.liabilities.creditCard || ""}" placeholder="0.00" />
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 10px; margin-bottom: 4px;">${lang === "en" ? "Loans & Mortgages" : "เงินกู้/หนี้บ้าน/หนี้รถ"}</label>
                <input type="number" id="nw-lia-loans" class="form-control" style="font-size:12px; padding:8px 12px;" value="${nw.liabilities.loans || ""}" placeholder="0.00" />
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 10px; margin-bottom: 4px;">${lang === "en" ? "Other Debt" : "หนี้สินอื่น ๆ"}</label>
                <input type="number" id="nw-lia-other" class="form-control" style="font-size:12px; padding:8px 12px;" value="${nw.liabilities.other || ""}" placeholder="0.00" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style="display: flex; gap: 10px; margin-top: 24px;">
        <button class="modal-cancel-btn" style="flex:1; border:1px solid var(--border); padding:12px; border-radius:12px; color: var(--text-secondary); background: transparent; font-weight: 600; cursor: pointer;">${lang === "en" ? "Cancel" : "ยกเลิก"}</button>
        <button class="btn-primary modal-save-btn" style="flex:1; padding:12px; border-radius:12px; font-weight: 700; cursor: pointer;">${lang === "en" ? "Save" : "บันทึก"}</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  const close = () => document.body.removeChild(modal);
  modal.querySelector(".modal-close-btn").onclick = close;
  modal.querySelector(".modal-cancel-btn").onclick = close;
  modal.querySelector(".modal-save-btn").onclick = () => {
    const assets = {
      cash: parseFloat(modal.querySelector("#nw-asset-cash").value) || 0,
      investments:
        parseFloat(modal.querySelector("#nw-asset-investments").value) || 0,
      property:
        parseFloat(modal.querySelector("#nw-asset-property").value) || 0,
      other: parseFloat(modal.querySelector("#nw-asset-other").value) || 0,
    };
    const liabilities = {
      creditCard: parseFloat(modal.querySelector("#nw-lia-credit").value) || 0,
      loans: parseFloat(modal.querySelector("#nw-lia-loans").value) || 0,
      other: parseFloat(modal.querySelector("#nw-lia-other").value) || 0,
    };
    store.saveNetWorth(assets, liabilities);
    close();
    alerts.success(
      lang === "en" ? "Balance Sheet updated!" : "อัปเดตงบดุลเรียบร้อยแล้ว!",
    );
  };
}
