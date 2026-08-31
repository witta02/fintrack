import { store } from "../store.js";
import { t, getLanguage } from "../i18n.js";
import { router } from "../router.js";

export function renderAchievements(container) {
  const lang = getLanguage();
  const level = store.settings.level || 1;
  const transactions = store.getAllTransactions();
  
  const totalIncome = transactions
    .filter(tx => tx.isIncome)
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
  const uniqueDays = new Set(transactions.map(tx => new Date(tx.date).toDateString())).size;
  const txCount = transactions.length;

  const achievements = [
    {
      id: "first_step",
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>`,
      title: t("achieveFirstStepTitle"),
      desc: t("achieveFirstStepDesc"),
      unlocked: txCount >= 1,
      progress: Math.min(1, txCount),
      target: 1
    },
    {
      id: "streak_7",
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z"/></svg>`,
      title: t("achieveStreak7Title"),
      desc: t("achieveStreak7Desc"),
      unlocked: uniqueDays >= 7,
      progress: Math.min(7, uniqueDays),
      target: 7
    },
    {
      id: "level_10",
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
      title: t("achieveLevel10Title"),
      desc: t("achieveLevel10Desc"),
      unlocked: level >= 10,
      progress: Math.min(10, level),
      target: 10
    }
  ];

  const milestones = [100, 1000, 5000, 10000, 15000];
  for (let i = 20000; i <= 100000; i += 5000) milestones.push(i);
  for (let i = 150000; i <= 1000000; i += 50000) milestones.push(i);
  for (let i = 2000000; i <= 10000000; i += 1000000) milestones.push(i);

  const getMilestoneName = (val) => {
    if (lang === 'en') return t('achieveMilestoneReach', { amount: val.toLocaleString() });
    if (val >= 1000000) return `${val / 1000000} ล้าน`;
    if (val >= 100000) {
      const w = val / 100000;
      return Number.isInteger(w) ? `${w} แสน` : `${val / 10000} หมื่น`;
    }
    if (val >= 10000) return `${val / 10000} หมื่น`;
    if (val >= 1000) return `${val / 1000} พัน`;
    return `${val}`;
  };

  const getMilestoneIcon = () => {
    return `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/></svg>`;
  };

  const incomeAchievements = milestones.map(m => ({
    id: `income_${m}`,
    icon: getMilestoneIcon(),
    title: getMilestoneName(m),
    desc: t('achieveIncomeMilestoneDesc', { amount: m.toLocaleString() }),
    unlocked: totalIncome >= m,
    progress: Math.min(m, totalIncome),
    target: m,
    formatProgress: true
  }));

  achievements.push({
    id: "tx_100",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`,
    title: t("achieveTx100Title"),
    desc: t("achieveTx100Desc"),
    unlocked: txCount >= 100,
    progress: Math.min(100, txCount),
    target: 100
  });

  const totalSaved = store.getTotalSavingsAmount();
  const savingsAchievements = [
    {
      id: "savings_1k",
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--income)" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
      title: lang === 'en' ? "Piggy Pioneer (฿1,000)" : "นักออมมือใหม่ (1,000 บาท)",
      desc: lang === 'en' ? "Accumulate at least ฿1,000 in your savings vaults." : "สะสมเงินในกระปุกออมเงินรวมครบ 1,000 บาท",
      unlocked: totalSaved >= 1000,
      progress: Math.min(1000, totalSaved),
      target: 1000,
      formatProgress: true
    },
    {
      id: "savings_10k",
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,
      title: lang === 'en' ? "Vault Commander (฿10,000)" : "ผู้พิทักษ์ขุมทรัพย์ (10,000 บาท)",
      desc: lang === 'en' ? "Accumulate at least ฿10,000 in your savings vaults." : "สะสมเงินในกระปุกออมเงินรวมครบ 10,000 บาท",
      unlocked: totalSaved >= 10000,
      progress: Math.min(10000, totalSaved),
      target: 10000,
      formatProgress: true
    },
    {
      id: "savings_50k",
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
      title: lang === 'en' ? "Wealth Architect (฿50,000)" : "สถาปนิกความมั่งคั่ง (50,000 บาท)",
      desc: lang === 'en' ? "Accumulate at least ฿50,000 in your savings vaults." : "สะสมเงินในกระปุกออมเงินรวมครบ 50,000 บาท",
      unlocked: totalSaved >= 50000,
      progress: Math.min(50000, totalSaved),
      target: 50000,
      formatProgress: true
    },
    {
      id: "savings_100k",
      icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
      title: lang === 'en' ? "Century Titan (฿100,000)" : "ตำนานหลักแสน (100,000 บาท)",
      desc: lang === 'en' ? "Accumulate at least ฿100,000 in your savings vaults." : "สะสมเงินในกระปุกออมเงินรวมครบ 100,000 บาท",
      unlocked: totalSaved >= 100000,
      progress: Math.min(100000, totalSaved),
      target: 100000,
      formatProgress: true
    }
  ];

  achievements.push(...savingsAchievements);
  achievements.splice(3, 0, ...incomeAchievements);

  let html = `
    <div class="screen screen-enter" style="padding: 0 16px 100px;">
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0 16px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <button class="back-btn icon-btn" style="background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: var(--radius);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: var(--text-primary); margin: 0;">${lang === 'en' ? 'Achievements' : 'เหรียญตราความสำเร็จ'}</h1>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; background: var(--gold-soft); padding: 4px 10px; border-radius: 999px; border: 1px solid var(--gold);">
          <span style="font-weight: 800; color: var(--gold); font-size: 12.5px;">${store.settings.coins || 0} Coins</span>
        </div>
      </div>
      <div class="achievements-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(145px, 1fr)); gap: 12px; padding-bottom: 20px;">
  `;

  achievements.forEach(a => {
    const isUnlocked = a.unlocked;
    const progressPercent = (a.progress / a.target) * 100;
    const isClaimed = (store.settings.claimedAchievements || []).includes(a.id);
    const rewardAmt = a.id.startsWith('income_') ? (a.target >= 50000 ? (a.target >= 1000000 ? 1000 : 500) : 50) : 100;
    
    const claimBtnHTML = (isUnlocked && !isClaimed) ? `
      <button class="claim-btn btn-primary" data-id="${a.id}" data-reward="${rewardAmt}" style="margin-top: 8px; width: 100%; padding: 6px; font-size: 11px; font-weight: 800; border-radius: var(--radius-xs); background: var(--gold); color: var(--btn-text-primary); border: none; cursor: pointer;">
        ${lang === 'en' ? 'Claim' : 'รับรางวัล'} +${rewardAmt} Coins
      </button>
    ` : (isClaimed ? `
      <div style="margin-top: 8px; width: 100%; text-align: center; font-size: 10.5px; color: var(--gold); font-weight: 800;">
        ${lang === 'en' ? 'Claimed' : 'รับแล้ว'}
      </div>
    ` : '');

    html += `
      <div class="bezel-card achievement-card ${isUnlocked ? 'unlocked' : 'locked'}" style="opacity: ${isUnlocked ? '1' : '0.6'};">
        <div class="bezel-inner" style="padding: 14px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px; height: 100%; box-sizing: border-box;">
          <div style="width: 48px; height: 48px; border-radius: 12px; background: var(--surface); display: flex; align-items: center; justify-content: center; border: 1px solid var(--border);">
            ${a.icon}
          </div>
          <div style="font-size: 13.5px; font-weight: 800; color: var(--text-primary);">${a.title}</div>
          <div style="font-size: 10.5px; color: var(--text-secondary); line-height: 1.3; min-height: 26px;">${a.desc}</div>
          
          <div style="width: 100%; margin-top: auto;">
            <div style="font-size: 9.5px; font-weight: 800; color: ${isUnlocked ? 'var(--gold)' : 'var(--text-muted)'}; margin-bottom: 4px; text-align: right;">
              ${a.formatProgress ? a.progress.toLocaleString() : Math.floor(a.progress)} / ${a.formatProgress ? a.target.toLocaleString() : a.target}
            </div>
            <div style="height: 5px; background: var(--input-bg); border: 1px solid var(--border); border-radius: 3px; overflow: hidden;">
              <div style="height: 100%; width: ${progressPercent}%; background: ${isUnlocked ? 'var(--gold)' : 'var(--border-strong)'}; border-radius: 3px;"></div>
            </div>
            ${claimBtnHTML}
          </div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;

  container.querySelector(".back-btn").addEventListener("click", () => {
    router.navigate("dashboard");
  });
  
  container.querySelectorAll(".claim-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const target = e.currentTarget;
      const id = target.getAttribute("data-id");
      const reward = parseInt(target.getAttribute("data-reward"));
      
      store.settings.coins = (store.settings.coins || 0) + reward;
      store.settings.claimedAchievements = store.settings.claimedAchievements || [];
      if (!store.settings.claimedAchievements.includes(id)) {
        store.settings.claimedAchievements.push(id);
      }
      store.save();
      
      renderAchievements(container);
    });
  });
}
