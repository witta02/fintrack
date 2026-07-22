import { store } from "../store.js";
import { t, getLanguage } from "../i18n.js";
import { router } from "../router.js";

export function renderAchievements(container) {
  const lang = getLanguage();
  const level = store.settings.level || 1;
  const transactions = store.getAllTransactions();
  
  // Calculate total income
  const totalIncome = transactions
    .filter(tx => tx.isIncome)
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
  // Calculate streaks (unique days)
  const uniqueDays = new Set(transactions.map(tx => new Date(tx.date).toDateString())).size;
  
  // Calculate transaction count
  const txCount = transactions.length;

  const achievements = [
    {
      id: "first_step",
      icon: "🌟",
      title: t("achieveFirstStepTitle"),
      desc: t("achieveFirstStepDesc"),
      unlocked: txCount >= 1,
      progress: Math.min(1, txCount),
      target: 1
    },
    {
      id: "streak_7",
      icon: "🔥",
      title: t("achieveStreak7Title"),
      desc: t("achieveStreak7Desc"),
      unlocked: uniqueDays >= 7,
      progress: Math.min(7, uniqueDays),
      target: 7
    },
    {
      id: "level_10",
      icon: "🎖️",
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
    // Thai naming convention
    if (val >= 1000000) return `${val / 1000000} ล้าน`;
    if (val >= 100000) {
      const w = val / 100000;
      return Number.isInteger(w) ? `${w} แสน` : `${val / 10000} หมื่น`;
    }
    if (val >= 10000) return `${val / 10000} หมื่น`;
    if (val >= 1000) return `${val / 1000} พัน`;
    return `${val}`;
  };

  const getMilestoneIcon = (val) => {
    if (val >= 1000000) return "🏦";
    if (val >= 500000) return "🏢";
    if (val >= 100000) return "💼";
    if (val >= 50000) return "💎";
    if (val >= 15000) return "👑";
    if (val >= 10000) return "🤑";
    if (val >= 5000) return "💰";
    if (val >= 1000) return "💸";
    return "💵";
  };

  const incomeAchievements = milestones.map(m => ({
    id: `income_${m}`,
    icon: getMilestoneIcon(m),
    title: getMilestoneName(m),
    desc: t('achieveIncomeMilestoneDesc', { amount: m.toLocaleString() }),
    unlocked: totalIncome >= m,
    progress: Math.min(m, totalIncome),
    target: m,
    formatProgress: true
  }));

  achievements.push({
    id: "tx_100",
    icon: "📊",
    title: t("achieveTx100Title"),
    desc: t("achieveTx100Desc"),
    unlocked: txCount >= 100,
    progress: Math.min(100, txCount),
    target: 100
  });

  achievements.splice(3, 0, ...incomeAchievements); // Insert right after level_10

  let html = `
    <div class="screen-header" style="padding-bottom: 20px; border-bottom: 1px solid var(--border); margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 14px;">
        <button class="back-btn" style="background: transparent; border: none; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background: var(--surface);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 class="brand-title" style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 0;">${t('trophyRoom')}</h1>
      </div>
      <div style="margin-left: auto; display: flex; align-items: center; gap: 8px; background: rgba(245,200,66,0.15); padding: 6px 12px; border-radius: 20px;">
        <span style="font-size: 16px;">🪙</span>
        <span style="font-weight: 800; color: var(--gold); font-size: 14px;">${store.settings.coins || 0}</span>
      </div>
    </div>
    <div class="achievements-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; padding-bottom: 40px;">
  `;

  achievements.forEach(a => {
    const isUnlocked = a.unlocked;
    const progressPercent = (a.progress / a.target) * 100;
    const isClaimed = (store.settings.claimedAchievements || []).includes(a.id);
    const rewardAmt = a.id.startsWith('income_') ? (a.target >= 50000 ? (a.target >= 1000000 ? 1000 : 500) : 50) : 100;
    
    const claimBtnHTML = (isUnlocked && !isClaimed) ? `
      <button class="claim-btn" data-id="${a.id}" data-reward="${rewardAmt}" style="margin-top: 8px; width: 100%; padding: 6px; background: var(--gold); color: #000; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 4px;">
        ${t('claimReward')} +${rewardAmt} 🪙
      </button>
    ` : (isClaimed ? `
      <div style="margin-top: 8px; width: 100%; text-align: center; font-size: 11px; color: var(--gold); font-weight: 700;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="vertical-align: middle;"><polyline points="20 6 9 17 4 12"/></svg> ${t('rewardClaimed')}
      </div>
    ` : '');

    html += `
      <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}" style="background: ${isUnlocked ? 'var(--card)' : 'var(--surface)'}; border: 1px solid ${isUnlocked ? (isClaimed ? 'var(--border)' : 'var(--gold)') : 'var(--border)'}; border-radius: 16px; padding: 16px; text-align: center; opacity: ${isUnlocked ? '1' : '0.6'}; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; gap: 10px; box-shadow: ${isUnlocked && !isClaimed ? 'var(--shadow-gold)' : 'none'};">
        <div style="font-size: 42px; line-height: 1; filter: ${isUnlocked ? 'none' : 'grayscale(100%)'};">
          ${a.icon}
        </div>
        <div style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${a.title}</div>
        <div style="font-size: 11px; color: var(--text-secondary); line-height: 1.3; min-height: 28px;">${a.desc}</div>
        
        <div style="width: 100%; margin-top: auto;">
          <div style="font-size: 10px; font-weight: 700; color: ${isUnlocked ? 'var(--gold)' : 'var(--text-muted)'}; margin-bottom: 4px; text-align: right;">
            ${a.formatProgress ? a.progress.toLocaleString() : Math.floor(a.progress)} / ${a.formatProgress ? a.target.toLocaleString() : a.target}
          </div>
          <div style="height: 6px; background: rgba(0,0,0,0.1); border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; width: ${progressPercent}%; background: ${isUnlocked ? 'linear-gradient(90deg, var(--gold), var(--amber))' : 'var(--border-strong)'}; border-radius: 3px;"></div>
          </div>
          ${claimBtnHTML}
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
      
      // Re-render
      renderAchievements(container);
    });
  });
}
