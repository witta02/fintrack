import { store } from "../store.js";
import { t, getLanguage } from "../i18n.js";
import { router } from "../router.js";
import { alerts } from "../utils/alertHelper.js";
import confetti from "canvas-confetti";

export function renderSavings(container, params = null) {
  const isEn = store.settings.language === "en";
  const sym = store.getCurrencySymbol();
  const goals = store.getSavingsGoals();
  const coins = store.settings.coins || 0;
  const activeGoalId = params?.goalId || (goals.length > 0 ? goals[0].id : null);
  const activeGoal = goals.find((g) => g.id === activeGoalId) || goals[0] || {
    id: "default",
    title: isEn ? "General Savings" : "เงินออมทั่วไป",
    currentAmount: 0,
    targetAmount: 50000,
    color: "var(--gold)",
    emoji: "",
  };

  const target = Math.max(1, parseFloat(activeGoal.targetAmount) || 1);
  const current = parseFloat(activeGoal.currentAmount) || 0;
  const pct = Math.min(100, Math.round((current / target) * 100));

  // Circumference for radial circle gauge (radius = 70)
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  const milestones = store.getSavingsMilestones(activeGoal.id);

  const html = `
    <div class="screen screen-enter savings-screen-wrap" style="padding: 0 16px 100px;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0 16px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <button class="back-btn icon-btn" id="savings-back-btn" style="background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: var(--radius);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0; letter-spacing: -0.3px;">
            ${isEn ? "Savings Vaults" : "กระปุกออมเงิน"}
          </h1>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <!-- FinCoins Counter Button linking to Rewards Shop -->
          <button id="savings-open-shop-btn" style="background: var(--gold-soft); border: 1px solid var(--gold); border-radius: 999px; padding: 6px 12px; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s ease;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M15 9.5a3.5 3.5 0 0 0-7 0c0 2 2 3 4 3.5s4 1.5 4 3.5a3.5 3.5 0 0 1-7 0"/></svg>
            <span style="font-size: 12px; font-weight: 800; color: var(--gold);">${coins} Coins</span>
          </button>

          <!-- Add Goal Header Button -->
          <button class="icon-btn" id="savings-add-goal-header-btn" title="${isEn ? "Create Goal" : "สร้างเป้าหมาย"}" style="background: var(--surface); border: 1px solid var(--border); color: var(--gold); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: var(--radius);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>

      <!-- Multiple Goals Horizontal Selector (if > 1 goal) -->
      ${
        goals.length > 1
          ? `
        <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px; scrollbar-width: none;">
          ${goals
            .map((g) => {
              const isSelected = g.id === activeGoal.id;
              return `
              <button class="goal-pill-tab ${isSelected ? "active" : ""}" data-select-goal="${g.id}" style="padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 800; border: 1px solid ${isSelected ? "var(--gold)" : "var(--border)"}; background: ${isSelected ? "var(--gold-soft)" : "var(--surface)"}; color: ${isSelected ? "var(--gold)" : "var(--text-secondary)"}; cursor: pointer; white-space: nowrap;">
                ${g.title}
              </button>
            `;
            })
            .join("")}
        </div>
      `
          : ""
      }

      <!-- Radial Progress Hero Card -->
      <div class="savings-hero-card" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 24px 20px 20px; text-align: center; box-shadow: var(--card-shadow); margin-bottom: 16px; position: relative;">
        <!-- Circular Radial SVG Gauge -->
        <div style="position: relative; width: 160px; height: 160px; margin: 0 auto 14px;">
          <svg width="160" height="160" viewBox="0 0 160 160" style="transform: rotate(-90deg);">
            <!-- Background Track -->
            <circle cx="80" cy="80" r="${radius}" fill="none" stroke="var(--bg-secondary)" stroke-width="12" />
            <!-- Active Radial Progress -->
            <circle cx="80" cy="80" r="${radius}" fill="none" stroke="var(--income)" stroke-width="12" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);" />
          </svg>
          <!-- Center Goal Icon & % -->
          <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(0deg);">
            <div style="width: 48px; height: 48px; border-radius: 14px; background: var(--income-soft); display: flex; align-items: center; justify-content: center; color: var(--income); margin-bottom: 2px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            </div>
            <span style="font-size: 13px; font-weight: 900; color: var(--income);">${pct}%</span>
          </div>
        </div>

        <!-- Goal Title & Main Amount -->
        <div style="font-size: 12.5px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
          ${activeGoal.title}
        </div>
        <div style="font-size: 30px; font-weight: 900; color: var(--text-primary); font-family: var(--font-heading); letter-spacing: -0.5px; margin-bottom: 4px;">
          ${sym} ${current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style="font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 14px;">
          ${isEn ? "of" : "จากเป้าหมาย"} ${sym} ${target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>

        <!-- Dynamic Gamified Reward Rate Badge -->
        <div style="margin: 0 auto 18px; padding: 6px 12px; background: rgba(245, 200, 66, 0.08); border: 1px solid rgba(245, 200, 66, 0.2); border-radius: 999px; display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--gold);">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span>${isEn ? "Earn 1 FinCoin & 2 XP per ฿100 saved" : "รับ 1 FinCoin & 2 XP ต่อทุก 100 บาทที่ออม"}</span>
        </div>

        <!-- Action Pill Buttons: Top up & Withdraw -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 320px; margin: 0 auto;">
          <button id="savings-topup-btn" style="padding: 12px 16px; border-radius: 999px; background: var(--income); border: none; color: #fff; font-weight: 800; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: var(--transition); box-shadow: 0 4px 14px rgba(52, 211, 153, 0.25);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
            ${isEn ? "Top Up & Earn" : "ฝากเงิน & รับเหรียญ"}
          </button>
          <button id="savings-withdraw-btn" style="padding: 12px 16px; border-radius: 999px; background: var(--surface); border: 1.5px solid var(--border); color: var(--text-primary); font-weight: 800; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: var(--transition);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
            ${isEn ? "Withdraw" : "ถอนเงิน"}
          </button>
        </div>
      </div>

      <!-- Milestone Treasure Track -->
      <div style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 18px 16px; box-shadow: var(--card-shadow); margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 2px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: var(--gold-soft); color: var(--gold); display: flex; align-items: center; justify-content: center;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            </div>
            <span style="font-size: 13px; font-weight: 800; color: var(--text-primary);">${isEn ? "Milestone Treasure Track" : "ขุมทรัพย์พิชิตเป้าหมาย"}</span>
          </div>
          <span style="font-size: 11px; font-weight: 800; color: var(--gold);">${pct}% Reached</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
          ${milestones
            .map((m) => {
              const bg = m.isClaimed
                ? "var(--surface)"
                : m.canClaim
                ? "rgba(245, 200, 66, 0.15)"
                : "var(--surface)";
              const border = m.isClaimed
                ? "1px solid var(--border)"
                : m.canClaim
                ? "1.5px solid var(--gold)"
                : "1px dashed var(--border)";
              const color = m.isClaimed
                ? "var(--income)"
                : m.canClaim
                ? "var(--gold)"
                : "var(--text-muted)";

              return `
              <div style="background: ${bg}; border: ${border}; border-radius: var(--radius); padding: 10px 6px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: space-between; min-height: 95px; position: relative;">
                <div style="font-size: 11px; font-weight: 800; color: var(--text-secondary); margin-bottom: 4px;">${m.label}</div>
                
                <!-- Chest Icon -->
                <div style="color: ${color}; margin-bottom: 6px;">
                  ${
                    m.isClaimed
                      ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
                      : m.canClaim
                      ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M12 6V2"/></svg>`
                      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
                  }
                </div>

                <!-- Reward / Button -->
                ${
                  m.isClaimed
                    ? `<span style="font-size: 10px; font-weight: 800; color: var(--income);">${isEn ? "Claimed" : "รับแล้ว"}</span>`
                    : m.canClaim
                    ? `<button class="claim-milestone-btn" data-milestone="${m.pct}" style="background: var(--gold); color: #000; border: none; padding: 4px 8px; border-radius: 999px; font-size: 9.5px; font-weight: 900; cursor: pointer; box-shadow: 0 2px 6px rgba(245,200,66,0.4); animation: pulse 1.5s infinite;">+${m.coins} 🪙</button>`
                    : `<span style="font-size: 9.5px; font-weight: 700; color: var(--text-muted);">+${m.coins} Coins</span>`
                }
              </div>
            `;
            })
            .join("")}
        </div>
      </div>

      <!-- Rewards Shop & Collectibles Banner -->
      <div id="savings-rewards-banner" style="background: linear-gradient(135deg, rgba(245, 200, 66, 0.12) 0%, rgba(245, 154, 0, 0.06) 100%); border: 1px solid rgba(245, 200, 66, 0.25); border-radius: var(--radius-2xl); padding: 16px 18px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s ease;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 42px; height: 42px; border-radius: 12px; background: var(--gold); color: #000; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(245, 200, 66, 0.3);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 12 20 22 4 22 4 12"/><rect width="20" height="5" x="2" y="7"/><line x1="12" y1="22" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
          </div>
          <div>
            <div style="font-size: 13.5px; font-weight: 800; color: var(--text-primary);">${isEn ? "Rewards Shop & Gacha" : "ร้านค้าของรางวัล & ตู้สุ่ม"}</div>
            <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600;">${isEn ? "Redeem saved coins for exclusive themes & badges" : "นำเหรียญที่ได้จากการออมไปแลกธีมและของสะสม"}</div>
          </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--gold);"><path d="m9 18 6-6-6-6"/></svg>
      </div>

      <!-- Down Payments & Installments Section Card -->
      <div id="savings-open-installments-btn" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 16px 18px; box-shadow: var(--card-shadow); display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: background 0.15s ease;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(168, 85, 247, 0.15); color: #a855f7; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.9 2 11.2 2 11.5V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
          </div>
          <div>
            <div style="font-size: 13.5px; font-weight: 800; color: var(--text-primary);">${isEn ? "Down Payments & Installments" : "เงินดาวน์ & สัญญาผ่อนชำระ"}</div>
            <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600;">${isEn ? "Track car, condo, & installment milestones" : "ติดตามค่างวดรถ บ้าน และการผ่อนของ"}</div>
          </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--text-muted);"><path d="m9 18 6-6-6-6"/></svg>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Event Listeners
  container.querySelector("#savings-back-btn")?.addEventListener("click", () => {
    router.navigate("dashboard");
  });

  container.querySelector("#savings-open-shop-btn")?.addEventListener("click", () => {
    router.navigate("rewards");
  });

  container.querySelector("#savings-rewards-banner")?.addEventListener("click", () => {
    router.navigate("rewards");
  });

  container.querySelector("#savings-open-installments-btn")?.addEventListener("click", () => {
    router.navigate("downPayments");
  });

  container.querySelector("#savings-add-goal-header-btn")?.addEventListener("click", () => {
    showCreateGoalDialog(container);
  });

  container.querySelectorAll("[data-select-goal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const gId = btn.getAttribute("data-select-goal");
      renderSavings(container, { goalId: gId });
    });
  });

  container.querySelector("#savings-topup-btn")?.addEventListener("click", () => {
    showDepositModal(container, activeGoal);
  });

  container.querySelector("#savings-withdraw-btn")?.addEventListener("click", () => {
    showWithdrawModal(container, activeGoal);
  });

  // Claim Milestone Treasure Chests
  container.querySelectorAll(".claim-milestone-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const mPct = parseInt(btn.getAttribute("data-milestone"), 10);
      const res = store.claimSavingsMilestone(activeGoal.id, mPct);
      if (res.success) {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
        alerts.success(
          isEn ? "Milestone Treasure Unlocked!" : "เปิดหีบสมบัติเป้าหมายสำเร็จ!",
          isEn
            ? `Claimed +${res.reward.coins} FinCoins & +${res.reward.xp} XP!`
            : `ได้รับ +${res.reward.coins} FinCoins และ +${res.reward.xp} XP!`
        );
        renderSavings(container, { goalId: activeGoal.id });
      }
    });
  });
}

function showDepositModal(container, goal) {
  const isEn = store.settings.language === "en";
  const sym = store.getCurrencySymbol();
  const wallets = store.getWallets();

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 24px; max-width: 340px; width: 90%; box-shadow: var(--card-shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0;">
          ${isEn ? `Deposit to: ${goal.title}` : `ฝากเงินเข้า: ${goal.title}`}
        </h3>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-secondary); font-size: 22px; cursor: pointer;">&times;</button>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">
          ${isEn ? "Amount" : "จำนวนเงิน"}
        </label>
        <div style="position: relative;">
          <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-weight: 800; color: var(--text-secondary);">${sym}</span>
          <input id="deposit-input" type="number" step="50" min="1" placeholder="1000" style="width: 100%; padding: 10px 12px 10px 28px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 14px; font-weight: 800;" />
        </div>
        <!-- Real-time Reward Preview -->
        <div id="deposit-reward-preview" style="font-size: 11.5px; font-weight: 700; color: var(--gold); margin-top: 6px; min-height: 16px;"></div>
      </div>

      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">
          ${isEn ? "Deduct from Wallet" : "ตัดเงินจากกระเป๋า"}
        </label>
        <select id="deposit-wallet-select" style="width: 100%; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 13px; font-weight: 700;">
          ${wallets.map((w) => `<option value="${w.id}">${w.name} (${sym}${store.getWalletBalance(w.id).toLocaleString()})</option>`).join("")}
        </select>
      </div>

      <button id="confirm-deposit-btn" class="btn-primary" style="width: 100%; padding: 12px; border-radius: var(--radius); background: var(--income); color: #fff; font-weight: 800; font-size: 13px; border: none; cursor: pointer; box-shadow: 0 4px 14px rgba(52, 211, 153, 0.25);">
        ${isEn ? "Confirm Deposit & Earn Coins" : "ยืนยันการฝาก & รับเหรียญ"}
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector(".modal-close-btn").onclick = close;
  modal.onclick = (e) => {
    if (e.target === modal) close();
  };

  const depositInput = modal.querySelector("#deposit-input");
  const rewardPreview = modal.querySelector("#deposit-reward-preview");

  depositInput?.addEventListener("input", () => {
    const amt = parseFloat(depositInput.value) || 0;
    if (amt > 0) {
      const c = Math.max(1, Math.floor(amt / 100));
      const x = Math.max(5, Math.floor(amt / 50) * 2);
      rewardPreview.innerHTML = isEn
        ? `Yields +${c} FinCoins & +${x} XP instantly!`
        : `จะได้รับ +${c} FinCoins และ +${x} XP ทันที!`;
    } else {
      rewardPreview.innerHTML = "";
    }
  });

  modal.querySelector("#confirm-deposit-btn")?.addEventListener("click", () => {
    const amt = parseFloat(depositInput.value);
    const wId = modal.querySelector("#deposit-wallet-select").value;
    if (isNaN(amt) || amt <= 0) {
      alerts.error(isEn ? "Please enter a valid amount" : "กรุณาระบุจำนวนเงินที่ถูกต้อง");
      return;
    }

    const result = store.depositToGoal(goal.id, amt, wId);
    if (!result.success) {
      alerts.error(isEn ? "Deposit failed" : "เกิดข้อผิดพลาดในการฝากเงิน");
      return;
    }

    close();
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    alerts.success(
      isEn ? "Deposit Successful!" : "ฝากเงินสำเร็จ!",
      isEn
        ? `Saved ${sym}${amt.toLocaleString()} (+${result.earnedCoins} FinCoins & +${result.earnedXP} XP)!`
        : `ออมเงิน ${sym}${amt.toLocaleString()} (+${result.earnedCoins} FinCoins และ +${result.earnedXP} XP)!`
    );
    renderSavings(container, { goalId: goal.id });
  });
}

function showWithdrawModal(container, goal) {
  const isEn = store.settings.language === "en";
  const sym = store.getCurrencySymbol();
  const wallets = store.getWallets();

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 24px; max-width: 340px; width: 90%; box-shadow: var(--card-shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0;">
          ${isEn ? `Withdraw from: ${goal.title}` : `ถอนเงินจาก: ${goal.title}`}
        </h3>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-secondary); font-size: 22px; cursor: pointer;">&times;</button>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">
          ${isEn ? "Amount" : "จำนวนเงิน"}
        </label>
        <div style="position: relative;">
          <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-weight: 800; color: var(--text-secondary);">${sym}</span>
          <input id="withdraw-input" type="number" step="50" min="1" placeholder="1000" style="width: 100%; padding: 10px 12px 10px 28px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 14px; font-weight: 800;" />
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">
          ${isEn ? "Deposit to Wallet" : "โอนเข้ากระเป๋า"}
        </label>
        <select id="withdraw-wallet-select" style="width: 100%; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 13px; font-weight: 700;">
          ${wallets.map((w) => `<option value="${w.id}">${w.name}</option>`).join("")}
        </select>
      </div>

      <button id="confirm-withdraw-btn" class="btn-primary" style="width: 100%; padding: 12px; border-radius: var(--radius); background: var(--text-primary); color: var(--bg); font-weight: 800; font-size: 13px; border: none; cursor: pointer;">
        ${isEn ? "Confirm Withdrawal" : "ยืนยันการถอนเงิน"}
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector(".modal-close-btn").onclick = close;
  modal.onclick = (e) => {
    if (e.target === modal) close();
  };

  modal.querySelector("#confirm-withdraw-btn")?.addEventListener("click", () => {
    const amt = parseFloat(modal.querySelector("#withdraw-input").value);
    const wId = modal.querySelector("#withdraw-wallet-select").value;
    const currentAmt = parseFloat(goal.currentAmount) || 0;
    if (isNaN(amt) || amt <= 0 || amt > currentAmt) {
      alerts.error(isEn ? "Invalid amount or exceeds saved balance" : "จำนวนเงินไม่ถูกต้องหรือเกินยอดสะสม");
      return;
    }

    store.withdrawFromGoal(goal.id, amt, wId);
    close();
    alerts.success(isEn ? "Funds withdrawn successfully!" : "ถอนเงินเรียบร้อยแล้ว!");
    renderSavings(container, { goalId: goal.id });
  });
}

function showCreateGoalDialog(container) {
  const isEn = store.settings.language === "en";
  const sym = store.getCurrencySymbol();

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 24px; max-width: 340px; width: 90%; box-shadow: var(--card-shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0;">
          ${isEn ? "Create Savings Goal" : "สร้างเป้าหมายการออม"}
        </h3>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-secondary); font-size: 22px; cursor: pointer;">&times;</button>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">
          ${isEn ? "Goal Name" : "ชื่อเป้าหมาย"}
        </label>
        <input id="create-goal-title" type="text" placeholder="${isEn ? "e.g. Travel, Emergency, Mac" : "เช่น ทริปเที่ยว, เงินฉุกเฉิน, คอมใหม่"}" style="width: 100%; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 13px; font-weight: 700;" />
      </div>

      <div style="margin-bottom: 18px;">
        <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">
          ${isEn ? "Target Amount" : "เป้าหมายยอดเงิน"}
        </label>
        <div style="position: relative;">
          <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-weight: 800; color: var(--text-secondary);">${sym}</span>
          <input id="create-goal-target" type="number" step="500" min="100" placeholder="50000" style="width: 100%; padding: 10px 12px 10px 28px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 14px; font-weight: 800;" />
        </div>
      </div>

      <button id="create-goal-confirm-btn" class="btn-primary" style="width: 100%; padding: 12px; border-radius: var(--radius); background: var(--gold); color: #000; font-weight: 800; font-size: 13px; border: none; cursor: pointer; box-shadow: var(--btn-shadow);">
        ${isEn ? "Create Goal" : "สร้างเป้าหมาย"}
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector(".modal-close-btn").onclick = close;
  modal.onclick = (e) => {
    if (e.target === modal) close();
  };

  modal.querySelector("#create-goal-confirm-btn")?.addEventListener("click", () => {
    const title = modal.querySelector("#create-goal-title").value.trim();
    const tgt = parseFloat(modal.querySelector("#create-goal-target").value);
    if (!title || isNaN(tgt) || tgt <= 0) {
      alerts.error(isEn ? "Please fill in a valid name and target" : "กรุณากรอกชื่อและเป้าหมายยอดเงินที่ถูกต้อง");
      return;
    }
    const newGoal = store.addSavingsGoal({
      title,
      targetAmount: tgt,
      currentAmount: 0,
      color: "var(--gold)",
    });
    close();
    alerts.success(isEn ? "Savings goal created!" : "สร้างเป้าหมายการออมเรียบร้อยแล้ว!");
    renderSavings(container, { goalId: newGoal?.id });
  });
}
