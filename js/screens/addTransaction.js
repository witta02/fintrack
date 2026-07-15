import { store } from "../store.js";
import { router } from "../router.js";
import {
  getExpenseCategories,
  getIncomeCategories,
  getCategoryInfo,
} from "../categories.js";
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
    // Reset defaults for a new transaction
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

  // Format transaction date to YYYY-MM-DDThh:mm for datetime-local input
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
    <div class="screen-header" style="display: flex; align-items: center; justify-content: space-between;">
      <h1 class="brand-title">${titleText}</h1>
      <div style="display: flex; align-items: center; gap: 8px;">
        ${
          !editingTransactionId
            ? `
          <button id="scan-receipt-btn" type="button" class="icon-btn" title="สแกนใบเสร็จเพิ่มรายจ่าย" style="color: var(--gold); border: 1px solid var(--border); border-radius: 12px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: var(--surface);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
          </button>
        `
            : ""
        }
        <button id="cancel-btn" class="icon-btn" title="${t("cancel")}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>

    <!-- Hidden file input -->
    <input type="file" id="scan-receipt-file-input" accept="image/*" class="hidden" />

    <!-- Scanning Spinner -->
    <div id="ocr-spinner-overlay" class="scanning-overlay hidden" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 200;">
      <div class="scanning-dialog" style="background: #1C2128; border: 1px solid var(--border); border-radius: 16px; padding: 24px; text-align: center; max-width: 280px; color: white; font-family: sans-serif;">
        <div class="scan-spinner" style="width: 48px; height: 48px; border: 3px solid rgba(255, 184, 0, 0.2); border-top-color: var(--gold); border-radius: 50%; animation: spin 1s infinite linear; margin: 0 auto 16px auto;"></div>
        <h4 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: white;">ระบบกำลังอ่านและวิเคราะห์บิล...</h4>
        <p style="margin: 0; font-size: 11px; opacity: 0.6; color: #9CA3AF;">ระบบดึงราคาและชื่อร้านค้ากำลังทำงาน</p>
      </div>
    </div>

    <form id="transaction-form" class="transaction-form">
      <!-- Income/Expense Selector -->
      <div class="form-group" style="margin-bottom: 20px;">
        <div class="type-switcher">
          <button type="button" class="type-btn expense-btn ${!isIncome ? "active" : ""}" id="switch-expense">${t("expense")}</button>
          <button type="button" class="type-btn income-btn ${isIncome ? "active" : ""}" id="switch-income">${t("income")}</button>
        </div>
      </div>

      <!-- Amount Input -->
      <div class="form-group">
        <label class="form-label" for="amount">${t("amount")} (${store.getCurrencySymbol()})</label>
        <input 
          type="number" 
          step="0.01" 
          id="amount" 
          placeholder="0.00" 
          required 
          class="form-control amount-input-field" 
          value="${displayAmount}"
          style="font-size: 24px; font-weight: 700; text-align: center;"
        />
      </div>

      <!-- Title Input -->
      <div class="form-group">
        <label class="form-label" for="title">${t("title")}</label>
        <input 
          type="text" 
          id="title" 
          placeholder="เช่น ค่าอาหารกลางวัน, เงินเดือน" 
          required 
          class="form-control" 
          value="${escapeHTML(displayTitle)}"
        />
      </div>

      <!-- Date Input -->
      <div class="form-group">
        <label class="form-label" for="date">${t("dateTime")}</label>
        <input 
          type="datetime-local" 
          id="date" 
          required 
          class="form-control" 
          value="${formattedDate}"
        />
      </div>

      <!-- Category Selector -->
      <div class="form-group">
        <label class="form-label">${t("category")}</label>
        <div id="category-selector-container" class="category-grid-selector">
          <!-- Rendered dynamically -->
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="margin-top: 32px; display: flex; flex-direction: column; gap: 12px;">
        <button type="submit" class="btn-primary" style="padding: 14px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ${t("saveTransaction")}
        </button>
        
        ${
          editingTransactionId
            ? `
          <button type="button" id="delete-trans-btn" class="btn" style="background: rgba(248, 81, 73, 0.1); color: #F85149; border: 1px solid rgba(248, 81, 73, 0.2); padding: 12px; border-radius: var(--radius-lg); font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            ${t("deleteThis")}
          </button>
        `
            : ""
        }
      </div>
  `;

  // Initial category picker setup
  renderCategoryPicker(container);

  // Setup form submit & click event listeners
  setupFormListeners(container);
}

function renderCategoryPicker(container) {
  const catContainer = container.querySelector("#category-selector-container");
  catContainer.innerHTML = "";

  const list = isIncome ? getIncomeCategories() : getExpenseCategories();

  // Make sure the selectedCategory fits the list, if not reset to the first option
  if (!list.some((c) => c.name === selectedCategory)) {
    selectedCategory = list[0].name;
  }

  list.forEach((cat) => {
    const info = getCategoryInfo(cat.name);
    const isSelected = cat.name === selectedCategory;

    const item = document.createElement("div");
    item.className = `category-picker-item ${isSelected ? "selected" : ""}`;

    // Style when selected vs unselected
    if (isSelected) {
      item.style.borderColor = info.color;
      item.style.background = `${info.color}15`;
      item.style.color = info.color;
    }

    item.innerHTML = `
      <div class="category-picker-icon" style="background: ${info.color}15; color: ${info.color};">
        <span style="display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">${info.svg}</span>
      </div>
      <div class="category-picker-label">${info.label}</div>
    `;

    item.addEventListener("click", () => {
      selectedCategory = cat.name;
      renderCategoryPicker(container); // Re-render to update classes
    });

    catContainer.appendChild(item);
  });

  // Add "+" tile for custom categories
  const addTile = document.createElement("div");
  addTile.className = `category-picker-item`;
  addTile.innerHTML = `
    <div class="category-picker-icon" style="background: var(--surface); color: var(--text-secondary); border: 1.5px dashed var(--border);">
      <span style="display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </span>
    </div>
    <div class="category-picker-label">${store.settings.language === 'en' ? 'Add' : 'เพิ่ม'}</div>
  `;
  addTile.addEventListener("click", () => {
    router.navigate('settings');
  });
  catContainer.appendChild(addTile);
}

function setupFormListeners(container) {
  const form = container.querySelector("#transaction-form");

  // Toggle Expense / Income buttons
  const expBtn = container.querySelector("#switch-expense");
  const incBtn = container.querySelector("#switch-income");

  incBtn.addEventListener("click", () => {
    if (isIncome) return; // Already income
    isIncome = true;
    incBtn.classList.add("active");
    expBtn.classList.remove("active");
    selectedCategory = "Salary";
    renderCategoryPicker(container);
  });

  expBtn.addEventListener("click", () => {
    if (!isIncome) return; // Already expense
    isIncome = false;
    expBtn.classList.add("active");
    incBtn.classList.remove("active");
    selectedCategory = "Food";
    renderCategoryPicker(container);
  });

  // Cancel Button
  container.querySelector("#cancel-btn").addEventListener("click", () => {
    router.navigate("dashboard");
  });

  // Scan Receipt Action
  const scanBtn = container.querySelector("#scan-receipt-btn");
  const fileInput = container.querySelector("#scan-receipt-file-input");

  if (scanBtn && fileInput) {
    scanBtn.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) {
        const spinner = container.querySelector("#ocr-spinner-overlay");
        const statusSubtitle =
          container.querySelector("#ocr-spinner-overlay p") || spinner;
        spinner.classList.remove("hidden");

        try {
          // 1. Try local QR scanner first
          const qrData = await scanImageQR(file);
          if (qrData) {
            const parsed = parseSlipQR(qrData);
            if (parsed) {
              // Pre-fill form fields
              container.querySelector("#title").value = parsed.title;
              if (parsed.amount) {
                container.querySelector("#amount").value =
                  parsed.amount.toFixed(2);
              } else {
                // Try to extract amount from the slip using OCR
                try {
                  const originalText = statusSubtitle.textContent;
                  if (statusSubtitle) {
                    statusSubtitle.textContent =
                      store.settings.language === "en"
                        ? "Reading transaction amount from slip..."
                        : "กำลังอ่านยอดเงินจากสลิป...";
                  }

                  const rawText = await runLocalOCR(file, (msg) => {
                    if (statusSubtitle) statusSubtitle.textContent = msg;
                  });

                  if (statusSubtitle) statusSubtitle.textContent = originalText;

                  const extractedAmount = parseBankSlipAmount(rawText);
                  if (extractedAmount) {
                    container.querySelector("#amount").value =
                      extractedAmount.toFixed(2);
                  } else {
                    setTimeout(
                      () => container.querySelector("#amount").focus(),
                      150,
                    );
                  }
                } catch (ocrErr) {
                  console.error(
                    "Failed to read amount from slip via OCR:",
                    ocrErr,
                  );
                  setTimeout(
                    () => container.querySelector("#amount").focus(),
                    150,
                  );
                }
              }
              if (parsed.date) {
                container.querySelector("#date").value = parsed.date;
              }

              // Automatically set category and active switcher
              selectedCategory = "Other";
              isIncome = false; // standard transfer is expense
              container
                .querySelector("#switch-expense")
                .classList.add("active");
              container
                .querySelector("#switch-income")
                .classList.remove("active");
              renderCategoryPicker(container);

              alerts.success(
                store.settings.language === "en"
                  ? `QR scan done — nice!`
                  : `สแกน QR เสร็จแล้ว เรื่ด!`,
                parsed.title,
              );

              spinner.classList.add("hidden");
              return;
            }
          }
        } catch (qrErr) {
          console.error("Local QR Scan failed, falling back to OCR:", qrErr);
        }

        // 2. Fallback to Local OCR scanner
        try {
          const originalText = statusSubtitle.textContent;
          const rawText = await runLocalOCR(file, (msg) => {
            if (statusSubtitle) statusSubtitle.textContent = msg;
          });

          if (statusSubtitle) statusSubtitle.textContent = originalText;

          if (detectIfBankSlip(rawText)) {
            // It's a bank/e-wallet slip without a QR code
            const payeeName = parseBankSlipReceiver(rawText);
            const amountVal = parseBankSlipAmount(rawText);

            container.querySelector("#title").value = payeeName;
            if (amountVal) {
              container.querySelector("#amount").value = amountVal.toFixed(2);
            } else {
              setTimeout(() => container.querySelector("#amount").focus(), 150);
            }

            selectedCategory = guessCategory(rawText, payeeName);
            isIncome = false;

            container.querySelector("#switch-expense").classList.add("active");
            container
              .querySelector("#switch-income")
              .classList.remove("active");
            renderCategoryPicker(container);

            alerts.success(
              store.settings.language === "en"
                ? `Slip scanned — nice!`
                : `สแกนสลิปเสร็จแล้ว เรื่ด!`,
              payeeName,
            );
          } else {
            // It's a regular itemized receipt
            const parsed = parseReceiptText(rawText);

            // Pre-fill form fields
            container.querySelector("#title").value = parsed.payee || "ร้านค้า";
            if (parsed.total > 0) {
              container.querySelector("#amount").value =
                parsed.total.toFixed(2);
            } else {
              setTimeout(() => container.querySelector("#amount").focus(), 150);
            }

            // Guess category
            selectedCategory = guessCategory(rawText, parsed.payee);
            isIncome = false; // receipts are typically expense

            container.querySelector("#switch-expense").classList.add("active");
            container
              .querySelector("#switch-income")
              .classList.remove("active");
            renderCategoryPicker(container);

            alerts.success(
              store.settings.language === "en"
              ? `Receipt scanned — nice!`
              : `สแกนใบเสร็จเสร็จแล้ว เรื่ด!`,
              parsed.payee,
            );
          }
        } catch (ocrErr) {
          console.error("Local OCR failed:", ocrErr);
          alerts.error(
            store.settings.language === "en"
              ? "No valid QR code or receipt text could be recognized."
              : "ไม่พบ QR Code หรือข้อมูลบิลที่ถูกต้องบนรูปภาพนี้",
          );
        } finally {
          spinner.classList.add("hidden");
        }
      }
    });
  }

  // Delete transaction button (if editing)
  const delBtn = container.querySelector("#delete-trans-btn");
  if (delBtn) {
    delBtn.addEventListener("click", async () => {
      const isConfirmed = await alerts.confirmDelete(
        store.settings.language === "en"
          ? "Delete Transaction?"
          : "ต้องการลบรายการใช่หรือไม่?",
        t("deleteConfirm"),
      );
      if (isConfirmed) {
        store.deleteTransaction(editingTransactionId);
        router.navigate("dashboard");
      }
    });
  }

  // Handle Form Submission
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const titleVal = container.querySelector("#title").value;
    const amountVal = parseFloat(container.querySelector("#amount").value);
    const dateVal = new Date(container.querySelector("#date").value);

    if (isNaN(amountVal) || amountVal <= 0) {
      alerts.warning(
        store.settings.language === "en"
          ? "Please enter a valid amount"
          : "กรุณากรอกจำนวนเงินให้ถูกต้อง",
      );
      return;
    }

    // Convert display currency amount back to base THB currency amount
    const thbAmount =
      store.settings.selectedCurrency === "THB"
        ? amountVal
        : amountVal / store.toDisplay(1.0); // Simple base-rate scale conversion

    if (editingTransactionId) {
      // Update
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
        recurringId: oldTrans ? oldTrans.recurringId : null,
      });
    } else {
      // Add
      store.addTransaction({
        title: titleVal,
        amount: thbAmount,
        isIncome: isIncome,
        category: selectedCategory,
        date: dateVal,
      });


      showCoinAnimation();
    }

    // Navigate back after a slight delay to allow animation to start
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

  // Helper to parse TLV
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

  // Detect if it is a Slip Verification QR (Mini QR)
  if (outerTags["00"] && outerTags["00"].length > 10) {
    const subTags = parseTLV(outerTags["00"]);
    const sendingBankCode = subTags["01"] || "";
    const ref = subTags["02"] || "";
    const amountVal = subTags["04"] ? parseFloat(subTags["04"]) : null;

    // Map bank code to name
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
    const bankName = bankMap[sendingBankCode] || "ธนาคาร";

    // Parse date from ref (YYYYMMDDHHmm)
    let parsedDate = "";
    if (ref.length >= 12) {
      const match = ref.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);
      if (match) {
        parsedDate = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`;
      }
    }

    return {
      type: "slip",
      title: `โอนเงินผ่าน${bankName}`,
      amount: amountVal,
      date: parsedDate,
      bankCode: sendingBankCode,
      ref: ref,
    };
  }

  // Detect if it is a Payment PromptPay QR
  if (outerTags["29"] || outerTags["30"]) {
    const amountVal = outerTags["54"] ? parseFloat(outerTags["54"]) : null;
    return {
      type: "payment",
      title: "สแกนจ่ายพร้อมเพย์",
      amount: amountVal,
      date: "",
      ref: "",
    };
  }

  return null;
}
