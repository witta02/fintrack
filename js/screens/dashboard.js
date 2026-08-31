import { store } from "../store.js";
import { router } from "../router.js";
import { t } from "../i18n.js";
import { getCategoryInfo } from "../categories.js";
import { alerts } from "../utils/alertHelper.js";
import confetti from "canvas-confetti";

let activeDateFilter = "all"; // "all" | "today"
let searchQuery = "";

function getWalletIcon(type = 'cash') {
  const t = (type || 'cash').toLowerCase();
  if (t === 'bank') {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18"/><line x1="10" x2="10" y1="18"/><line x1="14" x2="14" y1="18"/><line x1="18" x2="18" y1="18"/><polygon points="12 2 20 7 4 7"/><line x1="2" x2="22" y1="18" y2="18"/></svg>`;
  }
  if (t === 'savings') {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="3"/><circle cx="12" cy="12" r="4"/><line x1="12" x2="12" y1="8" y2="10"/><line x1="12" x2="12" y1="14" y2="16"/><line x1="8" x2="10" y1="12" y2="12"/><line x1="14" x2="16" y1="12" y2="12"/></svg>`;
  }
  if (t === 'investment') {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`;
  }
  if (t === 'credit') {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`;
  }
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>`;
}

function getWalletCardGradient(w, index = 0) {
  const type = (w.type || 'cash').toLowerCase();
  const c = (w.color || '').toLowerCase();

  if (type === 'bank' || c.includes('3b82f6') || c.includes('blue')) {
    return 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)';
  }
  if (type === 'savings' || c.includes('ea580c') || c.includes('orange') || c.includes('f97316')) {
    return 'linear-gradient(135deg, #7c2d12 0%, #c2410c 50%, #ea580c 100%)';
  }
  if (type === 'credit' || c.includes('ef4444') || c.includes('red') || c.includes('e11d48')) {
    return 'linear-gradient(135deg, #881337 0%, #be123c 50%, #e11d48 100%)';
  }
  if (type === 'investment' || c.includes('6366f1') || c.includes('violet') || c.includes('8b5cf6') || c.includes('7c3aed')) {
    return 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #7c3aed 100%)';
  }
  if (c.includes('10b981') || c.includes('green') || c.includes('059669')) {
    return 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)';
  }
  if (c.includes('f59e0b') || c.includes('gold') || c.includes('d97706')) {
    return 'linear-gradient(135deg, #78350f 0%, #b45309 50%, #d97706 100%)';
  }

  // Fallback palette
  const gradients = [
    'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)',
    'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)',
    'linear-gradient(135deg, #7c2d12 0%, #c2410c 50%, #ea580c 100%)',
    'linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #7c3aed 100%)',
    'linear-gradient(135deg, #78350f 0%, #b45309 50%, #d97706 100%)',
  ];
  return gradients[index % gradients.length];
}

