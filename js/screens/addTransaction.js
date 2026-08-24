import { store } from "../store.js";
import { router } from "../router.js";
import {
  getExpenseCategories,
  getIncomeCategories,
  getCategoryInfo,
} from "../categories.js";
import { showCustomCategoryModal } from "../components/customCategoryModal.js";
import { t } from "../i18n.js";
import jsQR from "jsqr";
import {
  runLocalOCR,
  parseReceiptText,
  guessCategory,
  parseBankSlipAmount,
  detectIfBankSlip,
  parseBankSlipReceiver,
} from "../utils/ocrParser.js";
import { alerts } from "../utils/alertHelper.js";

let isIncome = false; // default to Expense
let selectedCategory = "Food";
let editingTransactionId = null;

export function renderAddTransaction(container, params) {
  editingTransactionId = params?.transactionId || null;
  let transaction = null;

  if (editingTransactionId) {
    transaction = store
      .getAllTransactions()
      .find((t) => t.id === editingTransactionId);
    if (transaction) {
      isIncome = transaction.isIncome;
      selectedCategory = transaction.category;
    }
  } else {
    isIncome = false;
    selectedCategory = "Food";
  }

  const titleText = editingTransactionId
    ? t("editTransactionTitle")
    : t("addTransactionTitle");
  const displayAmount = transaction
    ? store.toDisplay(transaction.amount).toFixed(2)
    : "";
  const displayTitle = transaction ? transaction.title : "";

  let formattedDate = "";
  if (transaction && transaction.date) {
    const d = new Date(transaction.date);
    const pad = (num) => String(num).padStart(2, "0");
    formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } else {
    const d = new Date();
    const pad = (num) => String(num).padStart(2, "0");
    formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  container.innerHTML = `
    <div class="screen screen-enter" style="padding: 0 16px 24px;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0 16px;">
        <button id="cancel-btn" class="icon-btn" title="${t("cancel")}" style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: var(--text-primary);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h1 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0;">${titleText}</h1>
        <div>
          ${
            !editingTransactionId
              ? `
            <button id="scan-receipt-btn" type="button" class="icon-btn" title="${t("scanReceiptTitle")}" style="color: var(--gold); border: 1px solid var(--border); border-radius: 12px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: var(--surface);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            </button>
          `
              : `<div style="width:40px;"></div>`
          }
        </div>
      </div>

      <!-- Hidden file input for scanner -->
      <input type="file" id="scan-receipt-file-input" accept="image/*" class="hidden" />

      <!-- Scanning Spinner Overlay -->
      <div id="ocr-spinner-overlay" class="scanning-overlay hidden" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.75); display: flex; align-items: center; justify-content: center; z-index: 200; backdrop-filter: blur(8px);">
        <div class="scanning-dialog" style="background: var(--card-solid); border: 1px solid var(--border); border-radius: 20px; padding: 28px; text-align: center; max-width: 290px; color: white;">
          <div class="scan-spinner" style="width: 48px; height: 48px; border: 3px solid rgba(245, 200, 66, 0.2); border-top-color: var(--gold); border-radius: 50%; animation: spin 1s infinite linear; margin: 0 auto 16px auto;"></div>
          <h4 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: white;">${t("scanningOcrTitle")}</h4>
          <p style="margin: 0; font-size: 12px; color: var(--text-secondary);">${t("scanningOcrSubtitle")}</p>
        </div>
      </div>

      <form id="transaction-form" class="transaction-form">
        <!-- Type Switcher Tabs (Spendee style) -->
        <div class="add-tx-type-tabs">
          <button type="button" class="add-tx-tab ${!isIncome ? "active expense" : ""}" id="switch-expense">${t("expense")}</button>
          <button type="button" class="add-tx-tab ${isIncome ? "active income" : ""}" id="switch-income">${t("income")}</button>
        </div>

        <!-- Big Amount Card -->
        <div style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 20px 16px; margin-bottom: 20px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); margin-bottom: 8px;">
            ${t("amount")} (${store.getCurrencySymbol()})
          </div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
            <span style="font-size: 28px; font-weight: 800; color: var(--text-secondary);">${store.getCurrencySymbol()}</span>
            <input 
              type="number" 
              step="0.01" 
              inputmode="decimal"
              id="amount" 
              placeholder="0.00" 
              required 
              autofocus
              class="amount-input-field" 
              value="${displayAmount}"
              style="font-size: 40px; font-weight: 900; text-align: left; background: transparent; border: none; outline: none; width: 220px; color: var(--text-primary); font-family: var(--font-heading);"
            />
          </div>
        </div>

        <!-- Title / Note -->
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">${t("title")}</label>
          <input 
            type="text" 
            id="title" 
            placeholder="${t("titlePlaceholder")}" 
            value="${escapeHTML(displayTitle)}"
            style="width: 100%; padding: 12px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); font-size: 14px; color: var(--text-primary);"
          />
        </div>

        <!-- Wallet & Date Row -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
          <div>
            <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">${store.settings.language === 'en' ? 'Wallet' : 'กระเป๋าเงิน'}</label>
            <select id="transaction-wallet-select" style="width: 100%; padding: 12px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); font-size: 13px; color: var(--text-primary);">
              ${store.getWallets().map(w => `<option value="${w.id}" ${transaction?.walletId === w.id ? 'selected' : ''}>${w.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 6px;">${t("dateTime")}</label>
            <input 
              type="datetime-local" 
              id="date" 
              required 
              value="${formattedDate}"
              style="width: 100%; padding: 12px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); font-size: 13px; color: var(--text-primary);"
            />
          </div>
        </div>

        <!-- Category Grid -->
        <div style="margin-bottom: 24px;">
          <label style="display: block; font-size: 12px; font-weight: 700; color: var(--text-secondary); margin-bottom: 10px;">${t("category")}</label>
          <div id="category-selector-container" class="category-grid-30">
            <!-- Rendered dynamically -->
          </div>
        </div>

        <!-- Submit & Delete Buttons -->
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button type="submit" class="btn-primary" style="width: 100%; padding: 16px; font-size: 15px; font-weight: 800; border-radius: var(--radius-lg); background: linear-gradient(135deg, var(--gold), var(--amber)); color: #000; border: none; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: var(--shadow-gold);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ${t("saveTransaction")}
          </button>
          
          ${
            editingTransactionId
              ? `
            <button type="button" id="delete-trans-btn" style="width: 100%; padding: 14px; background: rgba(248, 81, 73, 0.1); color: #F85149; border: 1px solid rgba(248, 81, 73, 0.25); border-radius: var(--radius-lg); font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              ${t("deleteThis")}
            </button>
          `
              : ""
          }
        </div>
      </form>
    </div>
  `;

  renderCategoryPicker(container);
  setupFormListeners(container);
}

function renderCategoryPicker(container) {
  const catContainer = container.querySelector("#category-selector-container");
  if (!catContainer) return;
  catContainer.innerHTML = "";

  const list = isIncome ? getIncomeCategories() : getExpenseCategories();

  if (!list.some((c) => c.name === selectedCategory)) {
    selectedCategory = list[0]?.name || "Other";
  }

  list.forEach((cat) => {
    const info = getCategoryInfo(cat.name);
    const isSelected = cat.name === selectedCategory;

    const item = document.createElement("div");
    item.className = `category-grid-item ${isSelected ? "selected" : ""}`;
    if (isSelected) {
      item.style.borderColor = info.color;
      item.style.background = `${info.color}18`;
    }

    item.innerHTML = `
      <div style="width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: ${info.color}20; color: ${info.color}; font-size: 18px;">
        ${info.svg ? `<span style="display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;">${info.svg}</span>` : '📦'}
      </div>
      <div class="category-grid-label" style="${isSelected ? `color: ${info.color}; font-weight: 800;` : ''}">${info.label}</div>
    `;

    item.addEventListener("click", () => {
      selectedCategory = cat.name;
      renderCategoryPicker(container);
    });

    catContainer.appendChild(item);
  });

  // Custom Category Tile
  const addTile = document.createElement("div");
  addTile.className = `category-grid-item`;
  addTile.innerHTML = `
    <div style="width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: var(--surface); color: var(--text-secondary); border: 1.5px dashed var(--border);">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </div>
    <div class="category-grid-label">${store.settings.language === 'en' ? 'Add' : 'เพิ่ม'}</div>
  `;
  addTile.addEventListener("click", () => {
    showCustomCategoryModal(() => {
      renderCategoryPicker(container);
    });
  });
  catContainer.appendChild(addTile);
}

function setupFormListeners(container) {
  const form = container.querySelector("#transaction-form");
  const expBtn = container.querySelector("#switch-expense");
  const incBtn = container.querySelector("#switch-income");

  incBtn?.addEventListener("click", () => {
    if (isIncome) return;
    isIncome = true;
    incBtn.classList.add("active", "income");
    expBtn.classList.remove("active", "expense");
    selectedCategory = "Salary";
    renderCategoryPicker(container);
  });

  expBtn?.addEventListener("click", () => {
    if (!isIncome) return;
    isIncome = false;
    expBtn.classList.add("active", "expense");
    incBtn.classList.remove("active", "income");
    selectedCategory = "Food";
    renderCategoryPicker(container);
  });

  container.querySelector("#cancel-btn")?.addEventListener("click", () => {
    router.navigate("dashboard");
  });

  const scanBtn = container.querySelector("#scan-receipt-btn");
  const fileInput = container.querySelector("#scan-receipt-file-input");

  if (scanBtn && fileInput) {
    scanBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) {
        const spinner = container.querySelector("#ocr-spinner-overlay");
        const statusSubtitle = container.querySelector("#ocr-spinner-overlay p") || spinner;
        spinner?.classList.remove("hidden");

        try {
          const qrData = await scanImageQR(file);
          if (qrData) {
            const parsed = parseSlipQR(qrData);
            if (parsed) {
              const titleEl = container.querySelector("#title");
              const amtEl = container.querySelector("#amount");
              const dateEl = container.querySelector("#date");
              if (titleEl) titleEl.value = parsed.title;
              if (amtEl && parsed.amount) amtEl.value = parsed.amount.toFixed(2);
              if (dateEl && parsed.date) dateEl.value = parsed.date;

              selectedCategory = "Other";
              isIncome = false;
              expBtn?.classList.add("active", "expense");
              incBtn?.classList.remove("active", "income");
              renderCategoryPicker(container);

              alerts.success(
                store.settings.language === "en" ? `QR scan done!` : `สแกน QR เสร็จแล้ว!`,
                parsed.title,
              );
              spinner?.classList.add("hidden");
              return;
            }
          }
        } catch (qrErr) {
          console.error("Local QR Scan failed, falling back to OCR:", qrErr);
        }

        try {
          const rawText = await runLocalOCR(file, (msg) => {
            if (statusSubtitle) statusSubtitle.textContent = msg;
          });

          if (detectIfBankSlip(rawText)) {
            const payeeName = parseBankSlipReceiver(rawText);
            const amountVal = parseBankSlipAmount(rawText);
            const titleEl = container.querySelector("#title");
            const amtEl = container.querySelector("#amount");
            if (titleEl) titleEl.value = payeeName;
            if (amtEl && amountVal) amtEl.value = amountVal.toFixed(2);

            selectedCategory = guessCategory(rawText, payeeName);
            isIncome = false;
            expBtn?.classList.add("active", "expense");
            incBtn?.classList.remove("active", "income");
            renderCategoryPicker(container);

            alerts.success(
              store.settings.language === "en" ? `Slip scanned!` : `สแกนสลิปเสร็จแล้ว!`,
              payeeName,
            );
          } else {
            const parsed = parseReceiptText(rawText);
            const titleEl = container.querySelector("#title");
            const amtEl = container.querySelector("#amount");
            if (titleEl) titleEl.value = parsed.payee || t("merchantFallback");
            if (amtEl && parsed.total > 0) amtEl.value = parsed.total.toFixed(2);

            selectedCategory = guessCategory(rawText, parsed.payee);
            isIncome = false;
            expBtn?.classList.add("active", "expense");
            incBtn?.classList.remove("active", "income");
            renderCategoryPicker(container);

            alerts.success(t("receiptScannedSuccess"), parsed.payee);
          }
        } catch (ocrErr) {
          console.error("Local OCR failed:", ocrErr);
          alerts.error(t("noQrOrReceiptFound"));
        } finally {
          spinner?.classList.add("hidden");
        }
      }
    });
  }

  const delBtn = container.querySelector("#delete-trans-btn");
  if (delBtn) {
    delBtn.addEventListener("click", async () => {
      const isConfirmed = await alerts.confirmDelete(
        t("deleteTransactionConfirm"),
        t("deleteConfirm"),
      );
      if (isConfirmed) {
        store.deleteTransaction(editingTransactionId);
        router.navigate("dashboard");
      }
    });
  }

  form?.addEventListener("submit", (e) => {
    e.preventDefault();

    let rawTitle = container.querySelector("#title")?.value?.trim() || "";
    if (!rawTitle) {
      const catInfo = getCategoryInfo(selectedCategory);
      rawTitle = catInfo ? catInfo.label : selectedCategory;
    }
    const titleVal = rawTitle;
    const amountVal = parseFloat(container.querySelector("#amount")?.value || "0");
    const rawDate = container.querySelector("#date")?.value;
    const parsedDate = rawDate ? new Date(rawDate) : new Date();
    const dateVal = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    if (isNaN(amountVal) || amountVal <= 0) {
      alerts.warning(t("validAmountWarning"));
      return;
    }

    const thbAmount = store.toBase(amountVal);
    const walletVal = container.querySelector("#transaction-wallet-select")?.value || "default";

    if (editingTransactionId) {
      const oldTrans = store
        .getAllTransactions()
        .find((t) => t.id === editingTransactionId);
      store.updateTransaction({
        id: editingTransactionId,
        title: titleVal,
        amount: thbAmount,
        isIncome: isIncome,
        category: selectedCategory,
        date: dateVal,
        walletId: walletVal,
        recurringId: oldTrans ? oldTrans.recurringId : null,
      });
    } else {
      store.addTransaction({
        title: titleVal,
        amount: thbAmount,
        isIncome: isIncome,
        category: selectedCategory,
        date: dateVal,
        walletId: walletVal,
      });
      showCoinAnimation();
    }

    setTimeout(() => {
      router.navigate("dashboard");
    }, 150);
  });
}

function showCoinAnimation() {
  const container = document.createElement('div');
  container.className = 'coin-animation-container';
  container.innerHTML = '<div class="coin-3d">฿</div>';
  document.body.appendChild(container);
  
  setTimeout(() => {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }, 1500);
}

function escapeHTML(str) {
  return str.replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[tag] || tag,
  );
}

function scanImageQR(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height);
          resolve(code ? code.data : null);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (err) => reject(err);
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function parseSlipQR(qrData) {
  if (!qrData.startsWith("00")) return null;

  const parseTLV = (s) => {
    const res = {};
    let idx = 0;
    while (idx < s.length) {
      const tag = s.substr(idx, 2);
      const len = parseInt(s.substr(idx + 2, 2));
      if (isNaN(len)) break;
      const val = s.substr(idx + 4, len);
      res[tag] = val;
      idx += 4 + len;
    }
    return res;
  };

  const outerTags = parseTLV(qrData);

  if (outerTags["00"] && outerTags["00"].length > 10) {
    const subTags = parseTLV(outerTags["00"]);
    const sendingBankCode = subTags["01"] || "";
    const ref = subTags["02"] || "";
    const amountVal = subTags["04"] ? parseFloat(subTags["04"]) : null;

    const bankMap = {
      "002": "ธนาคารกรุงเทพ",
      "004": "ธนาคารกสิกรไทย",
      "006": "ธนาคารกรุงไทย",
      "011": "ธนาคารทหารไทยธนชาต",
      "014": "ธนาคารไทยพาณิชย์",
      "025": "ธนาคารกรุงศรีอยุธยา",
      "030": "ธนาคารออมสิน",
      "034": "ธ.ก.ส.",
      "065": "ธนาคารอาคารสงเคราะห์",
      "073": "ธนาคารแลนด์ แอนด์ เฮ้าส์",
    };
    const bankName = bankMap[sendingBankCode] || t("bankFallback");

    let parsedDate = "";
    if (ref.length >= 12) {
      const match = ref.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);
      if (match) {
        parsedDate = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`;
      }
    }

    return {
      type: "slip",
      title: t("transferViaBank", { bank: bankName }),
      amount: amountVal,
      date: parsedDate,
      bankCode: sendingBankCode,
      ref: ref,
    };
  }

  if (outerTags["29"] || outerTags["30"]) {
    const amountVal = outerTags["54"] ? parseFloat(outerTags["54"]) : null;
    return {
      type: "payment",
      title: t("promptPayPayment"),
      amount: amountVal,
      date: "",
      ref: "",
    };
  }

  return null;
}
