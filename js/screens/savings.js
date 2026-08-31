import { store } from "../store.js";
import { t, getLanguage } from "../i18n.js";
import { router } from "../router.js";
import { alerts } from "../utils/alertHelper.js";

export function renderSavings(container, params = null) {
  const isEn = store.settings.language === 'en';
  const sym = store.getCurrencySymbol();
  const goals = store.getSavingsGoals();
  const activeGoalId = params?.goalId || (goals.length > 0 ? goals[0].id : null);
  const activeGoal = goals.find(g => g.id === activeGoalId) || goals[0] || {
    id: 'default',
    title: isEn ? 'General Savings' : 'เงินออมทั่วไป',
    currentAmount: 0,
    targetAmount: 50000,
    color: 'var(--gold)',
    emoji: '',
  };

  const target = Math.max(1, parseFloat(activeGoal.targetAmount) || 1);
  const current = parseFloat(activeGoal.currentAmount) || 0;
  const pct = Math.min(100, Math.round((current / target) * 100));

  // Circumference for radial circle gauge (radius = 70)
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  const html = `
    <div class="screen screen-enter savings-screen-wrap" style="padding: 0 16px 100px;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0 16px;">
        <button class="back-btn icon-btn" id="savings-back-btn" style="background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: var(--radius);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0; letter-spacing: -0.3px;">
          ${isEn ? 'Savings' : 'กระปุกออมเงิน'}
        </h1>
        <button class="icon-btn" id="savings-add-goal-header-btn" title="${isEn ? 'Create Goal' : 'สร้างเป้าหมาย'}" style="background: var(--surface); border: 1px solid var(--border); color: var(--gold); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: var(--radius);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>

      <!-- Multiple Goals Horizontal Selector (if > 1 goal) -->
      ${goals.length > 1 ? `
        <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 12px; scrollbar-width: none;">
          ${goals.map(g => {
            const isSelected = g.id === activeGoal.id;
            return `
              <button class="goal-pill-tab ${isSelected ? 'active' : ''}" data-select-goal="${g.id}" style="padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 800; border: 1px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}; background: ${isSelected ? 'var(--gold-soft)' : 'var(--surface)'}; color: ${isSelected ? 'var(--gold)' : 'var(--text-secondary)'}; cursor: pointer; white-space: nowrap;">
                ${g.title}
              </button>
            `;
          }).join('')}
        </div>
      ` : ''}

      <!-- Radial Progress Hero Card (Matching Screen 2) -->
      <div class="savings-hero-card" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 28px 20px 24px; text-align: center; box-shadow: var(--card-shadow); margin-bottom: 18px; position: relative;">
        <!-- Circular Radial SVG Gauge -->
        <div style="position: relative; width: 170px; height: 170px; margin: 0 auto 16px;">
          <svg width="170" height="170" viewBox="0 0 170 170" style="transform: rotate(-90deg);">
            <!-- Background Track -->
            <circle cx="85" cy="85" r="${radius}" fill="none" stroke="var(--bg-secondary)" stroke-width="12" />
            <!-- Active Radial Progress -->
            <circle cx="85" cy="85" r="${radius}" fill="none" stroke="var(--income)" stroke-width="12" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);" />
          </svg>
          <!-- Center Goal Icon -->
          <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(0deg);">
            <div style="width: 52px; height: 52px; border-radius: 16px; background: var(--income-soft); display: flex; align-items: center; justify-content: center; color: var(--income); margin-bottom: 4px;">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            </div>
            <span style="font-size: 11px; font-weight: 800; color: var(--income);">${pct}%</span>
          </div>
        </div>

        <!-- Goal Title & Main Amount -->
        <div style="font-size: 13px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
          ${activeGoal.title}
        </div>
        <div style="font-size: 32px; font-weight: 900; color: var(--text-primary); font-family: var(--font-heading); letter-spacing: -0.5px; margin-bottom: 4px;">
          ${sym} ${current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style="font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 22px;">
          ${isEn ? 'of' : 'จากเป้าหมาย'} ${sym} ${target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>

        <!-- Action Pill Buttons: Top up & Withdraw -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 320px; margin: 0 auto;">
          <button id="savings-topup-btn" style="padding: 12px 16px; border-radius: 999px; background: var(--surface); border: 1.5px solid var(--income); color: var(--income); font-weight: 800; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: var(--transition);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
            ${isEn ? 'Top up' : 'ฝากเงิน'}
          </button>
          <button id="savings-withdraw-btn" style="padding: 12px 16px; border-radius: 999px; background: var(--surface); border: 1.5px solid var(--border-strong); color: var(--text-primary); font-weight: 800; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: var(--transition);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
            ${isEn ? 'Withdraw' : 'ถอนเงิน'}
          </button>
        </div>
      </div>

      <!-- Goal History / Transactions Bottom Card -->
      <div style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 18px 16px; box-shadow: var(--card-shadow); margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding: 0 4px;">
          <div style="font-size: 12px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">
            ${isEn ? 'Savings Activity' : 'ประวัติการออม'}
          </div>
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted);">${current > 0 ? `${isEn ? 'Total' : 'สะสม'}: ${sym}${current.toLocaleString()}` : ''}</span>
        </div>

        <div id="savings-history-list">
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 8px; border-bottom: 1px solid var(--border);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 36px; height: 36px; border-radius: 10px; background: var(--income-soft); color: var(--income); display: flex; align-items: center; justify-content: center;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
              </div>
              <div>
                <div style="font-size: 13px; font-weight: 800; color: var(--text-primary);">${isEn ? 'Goal Deposit' : 'ฝากเข้ากระปุก'}</div>
                <div style="font-size: 10.5px; color: var(--text-secondary);">${isEn ? 'Active balance' : 'ยอดออมปัจจุบัน'}</div>
              </div>
            </div>
            <div style="font-size: 14px; font-weight: 900; font-family: var(--font-heading); color: var(--income);">
              +${sym} ${current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      <!-- Down Payments & Installments Section Card -->
      <div id="savings-open-installments-btn" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 16px 18px; box-shadow: var(--card-shadow); display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: background 0.15s ease;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(245, 200, 66, 0.15); color: var(--gold); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.9 2 11.2 2 11.5V16c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
          </div>
          <div>
            <div style="font-size: 13.5px; font-weight: 800; color: var(--text-primary);">${isEn ? 'Down Payments & Installments' : 'เงินดาวน์ & สัญญาผ่อนชำระ'}</div>
            <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600;">${isEn ? 'Track car, condo, & installment milestones' : 'ติดตามค่างวดรถ บ้าน และการผ่อนของ'}</div>
          </div>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color: var(--text-muted);"><path d="m9 18 6-6-6-6"/></svg>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Event Listeners
  container.querySelector('#savings-back-btn')?.addEventListener('click', () => {
    router.navigate('dashboard');
  });

  container.querySelector('#savings-open-installments-btn')?.addEventListener('click', () => {
    router.navigate('downPayments');
  });

  container.querySelector('#savings-add-goal-header-btn')?.addEventListener('click', () => {
    showCreateGoalDialog(container);
  });

  container.querySelectorAll('[data-select-goal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const gId = btn.getAttribute('data-select-goal');
      renderSavings(container, { goalId: gId });
    });
  });

  container.querySelector('#savings-topup-btn')?.addEventListener('click', () => {
    showDepositModal(container, activeGoal);
  });

  container.querySelector('#savings-withdraw-btn')?.addEventListener('click', () => {
    showWithdrawModal(container, activeGoal);
  });
}

function showDepositModal(container, goal) {
  const isEn = store.settings.language === 'en';
  const sym = store.getCurrencySymbol();
  const wallets = store.getWallets();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-dialog" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 24px; max-width: 340px; width: 90%; box-shadow: var(--card-shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0;">
          ${isEn ? `Top Up: ${goal.title}` : `ฝากเงิน: ${goal.title}`}
        </h3>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-secondary); font-size: 22px; cursor: pointer;">&times;</button>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">
          ${isEn ? 'Amount' : 'จำนวนเงิน'}
        </label>
        <div style="position: relative;">
          <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-weight: 800; color: var(--text-secondary);">${sym}</span>
          <input id="deposit-input" type="number" step="50" min="1" placeholder="1000" style="width: 100%; padding: 10px 12px 10px 28px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 14px; font-weight: 800;" />
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">
          ${isEn ? 'Deduct from Wallet' : 'ตัดเงินจากกระเป๋า'}
        </label>
        <select id="deposit-wallet-select" style="width: 100%; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 13px; font-weight: 700;">
          ${wallets.map(w => `<option value="${w.id}">${w.name} (${sym}${store.getWalletBalance(w.id).toLocaleString()})</option>`).join('')}
        </select>
      </div>

      <button id="confirm-deposit-btn" class="btn-primary" style="width: 100%; padding: 12px; border-radius: var(--radius); background: var(--income); color: #fff; font-weight: 800; font-size: 13px; border: none; cursor: pointer;">
        ${isEn ? 'Confirm Deposit' : 'ยืนยันการฝากเงิน'}
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.modal-close-btn').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  modal.querySelector('#confirm-deposit-btn')?.addEventListener('click', () => {
    const amt = parseFloat(modal.querySelector('#deposit-input').value);
    const wId = modal.querySelector('#deposit-wallet-select').value;
    if (isNaN(amt) || amt <= 0) {
      alerts.error(isEn ? 'Please enter a valid amount' : 'กรุณาระบุจำนวนเงินที่ถูกต้อง');
      return;
    }
    const currentAmt = parseFloat(goal.currentAmount) || 0;
    store.updateSavingsGoal(goal.id, { currentAmount: currentAmt + amt });
    
    // Log as a transaction
    store.addTransaction({
      title: `${isEn ? 'Deposit to' : 'ฝากเข้า'} ${goal.title}`,
      amount: amt,
      isIncome: false,
      category: 'Savings',
      walletId: wId,
      date: new Date().toISOString(),
    });

    close();
    alerts.success(isEn ? 'Funds deposited successfully!' : 'ฝากเงินเข้ากระปุกเรียบร้อยแล้ว!');
    renderSavings(container, { goalId: goal.id });
  });
}

function showWithdrawModal(container, goal) {
  const isEn = store.settings.language === 'en';
  const sym = store.getCurrencySymbol();
  const wallets = store.getWallets();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
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
          ${isEn ? 'Amount' : 'จำนวนเงิน'}
        </label>
        <div style="position: relative;">
          <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-weight: 800; color: var(--text-secondary);">${sym}</span>
          <input id="withdraw-input" type="number" step="50" min="1" placeholder="1000" style="width: 100%; padding: 10px 12px 10px 28px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 14px; font-weight: 800;" />
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">
          ${isEn ? 'Deposit to Wallet' : 'โอนเข้ากระเป๋า'}
        </label>
        <select id="withdraw-wallet-select" style="width: 100%; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 13px; font-weight: 700;">
          ${wallets.map(w => `<option value="${w.id}">${w.name}</option>`).join('')}
        </select>
      </div>

      <button id="confirm-withdraw-btn" class="btn-primary" style="width: 100%; padding: 12px; border-radius: var(--radius); background: var(--text-primary); color: var(--bg); font-weight: 800; font-size: 13px; border: none; cursor: pointer;">
        ${isEn ? 'Confirm Withdrawal' : 'ยืนยันการถอนเงิน'}
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.modal-close-btn').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  modal.querySelector('#confirm-withdraw-btn')?.addEventListener('click', () => {
    const amt = parseFloat(modal.querySelector('#withdraw-input').value);
    const wId = modal.querySelector('#withdraw-wallet-select').value;
    const currentAmt = parseFloat(goal.currentAmount) || 0;
    if (isNaN(amt) || amt <= 0 || amt > currentAmt) {
      alerts.error(isEn ? 'Invalid amount or exceeds saved balance' : 'จำนวนเงินไม่ถูกต้องหรือเกินยอดสะสม');
      return;
    }
    store.updateSavingsGoal(goal.id, { currentAmount: currentAmt - amt });
    
    // Log as income transaction
    store.addTransaction({
      title: `${isEn ? 'Withdraw from' : 'ถอนจาก'} ${goal.title}`,
      amount: amt,
      isIncome: true,
      category: 'Savings',
      walletId: wId,
      date: new Date().toISOString(),
    });

    close();
    alerts.success(isEn ? 'Funds withdrawn successfully!' : 'ถอนเงินเรียบร้อยแล้ว!');
    renderSavings(container, { goalId: goal.id });
  });
}

function showCreateGoalDialog(container) {
  const isEn = store.settings.language === 'en';
  const sym = store.getCurrencySymbol();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-dialog" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 24px; max-width: 340px; width: 90%; box-shadow: var(--card-shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0;">
          ${isEn ? 'Create Savings Goal' : 'สร้างเป้าหมายการออม'}
        </h3>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-secondary); font-size: 22px; cursor: pointer;">&times;</button>
      </div>

      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">
          ${isEn ? 'Goal Name' : 'ชื่อเป้าหมาย'}
        </label>
        <input id="create-goal-title" type="text" placeholder="${isEn ? 'e.g. Travel, Emergency, Mac' : 'เช่น ทริปเที่ยว, เงินฉุกเฉิน, คอมใหม่'}" style="width: 100%; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 13px; font-weight: 700;" />
      </div>

      <div style="margin-bottom: 18px;">
        <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">
          ${isEn ? 'Target Amount' : 'เป้าหมายยอดเงิน'}
        </label>
        <div style="position: relative;">
          <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-weight: 800; color: var(--text-secondary);">${sym}</span>
          <input id="create-goal-target" type="number" step="500" min="100" placeholder="50000" style="width: 100%; padding: 10px 12px 10px 28px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 14px; font-weight: 800;" />
        </div>
      </div>

      <button id="create-goal-confirm-btn" class="btn-primary" style="width: 100%; padding: 12px; border-radius: var(--radius); background: var(--gold); color: #000; font-weight: 800; font-size: 13px; border: none; cursor: pointer; box-shadow: var(--btn-shadow);">
        ${isEn ? 'Create Goal' : 'สร้างเป้าหมาย'}
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('.modal-close-btn').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  modal.querySelector('#create-goal-confirm-btn')?.addEventListener('click', () => {
    const title = modal.querySelector('#create-goal-title').value.trim();
    const tgt = parseFloat(modal.querySelector('#create-goal-target').value);
    if (!title || isNaN(tgt) || tgt <= 0) {
      alerts.error(isEn ? 'Please fill in a valid name and target' : 'กรุณากรอกชื่อและเป้าหมายยอดเงินที่ถูกต้อง');
      return;
    }
    const newGoal = store.addSavingsGoal({
      title,
      targetAmount: tgt,
      currentAmount: 0,
      color: 'var(--gold)',
    });
    close();
    alerts.success(isEn ? 'Savings goal created!' : 'สร้างเป้าหมายการออมเรียบร้อยแล้ว!');
    renderSavings(container, { goalId: newGoal?.id });
  });
}
