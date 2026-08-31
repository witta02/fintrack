import { store } from "../store.js";
import { t } from "../i18n.js";
import { alerts } from "../utils/alertHelper.js";
import { getExpenseCategories, getIncomeCategories } from "../categories.js";
import confetti from "canvas-confetti";

export function showQuickNumpadModal(onSuccessCallback = null) {
  const isEn = store.settings.language === "en";
  const sym = store.getCurrencySymbol();
  const wallets = store.getWallets();
  const primaryWallet = store.getPrimaryWallet();
  const categories = getExpenseCategories();

  let currentAmountStr = "0";
  let selectedCategory = categories[0]?.name || "Food";
  let selectedWalletId = primaryWallet?.id || wallets[0]?.id || "default";
  let isIncome = false;

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <style>
      .numpad-key {
        height: 52px;
        border-radius: var(--radius-lg);
        background: var(--surface);
        border: 1px solid var(--border);
        color: var(--text-primary);
        font-size: 19px;
        font-weight: 800;
        font-family: var(--font-heading);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        user-select: none;
        transition: all 0.12s ease;
      }
      .numpad-key:active {
        transform: scale(0.94);
        background: var(--surface-hover);
        border-color: var(--border-strong);
      }
      .numpad-cat-pill {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 999px;
        background: var(--surface);
        border: 1px solid var(--border);
        font-size: 11.5px;
        font-weight: 800;
        color: var(--text-secondary);
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
        transition: all 0.15s ease;
      }
      .numpad-cat-pill.active {
        background: var(--card);
        border-color: var(--gold);
        color: var(--text-primary);
        box-shadow: 0 0 10px rgba(245, 200, 66, 0.25);
      }
    </style>

    <div class="modal-dialog" style="max-width: 380px; width: 94%; max-height: 92vh; overflow-y: auto; padding: 20px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); box-shadow: var(--card-shadow);">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: var(--gold-soft); color: var(--gold); display: flex; align-items: center; justify-content: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <span style="font-size: 15px; font-weight: 900; color: var(--text-primary);">
            ${isEn ? "Fast Record (2s)" : "จดด่วน (2 วินาที)"}
          </span>
        </div>

        <!-- Expense / Income Toggle -->
        <div style="display: flex; background: var(--surface); border: 1px solid var(--border); border-radius: 999px; padding: 2px;">
          <button id="numpad-type-expense" style="padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; border: none; cursor: pointer; background: var(--card); color: var(--expense); box-shadow: var(--card-shadow);">
            ${isEn ? "Expense" : "รายจ่าย"}
          </button>
          <button id="numpad-type-income" style="padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; border: none; cursor: pointer; background: transparent; color: var(--text-secondary);">
            ${isEn ? "Income" : "รายรับ"}
          </button>
        </div>

        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <!-- Large Display -->
      <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 14px 16px; text-align: right; margin-bottom: 12px;">
        <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; display: flex; justify-content: space-between;">
          <span id="numpad-wallet-label">${primaryWallet?.name || "Cash"}</span>
          <span id="numpad-cat-label">${categories[0]?.label || "Food"}</span>
        </div>
        <div id="numpad-display-amount" style="font-size: 34px; font-weight: 900; font-family: var(--font-heading); color: var(--expense); letter-spacing: -0.5px; margin-top: 2px; overflow-x: auto; white-space: nowrap;">
          ${sym}0
        </div>
      </div>

      <!-- Quick Preset Amounts -->
      <div style="display: flex; gap: 6px; margin-bottom: 12px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px;">
        <button class="preset-amt-btn" data-amt="50" style="flex: 1; padding: 6px 4px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); font-size: 11px; font-weight: 800; color: var(--text-primary); cursor: pointer;">+50</button>
        <button class="preset-amt-btn" data-amt="100" style="flex: 1; padding: 6px 4px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); font-size: 11px; font-weight: 800; color: var(--text-primary); cursor: pointer;">+100</button>
        <button class="preset-amt-btn" data-amt="300" style="flex: 1; padding: 6px 4px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); font-size: 11px; font-weight: 800; color: var(--text-primary); cursor: pointer;">+300</button>
        <button class="preset-amt-btn" data-amt="500" style="flex: 1; padding: 6px 4px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); font-size: 11px; font-weight: 800; color: var(--text-primary); cursor: pointer;">+500</button>
        <button class="preset-amt-btn" data-amt="1000" style="flex: 1; padding: 6px 4px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); font-size: 11px; font-weight: 800; color: var(--text-primary); cursor: pointer;">+1k</button>
      </div>

      <!-- 1-Tap Category Selector Carousel -->
      <div style="margin-bottom: 12px;">
        <div id="numpad-category-list" style="display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px;">
          ${categories.map((c, idx) => `
            <div class="numpad-cat-pill ${idx === 0 ? 'active' : ''}" data-cat-id="${c.name}" data-cat-label="${c.label}" style="--cat-color: ${c.color};">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: ${c.color};"></span>
              <span>${c.label}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Wallet Selector Row -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">
          ${isEn ? "Wallet" : "กระเป๋า"}
        </span>
        <select id="numpad-wallet-select" style="padding: 5px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 11.5px; font-weight: 800; max-width: 180px;">
          ${wallets.map(w => `
            <option value="${w.id}" ${w.id === selectedWalletId ? 'selected' : ''}>
              ${w.name} (${sym}${store.getWalletBalance(w.id).toLocaleString()})
            </option>
          `).join('')}
        </select>
      </div>

      <!-- Tactical Keypad Grid (4x3) -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;">
        <div class="numpad-key" data-key="1">1</div>
        <div class="numpad-key" data-key="2">2</div>
        <div class="numpad-key" data-key="3">3</div>
        <div class="numpad-key" data-key="4">4</div>
        <div class="numpad-key" data-key="5">5</div>
        <div class="numpad-key" data-key="6">6</div>
        <div class="numpad-key" data-key="7">7</div>
        <div class="numpad-key" data-key="8">8</div>
        <div class="numpad-key" data-key="9">9</div>
        <div class="numpad-key" data-key="." style="font-size: 24px;">.</div>
        <div class="numpad-key" data-key="0">0</div>
        <div class="numpad-key" data-key="backspace" style="color: var(--expense);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
        </div>
      </div>

      <!-- Instant Confirm Save Button -->
      <button id="numpad-submit-btn" style="width: 100%; height: 50px; border-radius: var(--radius-xl); background: var(--expense); color: #fff; font-size: 15px; font-weight: 900; border: none; cursor: pointer; box-shadow: 0 4px 16px rgba(251, 113, 133, 0.35); display: flex; align-items: center; justify-content: center; gap: 8px; transition: transform 0.12s ease;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span>${isEn ? "Record Expense" : "บันทึกรายจ่าย"}</span>
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  const displayAmount = modal.querySelector("#numpad-display-amount");
  const catLabelEl = modal.querySelector("#numpad-cat-label");
  const submitBtn = modal.querySelector("#numpad-submit-btn");

  const updateDisplay = () => {
    const amtNum = parseFloat(currentAmountStr) || 0;
    displayAmount.textContent = `${sym}${currentAmountStr}`;
    displayAmount.style.color = isIncome ? 'var(--income)' : 'var(--expense)';
    submitBtn.style.background = isIncome ? 'var(--income)' : 'var(--expense)';
    submitBtn.style.boxShadow = isIncome ? '0 4px 16px rgba(52, 211, 153, 0.35)' : '0 4px 16px rgba(251, 113, 133, 0.35)';
    submitBtn.querySelector('span').textContent = isIncome 
      ? (isEn ? "Record Income" : "บันทึกรายรับ") 
      : (isEn ? "Record Expense" : "บันทึกรายจ่าย");
  };

  // Switch type (expense vs income)
  modal.querySelector("#numpad-type-expense").onclick = () => {
    isIncome = false;
    modal.querySelector("#numpad-type-expense").style.background = 'var(--card)';
    modal.querySelector("#numpad-type-expense").style.color = 'var(--expense)';
    modal.querySelector("#numpad-type-income").style.background = 'transparent';
    modal.querySelector("#numpad-type-income").style.color = 'var(--text-secondary)';
    renderCatPills(getExpenseCategories());
    updateDisplay();
  };

  modal.querySelector("#numpad-type-income").onclick = () => {
    isIncome = true;
    modal.querySelector("#numpad-type-income").style.background = 'var(--card)';
    modal.querySelector("#numpad-type-income").style.color = 'var(--income)';
    modal.querySelector("#numpad-type-expense").style.background = 'transparent';
    modal.querySelector("#numpad-type-expense").style.color = 'var(--text-secondary)';
    renderCatPills(getIncomeCategories());
    updateDisplay();
  };

  const renderCatPills = (catList) => {
    const listEl = modal.querySelector("#numpad-category-list");
    if (!catList.some(c => c.name === selectedCategory)) {
      selectedCategory = catList[0]?.name || "Food";
    }
    listEl.innerHTML = catList.map((c) => `
      <div class="numpad-cat-pill ${c.name === selectedCategory ? 'active' : ''}" data-cat-id="${c.name}" data-cat-label="${c.label}">
        <span style="width: 7px; height: 7px; border-radius: 50%; background: ${c.color};"></span>
        <span>${c.label}</span>
      </div>
    `).join('');

    listEl.querySelectorAll('.numpad-cat-pill').forEach(pill => {
      pill.onclick = () => {
        listEl.querySelectorAll('.numpad-cat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        selectedCategory = pill.getAttribute('data-cat-id');
        catLabelEl.textContent = pill.getAttribute('data-cat-label');
      };
    });
  };
  renderCatPills(categories);

  // Keypad click handlers
  modal.querySelectorAll(".numpad-key").forEach(k => {
    k.onclick = () => {
      const val = k.getAttribute("data-key");
      if (val === "backspace") {
        currentAmountStr = currentAmountStr.length > 1 ? currentAmountStr.slice(0, -1) : "0";
      } else if (val === ".") {
        if (!currentAmountStr.includes(".")) {
          currentAmountStr += ".";
        }
      } else {
        if (currentAmountStr === "0") {
          currentAmountStr = val;
        } else {
          // Limit to 2 decimal places if dot present
          if (currentAmountStr.includes(".") && currentAmountStr.split(".")[1].length >= 2) return;
          currentAmountStr += val;
        }
      }
      updateDisplay();
    };
  });

  // Preset button handlers
  modal.querySelectorAll(".preset-amt-btn").forEach(btn => {
    btn.onclick = () => {
      const addAmt = parseFloat(btn.getAttribute("data-amt")) || 0;
      const current = parseFloat(currentAmountStr) || 0;
      currentAmountStr = String(current + addAmt);
      updateDisplay();
    };
  });

  // Wallet select handler
  modal.querySelector("#numpad-wallet-select").onchange = (e) => {
    selectedWalletId = e.target.value;
    const w = wallets.find(x => x.id === selectedWalletId);
    if (w) modal.querySelector("#numpad-wallet-label").textContent = w.name;
  };

  const close = () => modal.remove();
  modal.querySelectorAll(".modal-close-btn").forEach(b => (b.onclick = close));
  modal.onclick = (e) => { if (e.target === modal) close(); };

  // Submit Handler
  submitBtn.onclick = () => {
    const finalAmt = parseFloat(currentAmountStr);
    if (isNaN(finalAmt) || finalAmt <= 0) {
      alerts.error(isEn ? "Please enter an amount > 0" : "กรุณาระบุจำนวนเงินที่มากกว่า 0");
      return;
    }

    const catObj = (isIncome ? getIncomeCategories() : getExpenseCategories()).find(c => c.name === selectedCategory);
    const title = catObj?.label || selectedCategory;

    store.addTransaction({
      title,
      amount: finalAmt,
      isIncome,
      category: selectedCategory,
      walletId: selectedWalletId,
      date: new Date()
    });

    close();
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
    alerts.success(
      isEn ? "Recorded in 2s!" : "บันทึกสำเร็จทันใจ!",
      `${title}: ${sym}${finalAmt.toLocaleString()}`
    );

    if (onSuccessCallback) onSuccessCallback();
  };
}
