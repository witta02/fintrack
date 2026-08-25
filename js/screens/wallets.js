import { store } from "../store.js";
import { router } from "../router.js";
import { alerts } from "../utils/alertHelper.js";
import { t } from "../i18n.js";

export const WALLET_ICONS = {
  cash: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>`,
  bank: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18"/><line x1="10" x2="10" y1="18"/><line x1="14" x2="14" y1="18"/><line x1="18" x2="18" y1="18"/><polygon points="12 2 20 7 4 7"/><line x1="2" x2="22" y1="18" y2="18"/></svg>`,
  savings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="3"/><circle cx="12" cy="12" r="4"/><line x1="12" x2="12" y1="8" y2="10"/><line x1="12" x2="12" y1="14" y2="16"/><line x1="8" x2="10" y1="12" y2="12"/><line x1="14" x2="16" y1="12" y2="12"/></svg>`,
  credit: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,
  investment: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  crypto: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9 8h4.5a2.5 2.5 0 0 1 0 5H9"/><path d="M9 13h5.5a2.5 2.5 0 0 1 0 5H9"/><line x1="9" x2="9" y1="5" y2="19"/></svg>`,
  default: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>`,
};

export function getWalletIconSvg(type, size = 20) {
  const icon = WALLET_ICONS[type] || WALLET_ICONS.default;
  return icon.replace(/width="20"/, `width="${size}"`).replace(/height="20"/, `height="${size}"`);
}

export const WALLET_TYPES = [
  { type: "cash", label: "เงินสด (Cash)", color: "#F5C842" },
  { type: "bank", label: "บัญชีธนาคาร (Bank)", color: "#3B82F6" },
  { type: "savings", label: "เงินออม (Savings)", color: "#10B981" },
  { type: "credit", label: "บัตรเครดิต (Credit)", color: "#EF4444" },
  { type: "investment", label: "พอร์ตลงทุน (Invest)", color: "#6366F1" },
  { type: "crypto", label: "คริปโต (Crypto)", color: "#F59E0B" },
];

export function renderWallets(container) {
  container.innerHTML = `
    <div class="screen screen-enter" style="padding: 0 16px 28px;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <button id="back-btn" class="icon-btn" style="background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: var(--text-primary); margin: 0;">${store.settings.language === 'en' ? 'Wallets' : 'กระเป๋าเงิน'}</h1>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="quick-transfer-btn" class="icon-btn" title="Transfer Funds" style="width: 40px; height: 40px; border-radius: 12px; background: var(--surface); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; color: var(--violet);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          </button>
          <button id="add-wallet-btn" class="icon-btn" title="Add Wallet" style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, var(--gold), var(--amber)); border: none; display: flex; align-items: center; justify-content: center; color: #000; box-shadow: var(--shadow-gold);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>

      <!-- Hero Total Balance Card -->
      <div style="background: var(--balance-bg); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 22px; margin-bottom: 20px; position: relative; overflow: hidden;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); margin-bottom: 6px;">
          ${store.settings.language === 'en' ? 'Total Across All Wallets' : 'ยอดรวมทุกกระเป๋า'}
        </div>
        <div id="wallets-hero-balance" style="font-size: 34px; font-weight: 900; color: var(--balance-text); font-family: var(--font-heading); margin-bottom: 12px;">
          0.00
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="hero-transfer-btn" style="flex: 1; padding: 10px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: var(--radius); color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            ${store.settings.language === 'en' ? 'Transfer Funds' : 'โอนเงินระหว่างกระเป๋า'}
          </button>
        </div>
      </div>

      <!-- Wallet List -->
      <div id="wallets-section-header" style="font-size: 13px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; padding: 0 4px;">
        ${store.settings.language === 'en' ? 'Your Wallets' : 'กระเป๋าเงินของคุณ'}
      </div>

      <div id="wallets-grid" style="display: flex; flex-direction: column; gap: 12px;">
      </div>
    </div>
  `;

  setupWalletStaticListeners(container);
  updateWalletsUI(container);

  const unsubscribe = store.subscribe(() => {
    if (document.getElementById("wallets-grid")) {
      updateWalletsUI(container);
    } else {
      unsubscribe();
    }
  });
}

function updateWalletsUI(container) {
  const wallets = store.getWallets();
  const symbol = store.getCurrencySymbol();
  
  let totalBalance = 0;
  wallets.forEach((w) => {
    totalBalance += store.getWalletBalance(w.id);
  });

  const heroBal = container.querySelector("#wallets-hero-balance");
  if (heroBal) {
    heroBal.textContent = `${symbol}${store.toDisplay(totalBalance).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const header = container.querySelector("#wallets-section-header");
  if (header) {
    header.textContent = `${store.settings.language === 'en' ? 'Your Wallets' : 'กระเป๋าเงินของคุณ'} (${wallets.length})`;
  }

  const grid = container.querySelector("#wallets-grid");
  if (grid) {
    grid.innerHTML = wallets.map(w => renderWalletCard(w, symbol)).join('');
    attachWalletCardListeners(container);
  }
}

