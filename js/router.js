import { store } from "./store.js";

let currentScreen = "dashboard";
let currentParams = null;

const screenLoaders = {
  auth: () => import("./screens/auth.js"),
  downPayments: () => import("./screens/downPayments.js"),
  dashboard: () => import("./screens/dashboard.js"),
  transactions: () => import("./screens/transactions.js"),
  addTransaction: () => import("./screens/addTransaction.js"),
  add: () => import("./screens/addTransaction.js"),
  recurring: () => import("./screens/recurring_v2.js"),
  settings: () => import("./screens/settings.js"),
  planner: () => import("./screens/planner.js"),
  export: () => import("./screens/export.js"),
  splitBill: () => import("./screens/splitBill.js"),
  achievements: () => import("./screens/achievements.js"),
  rewards: () => import("./screens/rewards.js"),
  collectibles: () => import("./screens/collectibles.js"),
  wallets: () => import("./screens/wallets.js"),
  savings: () => import("./screens/savings.js"),
  reports: () => import("./screens/reports.js"),
};

const screenExports = {
  auth: "renderAuth",
  downPayments: "renderDownPayments",
  dashboard: "renderDashboard",
  transactions: "renderTransactions",
  addTransaction: "renderAddTransaction",
  add: "renderAddTransaction",
  recurring: "renderRecurring",
  settings: "renderSettings",
  planner: "renderPlanner",
  export: "renderExport",
  splitBill: "renderSplitBill",
  achievements: "renderAchievements",
  rewards: "renderRewards",
  collectibles: "renderCollectibles",
  wallets: "renderWallets",
  savings: "renderSavings",
  reports: "renderReports",
};

const screenCache = new Map();

function renderSkeleton(container) {
  container.innerHTML = `
    <div class="screen" style="padding: 0 16px 100px;">
      <div style="padding: 16px 0 14px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="skeleton skeleton-avatar"></div>
          <div>
            <div class="skeleton skeleton-text" style="width: 60px; height: 10px; margin-bottom: 6px;"></div>
            <div class="skeleton skeleton-text" style="width: 120px; height: 16px; margin-bottom: 0;"></div>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <div class="skeleton" style="width: 38px; height: 38px; border-radius: var(--radius);"></div>
          <div class="skeleton" style="width: 38px; height: 38px; border-radius: var(--radius);"></div>
        </div>
      </div>
      <div class="skeleton skeleton-card"></div>
      <div style="display: flex; gap: 6px; justify-content: center; margin-bottom: 18px;">
        <div class="skeleton" style="width: 16px; height: 6px; border-radius: 999px;"></div>
        <div class="skeleton" style="width: 6px; height: 6px; border-radius: 999px;"></div>
        <div class="skeleton" style="width: 6px; height: 6px; border-radius: 999px;"></div>
      </div>
      <div class="skeleton-grid-4">
        <div class="skeleton skeleton-action"></div>
        <div class="skeleton skeleton-action"></div>
        <div class="skeleton skeleton-action"></div>
        <div class="skeleton skeleton-action"></div>
      </div>
      <div style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 18px 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
          <div class="skeleton skeleton-text" style="width: 130px; height: 15px;"></div>
          <div class="skeleton skeleton-pill" style="width: 60px; height: 24px;"></div>
        </div>
        <div class="skeleton-row"><div class="skeleton skeleton-icon"></div><div class="skeleton-content"><div class="skeleton skeleton-text long"></div><div class="skeleton skeleton-text short"></div></div></div>
        <div class="skeleton-row"><div class="skeleton skeleton-icon"></div><div class="skeleton-content"><div class="skeleton skeleton-text medium"></div><div class="skeleton skeleton-text short"></div></div></div>
        <div class="skeleton-row"><div class="skeleton skeleton-icon"></div><div class="skeleton-content"><div class="skeleton skeleton-text long"></div><div class="skeleton skeleton-text short"></div></div></div>
        <div class="skeleton-row"><div class="skeleton skeleton-icon"></div><div class="skeleton-content"><div class="skeleton skeleton-text medium"></div><div class="skeleton skeleton-text short"></div></div></div>
        <div class="skeleton-row"><div class="skeleton skeleton-icon"></div><div class="skeleton-content"><div class="skeleton skeleton-text long"></div><div class="skeleton skeleton-text short"></div></div></div>
      </div>
    </div>
  `;
}