export async function renderDashboard(container) {
  const sym = store.getCurrencySymbol();
  const wallets = store.getWallets();
  const isEn = store.settings.language === "en";
  const userName = store.user?.user_metadata?.full_name || store.user?.email?.split('@')[0] || (isEn ? 'FinTracker' : 'ผู้ใช้งาน');
  const level = store.settings.level || 1;
  const xp = store.settings.xp || 0;
  const coins = store.settings.coins || 0;
  const dailyQuests = store.getDailyQuests();
  const streak = store.calculateStreak();
  const hasUnclaimedMissions = dailyQuests.some(q => q.completed && !q.claimed);

  // Main Total Balance across ALL wallets
  const totalBalance = store.getTotalBalance();

  // Inflow & Outflow for current month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const allTxs = store.getAllTransactions();
  const monthTxs = allTxs.filter(tx => new Date(tx.date) >= monthStart);

  const monthInflow = monthTxs.filter(tx => tx.isIncome).reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
  const monthOutflow = monthTxs.filter(tx => !tx.isIncome).reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);

  // Sparkline mini bars
  const sparklineData = [
    { inPct: 60, outPct: 40 },
    { inPct: 80, outPct: 30 },
    { inPct: 70, outPct: 90 },
    { inPct: 100, outPct: 45 },
  ];

  // Total slides = 1 (Total Money Card) + wallets count + 1 (+ Add Wallet Card)
  const totalSlides = 1 + wallets.length + 1;

  // Filtered Transactions for Feed
  let feedTxs = allTxs.filter(tx => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (tx.title || '').toLowerCase().includes(q);
      const matchCat = (tx.category || '').toLowerCase().includes(q);
      const matchNotes = (tx.notes || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCat && !matchNotes) return false;
    }
    if (activeDateFilter === "today") {
      const txDate = new Date(tx.date);
      return txDate.toDateString() === now.toDateString();
    }
    return true;
  });

  const html = `
    <style>
      .hero-carousel-track {
        display: flex;
        gap: 14px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
        border-radius: var(--radius-2xl);
        padding-bottom: 2px;
      }
      .hero-carousel-track::-webkit-scrollbar {
        display: none;
      }
      .hero-slide-card {
        width: 100%;
        min-width: 100%;
        box-sizing: border-box;
        scroll-snap-align: center;
        border-radius: var(--radius-2xl);
        padding: 20px 22px;
        min-height: 168px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        overflow: hidden;
        box-shadow: var(--card-shadow);
        transition: transform 0.2s ease;
      }
      .wallet-hero-slide::before {
        content: "";
        position: absolute;
        bottom: -40px;
        right: -30px;
        width: 180px;
        height: 180px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 70%);
        pointer-events: none;
      }
      .wallet-hero-slide::after {
        content: "";
        position: absolute;
        top: -40px;
        left: -30px;
        width: 150px;
        height: 150px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.10) 0%, rgba(255, 255, 255, 0) 70%);
        pointer-events: none;
      }
    </style>

    <div class="screen screen-enter dashboard-screen-wrap" style="padding: 0 16px 100px;">
      <!-- Top Greeting Bar -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px 0 14px;">
        <div id="dash-user-avatar-btn" style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
          <!-- User Avatar Chip -->
          <div style="position: relative; width: 42px; height: 42px; border-radius: 50%; background: var(--gold-soft); border: 2px solid var(--gold); display: flex; align-items: center; justify-content: center; font-weight: 900; color: var(--gold); font-size: 16px; flex-shrink: 0;">
            ${userName.charAt(0).toUpperCase()}
            ${hasUnclaimedMissions ? `
              <span style="position: absolute; top: -2px; right: -2px; width: 15px; height: 15px; border-radius: 50%; background: #ef4444; color: #ffffff; font-size: 10px; font-weight: 900; display: flex; align-items: center; justify-content: center; border: 2px solid var(--card); font-family: var(--font-heading); box-shadow: 0 0 8px rgba(239,68,68,0.8); animation: pulse 1.5s infinite;">!</span>
            ` : `
              <span style="position: absolute; bottom: 0; right: 0; width: 10px; height: 10px; background: var(--income); border-radius: 50%; border: 2px solid var(--card);"></span>
            `}
          </div>
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 5px;">
              <span>LV.${level}</span>
              <span>•</span>
              <span style="color: var(--gold);">${coins} Coins</span>
            </div>
            <div style="font-size: 16px; font-weight: 800; color: var(--text-primary); letter-spacing: -0.2px;">
              Hello, ${userName}!
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="dash-missions-btn" class="icon-btn" title="${isEn ? 'Daily Missions' : 'ภารกิจประจำวัน'}" style="position: relative; background: var(--surface); border: 1px solid ${hasUnclaimedMissions ? 'var(--gold)' : 'var(--border)'}; color: var(--gold); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: var(--radius); transition: all 0.2s ease;">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            ${hasUnclaimedMissions ? `
              <span style="position: absolute; top: -3px; right: -3px; width: 16px; height: 16px; border-radius: 50%; background: #ef4444; color: #ffffff; font-size: 10.5px; font-weight: 900; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 8px rgba(239, 68, 68, 0.8); animation: pulse 1.5s infinite; border: 2px solid var(--card); font-family: var(--font-heading);">!</span>
            ` : ''}
          </button>
          
          <button id="dash-settings-btn" class="icon-btn" style="background: var(--surface); border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: var(--radius);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>
      </div>

      <!-- FULL-WIDTH SLIDING HERO CAROUSEL -->
      <div style="margin-bottom: 20px;">
        <!-- The Carousel Track -->
        <div id="dash-hero-carousel" class="hero-carousel-track">
          
          <!-- SLIDE 0: MAIN TOTAL BALANCE CARD -->
          <div class="hero-slide-card" data-slide-index="0" style="background: var(--card); border: 1px solid var(--border);">
            <!-- Top Row: Title & Manage Button -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <div style="font-size: 11.5px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.6px;">
                ${isEn ? 'Total Balance' : 'ยอดเงินรวมทุกกระเป๋า'}
              </div>
              <button id="hero-manage-wallets-btn" style="background: var(--surface); border: 1px solid var(--border); padding: 5px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; color: var(--gold); cursor: pointer; display: flex; align-items: center; gap: 4px;">
                <span>${isEn ? 'Manage' : 'จัดการ'}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>

            <!-- Center: Grand Total Balance -->
            <div id="dash-total-balance" style="font-size: 34px; font-weight: 900; color: var(--text-primary); font-family: var(--font-heading); letter-spacing: -0.8px; margin: 4px 0 16px;">
              ${sym} ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>

            <!-- Bottom Row: Inflow, Outflow & Sparkline -->
            <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 14px; border-top: 1px solid var(--border);">
              <div style="display: flex; align-items: center; gap: 16px;">
                <div style="display: flex; align-items: center; gap: 7px;">
                  <div style="width: 24px; height: 24px; border-radius: 6px; background: rgba(16, 185, 129, 0.12); color: var(--income); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900;">
                    ▲
                  </div>
                  <div>
                    <div style="font-size: 10px; color: var(--text-secondary); font-weight: 700; text-transform: uppercase;">${isEn ? 'Income' : 'รายรับ'}</div>
                    <div style="font-size: 13px; font-weight: 800; color: var(--income);">${sym}${monthInflow.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 7px;">
                  <div style="width: 24px; height: 24px; border-radius: 6px; background: rgba(239, 68, 68, 0.12); color: var(--expense); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900;">
                    ▼
                  </div>
                  <div>
                    <div style="font-size: 10px; color: var(--text-secondary); font-weight: 700; text-transform: uppercase;">${isEn ? 'Expense' : 'รายจ่าย'}</div>
                    <div style="font-size: 13px; font-weight: 800; color: var(--expense);">${sym}${monthOutflow.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                  </div>
                </div>
              </div>

              <!-- Sparkline Bars -->
              <div style="display: flex; align-items: flex-end; gap: 3.5px; height: 24px;">
                ${sparklineData.map(d => `
                  <div style="display: flex; gap: 2px; align-items: flex-end; height: 100%;">
                    <div style="width: 3.5px; height: ${Math.round((d.inPct / 100) * 20)}px; background: var(--income); border-radius: 999px;"></div>
                    <div style="width: 3.5px; height: ${Math.round((d.outPct / 100) * 20)}px; background: var(--expense); border-radius: 999px;"></div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- SLIDE 1..N: AUTHENTIC PERSONAL FINANCE WALLET CARDS -->
          ${wallets.map((w, idx) => {
            const wBal = store.getWalletBalance(w.id);
            const grad = getWalletCardGradient(w, idx);
            const iconSvg = getWalletIcon(w.type);
            const typeLabel = w.type ? w.type.toUpperCase() : 'WALLET';

            return `
              <div class="hero-slide-card wallet-hero-slide" data-slide-index="${idx + 1}" data-wallet-id="${w.id}" style="background: ${grad}; color: #FFFFFF; cursor: pointer;">
                <!-- Top Row: Icon + Wallet Name & Type Badge -->
                <div style="display: flex; align-items: center; justify-content: space-between; z-index: 1;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(255,255,255,0.18); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
                      ${iconSvg}
                    </div>
                    <div>
                      <div style="font-size: 15px; font-weight: 900; letter-spacing: -0.2px; text-shadow: 0 1px 2px rgba(0,0,0,0.3); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${w.name}
                      </div>
                      <div style="font-size: 9.5px; font-weight: 800; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${typeLabel}
                      </div>
                    </div>
                  </div>

                  <!-- Right: Status / Currency Badge -->
                  <div style="display: flex; align-items: center; gap: 6px;">
                    ${w.isDefault ? `
                      <span style="font-size: 10px; font-weight: 800; background: rgba(245, 200, 66, 0.25); color: #F5C842; border: 1px solid rgba(245, 200, 66, 0.4); padding: 3px 8px; border-radius: 999px; text-transform: uppercase;">
                        ${isEn ? 'Primary' : 'กระเป๋าหลัก'}
                      </span>
                    ` : `
                      <span style="font-size: 10px; font-weight: 800; background: rgba(255,255,255,0.15); padding: 3px 8px; border-radius: 999px; text-transform: uppercase;">
                        ${w.currency || 'THB'}
                      </span>
                    `}
                  </div>
                </div>

                <!-- Center: Wallet Balance -->
                <div style="margin: 14px 0 16px; z-index: 1;">
                  <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; opacity: 0.8; letter-spacing: 0.6px; margin-bottom: 2px;">
                    ${isEn ? 'Wallet Balance' : 'ยอดเงินคงเหลือ'}
                  </div>
                  <div style="font-size: 34px; font-weight: 900; font-family: var(--font-heading); letter-spacing: -0.6px; text-shadow: 0 2px 4px rgba(0,0,0,0.35);">
                    ${sym}${wBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <!-- Bottom Row: Status Indicator & Manage Action -->
                <div style="display: flex; align-items: center; justify-content: space-between; z-index: 1; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.15);">
                  <div style="font-size: 11px; font-weight: 700; opacity: 0.9; display: flex; align-items: center; gap: 6px;">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>
                    <span>${w.isDefault ? (isEn ? 'Primary Account' : 'กระเป๋าหลัก') : (isEn ? 'Active' : 'พร้อมใช้งาน')}</span>
                  </div>

                  <div style="font-size: 11px; font-weight: 800; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 999px; display: flex; align-items: center; gap: 4px;">
                    <span>${isEn ? 'Manage' : 'จัดการ'}</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                </div>
              </div>
            `;
          }).join('')}

          <!-- FINAL SLIDE: + ADD WALLET CARD -->
          <div id="dash-add-wallet-slide" class="hero-slide-card" data-slide-index="${wallets.length + 1}" style="background: var(--surface); border: 2px dashed var(--border); box-shadow: none; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; cursor: pointer; text-align: center;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--gold-soft); border: 2px solid var(--gold); display: flex; align-items: center; justify-content: center; color: var(--gold);">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 800; color: var(--text-primary); margin-bottom: 2px;">
                ${isEn ? 'Add New Wallet' : 'เพิ่มกระเป๋าใหม่'}
              </div>
              <div style="font-size: 11px; color: var(--text-secondary);">
                ${isEn ? 'Tap here to create a new bank, cash, or savings wallet' : 'แตะเพื่อสร้างกระเป๋าเงินสด บัญชีธนาคาร หรือเงินออม'}
              </div>
            </div>
          </div>

        </div>

        <!-- CAROUSEL PAGINATION DOTS -->
        <div id="dash-hero-dots" style="display: flex; gap: 6px; margin-top: 10px; align-items: center; justify-content: center;">
          ${Array.from({ length: totalSlides }).map((_, i) => `
            <div class="dash-hero-dot ${i === 0 ? 'active' : ''}" data-dot-index="${i}" style="width: ${i === 0 ? '16px' : '6px'}; height: 6px; border-radius: 999px; background: ${i === 0 ? 'var(--gold)' : 'var(--border)'}; transition: all 0.25s ease; cursor: pointer;"></div>
          `).join('')}
        </div>
      </div>

      <!-- Quick Utility Action Pills (4 Core Pillars) -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 18px;">
        <div id="quick-savings" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 12px 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; cursor: pointer; transition: all 0.2s ease; box-shadow: var(--card-shadow);">
          <div style="width: 34px; height: 34px; border-radius: 10px; background: rgba(16, 185, 129, 0.12); color: var(--income); display: flex; align-items: center; justify-content: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          </div>
          <div style="font-size: 10.5px; font-weight: 800; color: var(--text-primary); text-align: center; white-space: nowrap;">
            ${isEn ? 'Savings' : 'กระปุกออม'}
          </div>
        </div>

        <div id="quick-recurring" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 12px 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; cursor: pointer; transition: all 0.2s ease; box-shadow: var(--card-shadow);">
          <div style="width: 34px; height: 34px; border-radius: 10px; background: rgba(245, 200, 66, 0.12); color: var(--gold); display: flex; align-items: center; justify-content: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          </div>
          <div style="font-size: 10.5px; font-weight: 800; color: var(--text-primary); text-align: center; white-space: nowrap;">
            ${isEn ? 'Recurring' : 'บิลประจำ'}
          </div>
        </div>

        <div id="quick-downpayments" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 12px 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; cursor: pointer; transition: all 0.2s ease; box-shadow: var(--card-shadow);">
          <div style="width: 34px; height: 34px; border-radius: 10px; background: rgba(168, 85, 247, 0.12); color: #a855f7; display: flex; align-items: center; justify-content: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          </div>
          <div style="font-size: 10.5px; font-weight: 800; color: var(--text-primary); text-align: center; white-space: nowrap;">
            ${isEn ? 'Installment' : 'ค่างวด/ดาวน์'}
          </div>
        </div>

        <div id="quick-split-bill" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 12px 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; cursor: pointer; transition: all 0.2s ease; box-shadow: var(--card-shadow);">
          <div style="width: 34px; height: 34px; border-radius: 10px; background: rgba(59, 130, 246, 0.12); color: #3b82f6; display: flex; align-items: center; justify-content: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div style="font-size: 10.5px; font-weight: 800; color: var(--text-primary); text-align: center; white-space: nowrap;">
            ${isEn ? 'Split Bill' : 'หารบิล'}
          </div>
        </div>
      </div>

      <!-- RECENT TRANSACTIONS FEED -->
      <div style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 18px 16px; box-shadow: var(--card-shadow);">
        <!-- Feed Header & Search -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <h2 style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0;">
              ${isEn ? 'Recent Transactions' : 'รายการล่าสุด'}
            </h2>
            <button id="dash-view-all-tx-btn" style="background: var(--surface); border: 1px solid var(--border); padding: 3px 8px; border-radius: 999px; color: var(--gold); font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 2px;">
              <span>${isEn ? 'View All' : 'ดูทั้งหมด'}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
          <div style="display: flex; gap: 4px; background: var(--surface); border: 1px solid var(--border); padding: 2px; border-radius: 999px;">
            <button class="tx-filter-pill ${activeDateFilter === 'all' ? 'active' : ''}" data-filter="all" style="padding: 4px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 800; border: none; cursor: pointer; background: ${activeDateFilter === 'all' ? 'var(--gold)' : 'transparent'}; color: ${activeDateFilter === 'all' ? '#000' : 'var(--text-secondary)'};">
              ${isEn ? 'All' : 'ทั้งหมด'}
            </button>
            <button class="tx-filter-pill ${activeDateFilter === 'today' ? 'active' : ''}" data-filter="today" style="padding: 4px 10px; border-radius: 999px; font-size: 10.5px; font-weight: 800; border: none; cursor: pointer; background: ${activeDateFilter === 'today' ? 'var(--gold)' : 'transparent'}; color: ${activeDateFilter === 'today' ? '#000' : 'var(--text-secondary)'};">
              ${isEn ? 'Today' : 'วันนี้'}
            </button>
          </div>
        </div>

        <!-- Search Input -->
        <div style="position: relative; margin-bottom: 12px;">
          <input id="dash-tx-search" type="text" placeholder="${isEn ? 'Search transactions...' : 'ค้นหารายการ...'}" value="${searchQuery}" style="width: 100%; padding: 8px 12px 8px 34px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 12px;" />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>

        <!-- Transactions List -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${feedTxs.length === 0 ? `
            <div style="text-align: center; padding: 28px 0; color: var(--text-secondary); font-size: 12px; font-weight: 600;">
              ${isEn ? 'No transactions found' : 'ไม่พบรายการใช้จ่าย'}
            </div>
          ` : feedTxs.slice(0, 15).map(tx => {
            const cat = getCategoryInfo(tx.category);
            const primaryW = store.getPrimaryWallet();
            const w = wallets.find(wal => wal.id === tx.walletId) || primaryW || { name: 'Main' };
            const txDate = new Date(tx.date);
            const timeStr = txDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `
              <div class="dash-tx-row" data-id="${tx.id}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); cursor: pointer; transition: background 0.15s ease;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 36px; height: 36px; border-radius: 10px; background: ${tx.isIncome ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'}; color: ${tx.isIncome ? 'var(--income)' : 'var(--expense)'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; padding: 7px; box-sizing: border-box;">
                    ${cat?.svg || '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/></svg>'}
                  </div>
                  <div>
                    <div style="font-size: 13px; font-weight: 800; color: var(--text-primary); margin-bottom: 2px;">
                      ${tx.title || cat?.label || tx.category}
                    </div>
                    <div style="font-size: 10.5px; color: var(--text-secondary); display: flex; align-items: center; gap: 6px;">
                      <span>${timeStr}</span>
                      <span>•</span>
                      <span style="background: rgba(255,255,255,0.06); padding: 1px 6px; border-radius: 4px;">${w.name}</span>
                    </div>
                  </div>
                </div>

                <div style="text-align: right;">
                  <div style="font-size: 14px; font-weight: 900; color: ${tx.isIncome ? 'var(--income)' : 'var(--text-primary)'}; font-family: var(--font-heading);">
                    ${tx.isIncome ? '+' : '-'}${sym}${parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
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
  // Avatar Mastery Hub
  container.querySelector("#dash-user-avatar-btn")?.addEventListener("click", () => {
    showUserMasteryModal(container);
  });

  // Settings Navigation
  container.querySelector("#dash-settings-btn")?.addEventListener("click", () => {
    router.navigate("settings");
  });

  // Manage Wallets Button
  container.querySelector("#hero-manage-wallets-btn")?.addEventListener("click", () => {
    router.navigate("wallets");
  });

  // Add Wallet Slide Button
  container.querySelector("#dash-add-wallet-slide")?.addEventListener("click", () => {
    showAddWalletModal(container);
  });

  // Clicking Wallet Cards
  container.querySelectorAll(".hero-slide-card[data-wallet-id]").forEach(card => {
    card.addEventListener("click", () => {
      router.navigate("wallets");
    });
  });

  // Carousel Pagination Dots Sync
  const carousel = container.querySelector("#dash-hero-carousel");
  const dots = container.querySelectorAll(".dash-hero-dot");
  if (carousel && dots.length > 0) {
    carousel.addEventListener("scroll", () => {
      const slideWidth = carousel.clientWidth + 14; // card width + gap
      const activeIdx = Math.min(dots.length - 1, Math.max(0, Math.round(carousel.scrollLeft / slideWidth)));
      dots.forEach((dot, idx) => {
        if (idx === activeIdx) {
          dot.style.width = "16px";
          dot.style.background = "var(--gold)";
        } else {
          dot.style.width = "6px";
          dot.style.background = "var(--border)";
        }
      });
    }, { passive: true });

    dots.forEach(dot => {
      dot.addEventListener("click", () => {
        const idx = parseInt(dot.getAttribute("data-dot-index"), 10);
        const slideWidth = carousel.clientWidth + 14;
        carousel.scrollTo({
          left: idx * slideWidth,
          behavior: "smooth"
        });
      });
    });
  }

  // Top Bar Actions
  container.querySelector("#dash-missions-btn")?.addEventListener("click", () => {
    showDailyMissionsModal(container);
  });
  container.querySelector("#dash-user-avatar-btn")?.addEventListener("click", () => {
    showDailyMissionsModal(container);
  });
  container.querySelector("#dash-settings-btn")?.addEventListener("click", () => {
    router.navigate("settings");
  });

  // Quick Action Buttons
  container.querySelector("#dash-view-all-tx-btn")?.addEventListener("click", () => {
    router.navigate("transactions");
  });
  container.querySelector("#quick-savings")?.addEventListener("click", () => {
    router.navigate("savings");
  });
  container.querySelector("#quick-split-bill")?.addEventListener("click", () => {
    router.navigate("splitBill");
  });
  container.querySelector("#quick-recurring")?.addEventListener("click", () => {
    router.navigate("recurring");
  });
  container.querySelector("#quick-downpayments")?.addEventListener("click", () => {
    router.navigate("downPayments");
  });

  // Filter Buttons
  container.querySelectorAll(".tx-filter-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      activeDateFilter = btn.getAttribute("data-filter");
      renderDashboard(container);
    });
  });

  // Search Input
  const searchInput = container.querySelector("#dash-tx-search");
  searchInput?.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderDashboard(container);
  });

  // Transaction row click to edit
  container.querySelectorAll(".dash-tx-row").forEach(row => {
    row.addEventListener("click", () => {
      const id = row.getAttribute("data-id");
      router.navigate("add", { editId: id });
    });
  });
}

function showAddWalletModal(container) {
  const isEn = store.settings.language === "en";
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 24px; max-width: 360px; width: 90%; box-shadow: var(--card-shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
        <h3 style="font-size: 17px; font-weight: 800; color: var(--text-primary); margin: 0;">${isEn ? 'Add New Wallet' : 'เพิ่มกระเป๋าใหม่'}</h3>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-muted); font-size: 24px; cursor: pointer;">&times;</button>
      </div>
      <form id="add-wallet-form" style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">${isEn ? 'Wallet Name' : 'ชื่อกระเป๋า'}</label>
          <input name="name" required placeholder="${isEn ? 'e.g. Bank Account / Cash' : 'เช่น ธนาคาร / เงินสด'}" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 13px;" />
        </div>
        <div>
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">${isEn ? 'Wallet Type' : 'ประเภทกระเป๋า'}</label>
          <select name="type" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 13px;">
            <option value="bank">${isEn ? 'Bank Account' : 'บัญชีธนาคาร (Bank)'}</option>
            <option value="cash">${isEn ? 'Cash' : 'เงินสด (Cash)'}</option>
            <option value="savings">${isEn ? 'Savings Vault' : 'เงินออม (Savings)'}</option>
            <option value="credit">${isEn ? 'Credit Card' : 'บัตรเครดิต (Credit)'}</option>
            <option value="investment">${isEn ? 'Investment' : 'พอร์ตลงทุน (Invest)'}</option>
          </select>
        </div>
        <div>
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">${isEn ? 'Starting Balance' : 'ยอดเงินตั้งต้น'}</label>
          <input name="balance" type="number" step="0.01" value="0" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 13px;" />
        </div>
        <button type="submit" class="btn-primary" style="margin-top: 6px; padding: 12px; background: var(--gold); color: #000; font-weight: 800; border: none; border-radius: var(--radius); cursor: pointer; box-shadow: var(--btn-shadow);">
          ${isEn ? 'Save Wallet' : 'บันทึกกระเป๋า'}
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close-btn").onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  modal.querySelector("#add-wallet-form").onsubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get("name").trim();
    const type = formData.get("type");
    const balance = parseFloat(formData.get("balance")) || 0;

    store.addWallet({
      name,
      type,
      balance,
    });

    alerts.success(isEn ? 'Wallet added successfully!' : 'เพิ่มกระเป๋าเรียบร้อยแล้ว');
    close();
    renderDashboard(container);
  };
}

function showUserMasteryModal(container) {
  const isEn = store.settings.language === "en";
  const user = store.user;
  const level = store.settings.level || 1;
  const xp = store.settings.xp || 0;
  const coins = store.settings.coins || 0;
  const nextLevelXP = level * 200;
  const xpPct = Math.min(100, Math.round((xp % 200) / 2));

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 24px; max-width: 380px; width: 92%; box-shadow: var(--card-shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 46px; height: 46px; border-radius: 50%; background: var(--gold-soft); border: 2px solid var(--gold); display: flex; align-items: center; justify-content: center; font-weight: 900; color: var(--gold); font-size: 18px;">
            ${user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div style="font-size: 16px; font-weight: 800; color: var(--text-primary);">
              ${user ? (user.user_metadata?.full_name || user.email.split('@')[0]) : 'User'}
            </div>
            <div style="font-size: 11px; color: var(--text-secondary);">
              Level ${level} • ${coins} FinCoins
            </div>
          </div>
        </div>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-muted); font-size: 24px; cursor: pointer;">&times;</button>
      </div>

      <!-- XP Progress -->
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 14px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 6px;">
          <span style="color: var(--text-secondary);">Level ${level}</span>
          <span style="color: var(--gold);">${xp} / ${nextLevelXP} XP</span>
        </div>
        <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.08); border-radius: 999px; overflow: hidden;">
          <div style="width: ${xpPct}%; height: 100%; background: var(--gold); border-radius: 999px; transition: width 0.3s ease;"></div>
        </div>
      </div>

      <!-- Quick Hub Links -->
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div id="modal-achievements-btn" style="padding: 12px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; color: var(--text-primary);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
            <span>${isEn ? 'Achievements & Badges' : 'ความสำเร็จ & เหรียญรางวัล'}</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--text-muted);"><path d="m9 18 6-6-6-6"/></svg>
        </div>

        <div id="modal-rewards-btn" style="padding: 12px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; color: var(--text-primary);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2.5"><polyline points="20 12 20 22 4 22 4 12"/><rect width="20" height="5" x="2" y="7"/><line x1="12" y1="22" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
            <span>${isEn ? 'Rewards Shop & Gacha' : 'ร้านค้าของรางวัล & กาชา'}</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--text-muted);"><path d="m9 18 6-6-6-6"/></svg>
        </div>

        <div id="modal-collectibles-btn" style="padding: 12px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; color: var(--text-primary);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
            <span>${isEn ? 'Collectibles & Boosts' : 'ของสะสม & บัฟพลัง'}</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--text-muted);"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close-btn").onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  modal.querySelector("#modal-achievements-btn")?.addEventListener("click", () => {
    close();
    router.navigate("achievements");
  });
  modal.querySelector("#modal-rewards-btn")?.addEventListener("click", () => {
    close();
    router.navigate("rewards");
  });
  modal.querySelector("#modal-collectibles-btn")?.addEventListener("click", () => {
    close();
    router.navigate("collectibles");
  });
}

function showDailyMissionsModal(container) {
  const isEn = store.settings.language === "en";
  const dailyQuests = store.getDailyQuests();
  const streak = store.calculateStreak();

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog" style="max-width: 440px; padding: 22px; border-radius: var(--radius-2xl);">
      <div class="modal-header" style="margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 38px; height: 38px; border-radius: 12px; background: var(--gold-soft); color: var(--gold); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <div>
            <h3 class="modal-title" style="font-size: 16px; font-weight: 800; margin: 0; color: var(--text-primary);">
              ${isEn ? 'Daily Missions' : 'ภารกิจประจำวัน'}
            </h3>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
              ${isEn ? 'Complete missions to earn FinCoins & XP' : 'ทำภารกิจเพื่อรับเหรียญ FinCoins และ XP'}
            </div>
          </div>
        </div>
        <button class="modal-close-btn" style="width: 32px; height: 32px; border-radius: 50%; background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>

      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z"/></svg>
          <span style="font-size: 12px; font-weight: 800; color: var(--text-primary);">${isEn ? 'Daily Streak' : 'สถิติต่อเนื่อง'}:</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <span style="font-size: 12px; font-weight: 900; color: var(--gold);">${streak} ${isEn ? 'Days' : 'วัน'}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z"/></svg>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${dailyQuests.map((q) => `
          <div style="background: var(--card); border: 1px solid ${q.completed && !q.claimed ? 'var(--gold)' : 'var(--border)'}; border-radius: var(--radius-xl); padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; box-shadow: ${q.completed && !q.claimed ? '0 2px 10px rgba(245,200,66,0.15)' : 'none'};">
            <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
              <div style="width: 36px; height: 36px; border-radius: 10px; background: ${q.completed ? 'rgba(52, 211, 153, 0.12)' : 'var(--surface)'}; color: ${q.completed ? 'var(--income)' : 'var(--text-secondary)'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${q.icon}
              </div>
              <div style="min-width: 0;">
                <div style="font-size: 13px; font-weight: 800; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                  ${q.title}
                </div>
                <div style="font-size: 11px; color: var(--text-secondary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap; margin-top: 2px;">
                  ${q.desc} • <span style="color: var(--gold); font-weight: 800;">+${q.rewardCoins} Coins</span>
                </div>
              </div>
            </div>

            <div>
              ${q.claimed ? `
                <span style="font-size: 11.5px; font-weight: 800; color: var(--income); display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; background: rgba(52, 211, 153, 0.1); border-radius: 999px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  ${isEn ? 'Done' : 'สำเร็จ'}
                </span>
              ` : (q.completed ? `
                <button class="modal-claim-quest-btn" data-quest-id="${q.id}" style="background: var(--gold); color: #000; border: none; padding: 7px 14px; border-radius: 999px; font-size: 11.5px; font-weight: 900; cursor: pointer; box-shadow: 0 2px 10px rgba(245,200,66,0.35); animation: pulse 1.5s infinite; white-space: nowrap;">
                  ${isEn ? `Claim +${q.rewardCoins}` : `รับ +${q.rewardCoins}`}
                </button>
              ` : `
                <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); background: var(--surface); border: 1px solid var(--border); padding: 5px 10px; border-radius: 999px; white-space: nowrap;">
                  ${isEn ? 'In Progress' : 'กำลังทำ'}
                </span>
              `)}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  const close = () => {
    if (document.body.contains(modal)) document.body.removeChild(modal);
  };
  modal.querySelector(".modal-close-btn").onclick = close;
  modal.onclick = (e) => {
    if (e.target === modal) close();
  };

  modal.querySelectorAll(".modal-claim-quest-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const qId = btn.getAttribute("data-quest-id");
      const quest = store.claimDailyQuest(qId);
      if (quest) {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        alerts.success(
          isEn ? "Mission Accomplished!" : "ทำภารกิจสำเร็จ!",
          isEn
            ? `Claimed +${quest.rewardCoins} FinCoins & +${quest.rewardXP} XP!`
            : `ได้รับ +${quest.rewardCoins} FinCoins และ +${quest.rewardXP} XP!`
        );
        close();
        renderDashboard(container);
      }
    });
  });
}