function renderWalletCard(wallet, symbol) {
  const currentBal = store.getWalletBalance(wallet.id);
  const color = wallet.color || '#F5C842';

  return `
    <div class="wallet-pocket-card" data-wallet-id="${wallet.id}" style="background: var(--card); border: 1px solid var(--border); border-left: 4px solid ${color}; border-radius: var(--radius-xl); padding: 18px; display: flex; align-items: center; gap: 14px; transition: all var(--transition);">
      <div style="width: 46px; height: 46px; border-radius: 14px; background: ${color}20; color: ${color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        ${getWalletIconSvg(wallet.type, 22)}
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <h3 style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${wallet.name}</h3>
          ${wallet.isDefault ? `<span style="font-size: 9px; font-weight: 700; background: var(--gold-soft); color: var(--gold); border: 1px solid var(--gold-glow); padding: 1px 6px; border-radius: 999px;">หลัก</span>` : ''}
        </div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px; text-transform: uppercase; font-weight: 600;">
          ${wallet.type} · ${wallet.currency || 'THB'}
        </div>
      </div>
      <div style="text-align: right; flex-shrink: 0;">
        <div style="font-size: 16px; font-weight: 900; color: ${currentBal >= 0 ? 'var(--text-primary)' : 'var(--expense)'}; font-family: var(--font-heading);">
          ${symbol}${store.toDisplay(currentBal).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 6px; margin-top: 6px;">
          <button class="wallet-action-btn edit" data-edit-id="${wallet.id}" title="Edit" style="background: var(--surface); border: 1px solid var(--border); width: 26px; height: 26px; border-radius: 6px; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          ${!wallet.isDefault ? `
            <button class="wallet-action-btn delete" data-delete-id="${wallet.id}" title="Delete" style="background: var(--surface); border: 1px solid var(--border); width: 26px; height: 26px; border-radius: 6px; color: var(--expense); cursor: pointer; display: flex; align-items: center; justify-content: center;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function setupWalletStaticListeners(container) {
  container.querySelector("#back-btn")?.addEventListener("click", () => {
    router.navigate("settings");
  });

  const openTransfer = () => showTransferModal(container);
  container.querySelector("#quick-transfer-btn")?.addEventListener("click", openTransfer);
  container.querySelector("#hero-transfer-btn")?.addEventListener("click", openTransfer);

  container.querySelector("#add-wallet-btn")?.addEventListener("click", () => {
    showAddWalletModal(container);
  });
}

function attachWalletCardListeners(container) {
  container.querySelectorAll("[data-delete-id]").forEach((btn) => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-delete-id");
      const isConfirmed = await alerts.confirmDelete(
        store.settings.language === 'en' ? 'Delete Wallet?' : 'ต้องการลบกระเป๋านี้?',
        store.settings.language === 'en' ? 'Transactions will be moved to default wallet.' : 'รายการทั้งหมดจะถูกย้ายไปกระเป๋าหลัก'
      );
      if (isConfirmed) {
        store.deleteWallet(id);
      }
    };
  });

  container.querySelectorAll("[data-edit-id]").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-edit-id");
      const w = store.getWallet(id);
      if (w) showEditWalletModal(container, w);
    };
  });
}