export const router = {
  init() {
    document.body.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-screen]");
      if (btn) {
        const targetScreen = btn.getAttribute("data-screen");
        if (targetScreen) {
          this.navigate(targetScreen);
        }
      }
    });
  },

  async navigate(screenKey, params = null) {
    if (!screenKey) return;
    const cleanKey = screenKey.replace(/^\//, "");

    if (!screenLoaders[cleanKey]) {
      console.warn(`Screen "${cleanKey}" not found.`);
      return;
    }

    currentScreen = cleanKey;
    currentParams = params;

    // Update bottom nav UI
    const bottomNav = document.getElementById("bottom-nav");
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("sidebar-toggle-btn");

    if (screenKey === 'auth') {
      if (bottomNav) bottomNav.style.display = 'none';
      if (sidebar) sidebar.style.display = 'none';
      if (toggleBtn) toggleBtn.style.display = 'none';
      
      const screenContainer = document.getElementById("screen-container");
      if (screenContainer) {
        screenContainer.style.marginLeft = '0';
        screenContainer.style.width = '100%';
      }
    } else {
      if (bottomNav && window.innerWidth < 900) bottomNav.style.display = 'flex';
      if (sidebar && window.innerWidth >= 900) sidebar.style.display = 'flex';
      if (toggleBtn && window.innerWidth < 900) toggleBtn.style.display = 'flex';

      const screenContainer = document.getElementById("screen-container");
      if (screenContainer) {
        if (window.innerWidth >= 900) {
          screenContainer.style.marginLeft = '260px';
          screenContainer.style.width = 'calc(100% - 260px)';
        } else {
          screenContainer.style.marginLeft = '0';
          screenContainer.style.width = '100%';
        }
      }
    }

    document.querySelectorAll("[data-screen]").forEach((btn) => {
      const btnScreen = btn.getAttribute("data-screen");
      if (btnScreen === screenKey) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    const container = document.getElementById("screen-container");
    if (!container) return;

    // Show skeleton loading state
    renderSkeleton(container);
    window.scrollTo(0, 0);

    try {
      // Load screen module (cached after first load)
      let renderFn;
      if (screenCache.has(cleanKey)) {
        renderFn = screenCache.get(cleanKey);
      } else {
        const mod = await screenLoaders[cleanKey]();
        renderFn = mod[screenExports[cleanKey]];
        if (!renderFn) {
          throw new Error(`Export "${screenExports[cleanKey]}" not found in screen module "${cleanKey}"`);
        }
        screenCache.set(cleanKey, renderFn);
      }

      // Verify we're still on the same screen (user may have navigated away during load)
      if (currentScreen !== cleanKey) return;

      // Render the actual screen
      container.innerHTML = "";
      container.classList.remove('screen-enter');
      void container.offsetWidth;
      container.classList.add('screen-enter');
      await renderFn(container, params);
    } catch (error) {
      console.error(`Failed to load screen "${cleanKey}":`, error);
      const isEn = store.settings?.language === "en";
      container.innerHTML = `
        <div class="error-boundary">
          <div style="width: 64px; height: 64px; margin: 0 auto 20px; border-radius: 16px; background: var(--expense-soft); color: var(--expense); display: flex; align-items: center; justify-content: center;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 style="color: var(--text-primary); font-size: 18px; font-weight: 800; margin: 0 0 8px;">${isEn ? 'Something went wrong' : 'เกิดข้อผิดพลาด'}</h2>
          <p style="color: var(--text-secondary); font-size: 13px; margin: 0 0 24px; line-height: 1.5;">${isEn ? 'This screen could not be loaded. Please try again.' : 'ไม่สามารถโหลดหน้าจอนี้ได้ กรุณาลองอีกครั้ง'}</p>
          <button onclick="location.reload()" style="background: var(--gold); color: #000; border: none; padding: 12px 28px; border-radius: var(--radius); font-weight: 800; font-size: 13px; cursor: pointer; box-shadow: var(--btn-shadow);">${isEn ? 'Reload App' : 'โหลดใหม่'}</button>
        </div>
      `;
    }
  },

  getCurrentScreen() {
    return currentScreen;
  },

  getCurrentParams() {
    return currentParams;
  },
};