function showAddWalletModal(container) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog" style="background: var(--card-solid); border: 1px solid var(--border); border-radius: 20px; padding: 24px; max-width: 360px; width: 90%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
        <h3 style="font-size: 17px; font-weight: 800; color: var(--text-primary); margin: 0;">${store.settings.language === 'en' ? 'Add New Wallet' : 'เพิ่มกระเป๋าใหม่'}</h3>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-muted); font-size: 24px; cursor: pointer;">×</button>
      </div>
      <form id="add-wallet-form" style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">${store.settings.language === 'en' ? 'Wallet Name' : 'ชื่อกระเป๋า'}</label>
          <input name="name" required placeholder="เช่น ธนาคารกสิกร / พอร์ต Dime" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" />
        </div>
        <div>
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">${store.settings.language === 'en' ? 'Wallet Type' : 'ประเภทกระเป๋า'}</label>
          <select name="type" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);">
            ${WALLET_TYPES.map(t => `<option value="${t.type}">${t.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <label style="font-size: 12px; font-weight: 700; color: var(--text-secondary);">${store.settings.language === 'en' ? 'Starting Balance' : 'ยอดเงินตั้งต้น'}</label>
          </div>
          <input name="balance" type="number" step="0.01" value="0" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" />
          <small style="font-size: 10px; color: var(--text-muted); display: block; margin-top: 3px;">
            ${store.settings.language === 'en' ? 'Direct starting amount (not added to transaction list).' : 'กำหนดยอดตั้งต้นของกระเป๋า โดยไม่สร้างประวัติรายการ'}
          </small>
        </div>
        <button type="submit" class="btn-primary" style="margin-top: 6px; padding: 14px; background: linear-gradient(135deg, var(--gold), var(--amber)); color: #000; font-weight: 800; border: none; border-radius: var(--radius); cursor: pointer;">${t("save")}</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close-btn").addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  modal.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const typeObj = WALLET_TYPES.find(t => t.type === data.get("type")) || WALLET_TYPES[0];
    store.addWallet({
      name: data.get("name"),
      type: data.get("type"),
      balance: parseFloat(data.get("balance")) || 0,
      icon: typeObj.type,
      color: typeObj.color,
    });
    close();
    alerts.success(store.settings.language === 'en' ? 'Wallet created!' : 'สร้างกระเป๋าเงินเรียบร้อยแล้ว');
  });
}

function showEditWalletModal(container, wallet) {
  const currentBal = store.getWalletBalance(wallet.id);
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog" style="background: var(--card-solid); border: 1px solid var(--border); border-radius: 20px; padding: 24px; max-width: 360px; width: 90%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
        <h3 style="font-size: 17px; font-weight: 800; color: var(--text-primary); margin: 0;">${store.settings.language === 'en' ? 'Edit Wallet' : 'แก้ไขกระเป๋า'}</h3>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-muted); font-size: 24px; cursor: pointer;">×</button>
      </div>
      <form id="edit-wallet-form" style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">${store.settings.language === 'en' ? 'Wallet Name' : 'ชื่อกระเป๋า'}</label>
          <input name="name" value="${wallet.name}" required style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" />
        </div>
        <div>
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">${store.settings.language === 'en' ? 'Wallet Type' : 'ประเภทกระเป๋า'}</label>
          <select name="type" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);">
            ${WALLET_TYPES.map(t => `<option value="${t.type}" ${wallet.type === t.type ? 'selected' : ''}>${t.label}</option>`).join('')}
          </select>
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <label style="font-size: 12px; font-weight: 700; color: var(--text-secondary);">${store.settings.language === 'en' ? 'Current Balance' : 'ยอดเงินในกระเป๋า (ปรับยอด)'}</label>
            <button type="button" id="set-zero-btn" style="background: rgba(239, 68, 68, 0.1); color: var(--expense); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 6px; padding: 2px 8px; font-size: 10px; font-weight: 800; cursor: pointer;">
              ${store.settings.language === 'en' ? 'Set to 0' : 'ตั้งเป็น 0 ฿'}
            </button>
          </div>
          <input id="edit-wallet-balance-input" name="balance" type="number" step="0.01" value="${currentBal.toFixed(2)}" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" />
          <small style="font-size: 10px; color: var(--text-muted); display: block; margin-top: 3px;">
            ${store.settings.language === 'en' ? 'Adjusts wallet balance directly without creating a transaction.' : 'ปรับยอดเงินคงเหลือโดยตรง ไม่บันทึกลงประวัติธุรกรรม'}
          </small>
        </div>
        <button type="submit" class="btn-primary" style="margin-top: 6px; padding: 14px; background: linear-gradient(135deg, var(--gold), var(--amber)); color: #000; font-weight: 800; border: none; border-radius: var(--radius); cursor: pointer;">${t("save")}</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close-btn").addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

  const balanceInput = modal.querySelector("#edit-wallet-balance-input");
  modal.querySelector("#set-zero-btn")?.addEventListener("click", () => {
    if (balanceInput) balanceInput.value = "0";
  });

  modal.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const typeObj = WALLET_TYPES.find(t => t.type === data.get("type")) || WALLET_TYPES[0];
    const targetBal = parseFloat(data.get("balance")) || 0;

    store.updateWallet({
      id: wallet.id,
      name: data.get("name"),
      type: data.get("type"),
      icon: typeObj.type,
      color: typeObj.color,
    });

    store.setWalletBalance(wallet.id, targetBal);
    close();
    alerts.success(store.settings.language === 'en' ? 'Wallet updated!' : 'อัปเดตกระเป๋าเงินเรียบร้อยแล้ว');
  });
}

function showTransferModal(container) {
  const wallets = store.getWallets();
  if (wallets.length < 2) {
    alerts.warning(store.settings.language === 'en' ? 'Need at least 2 wallets to transfer' : 'ต้องมีอย่างน้อย 2 กระเป๋าเพื่อโอนเงิน');
    return;
  }

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog" style="background: var(--card-solid); border: 1px solid var(--border); border-radius: 20px; padding: 24px; max-width: 360px; width: 90%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
        <h3 style="font-size: 17px; font-weight: 800; color: var(--text-primary); margin: 0;">${store.settings.language === 'en' ? 'Transfer Between Wallets' : 'โอนเงินระหว่างกระเป๋า'}</h3>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-muted); font-size: 24px; cursor: pointer;">×</button>
      </div>
      <form id="transfer-form" style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">${store.settings.language === 'en' ? 'From Wallet' : 'จากกระเป๋า'}</label>
          <select name="from" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);">
            ${wallets.map(w => `<option value="${w.id}">${w.name} (${store.getCurrencySymbol()}${store.toDisplay(store.getWalletBalance(w.id)).toLocaleString()})</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">${store.settings.language === 'en' ? 'To Wallet' : 'ไปยังกระเป๋า'}</label>
          <select name="to" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);">
            ${wallets.map((w, idx) => `<option value="${w.id}" ${idx === 1 ? 'selected' : ''}>${w.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">${store.settings.language === 'en' ? 'Amount' : 'จำนวนเงิน'}</label>
          <input name="amount" type="number" step="0.01" min="0.01" required placeholder="0.00" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" />
        </div>
        <div>
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">${store.settings.language === 'en' ? 'Note (Optional)' : 'บันทึกช่วยจำ'}</label>
          <input name="note" placeholder="เช่น โอนเข้าบัญชีออมทรัพย์" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" />
        </div>
        <button type="submit" class="btn-primary" style="margin-top: 6px; padding: 14px; background: linear-gradient(135deg, var(--gold), var(--amber)); color: #000; font-weight: 800; border: none; border-radius: var(--radius); cursor: pointer;">${store.settings.language === 'en' ? 'Transfer Now' : 'ยืนยันโอนเงิน'}</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close-btn").addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  modal.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const fromId = data.get("from");
    const toId = data.get("to");
    const amount = parseFloat(data.get("amount"));

    if (fromId === toId) {
      alerts.warning(store.settings.language === 'en' ? 'Source and destination wallets must be different' : 'กระเป๋าต้นทางและปลายทางต้องไม่ซ้ำกัน');
      return;
    }

    const success = store.transferFunds({
      fromWalletId: fromId,
      toWalletId: toId,
      amount: amount,
      note: data.get("note"),
    });

    if (success) {
      alerts.success(store.settings.language === 'en' ? 'Transfer Complete' : 'โอนเงินสำเร็จ');
      close();
    }
  });
}
