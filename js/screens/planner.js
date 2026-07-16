import { store } from "../store.js";
import { getCategoryInfo } from "../categories.js";
import { t } from "../i18n.js";
import { alerts } from "../utils/alertHelper.js";

let messages = [
  {
    id: "init-msg",
    isUser: false,
    text: `สวัสดีค่ะ! Finny ยินดีรับใช้ค่ะ 👋
    นี่คือตัวอย่างรายการที่ Finny ทำได้ค่ะ
• บันทึกรายรายการเดี่ยว หรือหลายรายการพร้อมกัน เช่น:
  - "กินข้าว 150 ค่าแท็กซี่ 80"
  - "เมื่อวาน ช็อปปิ้ง 1200 และได้เงินคืน 200"
• สรุปและวิเคราะห์เงิน เช่น "วิเคราะห์" หรือ "สรุป"
• วางแผนแบ่งเงิน 50/30/20 เช่น "แบ่งเงิน 30000"
• วางแผนเงินสำรอง เช่น "คำนวณเงินสำรองฉุกเฉิน"
• วางแผนใช้เงิน เช่น "มี 5000 ใช้ 20 วัน"
• วางแผนลงทุนทบต้น เช่น "ลงทุน 50000 ดอกเบี้ย 7% นาน 15 ปี"

ลองพิมพ์เป้าหมาย รายการ หรือหัวข้อที่ต้องการได้เลยค่ะ`,
  },
];

let renderedCount = 0;

export function renderPlanner(container) {
  renderedCount = 0; // Reset counter to redraw chat history upon screen load

  container.innerHTML = `
    <style>
      .chat-bubble.planner {
        position: relative;
        padding-right: 32px !important;
      }
      .chat-bubble.planner:hover .copy-bubble-btn {
        opacity: 1;
      }
      .copy-bubble-btn {
        position: absolute; 
        right: 8px; 
        top: 8px; 
        background: none; 
        border: none;
        color: var(--text-secondary); 
        cursor: pointer; 
        opacity: 0; 
        transition: opacity 0.2s, color 0.2s, background-color 0.2s;
        padding: 4px; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        border-radius: 6px;
      }
      .copy-bubble-btn:hover {
        color: var(--gold) !important;
        background: rgba(255, 184, 0, 0.08) !important;
      }
      .chat-suggestions::-webkit-scrollbar {
        height: 4px;
      }
      .chat-suggestions::-webkit-scrollbar-thumb {
        background: var(--border);
        border-radius: 2px;
      }
      .chat-transaction-notice {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        transition: opacity 0.3s ease;
      }
    </style>

    <div class="chat-container">
      <!-- Header -->
      <div class="chat-header">
        <div class="chat-avatar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
        </div>
        <div style="flex: 1; text-align: left;">
          <h1 class="brand-title" style="font-size: 17px; margin: 0; font-weight: 800; letter-spacing: -0.3px;">Finny Assistant</h1>
          <span id="planner-status" style="font-size: 11px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px;">
            <span style="width: 6px; height: 6px; background: #4ade80; border-radius: 50%;"></span>
            ${t("plannerReady")}
          </span>
        </div>
        <button id="quick-sum-btn" class="quick-action" title="${t("quickSummary")}" style="padding: 8px; border-radius: 10px; background: var(--card);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
      </div>

      <!-- Messages Container -->
      <div id="chat-messages-container" class="chat-messages">
        <!-- Bubbles rendered here -->
      </div>

      <!-- Input area with suggestions inside -->
      <div class="chat-input-area">
        <div id="suggestion-chips-container" class="chat-suggestions">
          <button class="chat-suggestion" data-val="แบ่งเงิน 30000">แบ่งเงิน 50/30/20</button>
          <button class="chat-suggestion" data-val="คำนวณเงินสำรองฉุกเฉิน">คำนวณเงินสำรอง</button>
          <button class="chat-suggestion" data-val="กินข้าว 150 ค่าบีทีเอส 60">กินข้าว 150 ค่าบีทีเอส 60</button>
          <button class="chat-suggestion" data-val="มีเงิน 5000 ใช้ 20 วัน">มีเงิน 5000 ใช้ 20 วัน</button>
        </div>
        
        <form id="chat-form" class="chat-input-form">
          <input 
            type="text" 
            id="chat-input" 
            placeholder="${t("plannerPlaceholder")}" 
            autocomplete="off"
            required 
          />
          <button type="submit" id="chat-send-btn" class="chat-send-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>
    </div>
  `;

  // Bind Listeners
  setupEventListeners(container);

  // Render bubble messages
  renderMessages(container);
}

function setupEventListeners(container) {
  const form = container.querySelector("#chat-form");
  const input = container.querySelector("#chat-input");

  // Submit message handler
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = input.value.trim();
    if (val) {
      handleUserSendMessage(container, val);
      input.value = "";
    }
  });

  // Suggestion chip click
  container.querySelectorAll(".chat-suggestion").forEach((chip) => {
    chip.addEventListener("click", () => {
      const val = chip.getAttribute("data-val");
      handleUserSendMessage(container, val);
    });
  });

  // Quick Action Buttons
  container.querySelector("#quick-sum-btn").addEventListener("click", () => {
    handleUserSendMessage(container, "สรุป");
  });
}

function renderMessages(container) {
  const msgContainer = container.querySelector("#chat-messages-container");
  if (!msgContainer) return;

  const isDarkMode = store.settings.isDarkMode;
  const lang = store.settings.language;

  // Clear if resetting or initial rendering
  if (renderedCount === 0 || msgContainer.children.length === 0) {
    msgContainer.innerHTML = "";
    renderedCount = 0;
  }

  // Draw any new messages
  for (let i = renderedCount; i < messages.length; i++) {
    const msg = messages[i];
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${msg.isUser ? "user" : "planner"}`;
    bubble.id = `bubble-${msg.id || i}`;

    bubble.innerHTML = `
      <div class="chat-bubble-text">${formatMessageText(msg.text)}</div>
      ${msg.customHTML || ""}
      ${msg.pendingTxs ? renderPendingTransactionsCard(msg, isDarkMode, lang) : ""}
      ${
        !msg.isUser
          ? `
        <button class="copy-bubble-btn" title="${lang === "en" ? "Copy Text" : "คัดลอกข้อความ"}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        </button>
      `
          : ""
      }
    `;

    msgContainer.appendChild(bubble);
  }

  renderedCount = messages.length;

  // Bind active buttons
  bindMessageListeners(container);

  // Smooth scroll to bottom with layout stabilization delay
  setTimeout(() => {
    msgContainer.scrollTo({
      top: msgContainer.scrollHeight,
      behavior: "smooth",
    });
  }, 50);

  // Toggle suggestion chips visibility (hide after the first real exchange)
  const sugContainer = container.querySelector("#suggestion-chips-container");
  if (sugContainer) {
    if (messages.length > 2) {
      sugContainer.style.display = "none";
    } else {
      sugContainer.style.display = "flex";
    }
  }
}

function updateMessageState(container, msgId, newStatus) {
  const msg = messages.find((m) => m.id === msgId);
  if (!msg) return;
  msg.status = newStatus;

  const isDarkMode = store.settings.isDarkMode;
  const lang = store.settings.language;

  const bubble = container.querySelector(`#bubble-${msgId}`);
  if (bubble) {
    bubble.innerHTML = `
      <div class="chat-bubble-text">${formatMessageText(msg.text)}</div>
      ${msg.customHTML || ""}
      ${msg.pendingTxs ? renderPendingTransactionsCard(msg, isDarkMode, lang) : ""}
      <button class="copy-bubble-btn" title="${lang === "en" ? "Copy Text" : "คัดลอกข้อความ"}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
      </button>
    `;
    bindMessageListeners(container);
  }
}

function bindMessageListeners(container) {
  const msgContainer = container.querySelector("#chat-messages-container");
  if (!msgContainer) return;

  // 1. Confirm All Transactions
  msgContainer.querySelectorAll(".confirm-txs-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const msgId = btn.getAttribute("data-msg-id");
      const msg = messages.find((m) => m.id === msgId);
      if (msg && msg.status === "pending") {
        msg.pendingTxs.forEach((tx) => {
          const thbAmount =
            store.settings.selectedCurrency === "THB"
              ? tx.amount
              : tx.amount / store.toDisplay(1.0);

          store.addTransaction({
            title: tx.title,
            amount: thbAmount,
            isIncome: tx.isIncome,
            category: tx.category,
            date: tx.date || new Date(),
          });
        });

        updateMessageState(container, msgId, "confirmed");
        alerts.success(
          store.settings.language === "en" ? "Success" : "สำเร็จ",
          store.settings.language === "en"
            ? "Transactions recorded successfully!"
            : "บันทึกข้อมูลธุรกรรมเรียบร้อยแล้ว!",
        );
      }
    });
  });

  // 2. Cancel Transactions
  msgContainer.querySelectorAll(".cancel-txs-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const msgId = btn.getAttribute("data-msg-id");
      updateMessageState(container, msgId, "cancelled");
    });
  });

  // 3. Copy Chat Bubble Text
  msgContainer.querySelectorAll(".copy-bubble-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const bubble = btn.closest(".chat-bubble");
      const textEl = bubble.querySelector(".chat-bubble-text");
      if (textEl) {
        navigator.clipboard.writeText(textEl.innerText).then(() => {
          btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
          btn.style.color = "#34d399";
          setTimeout(() => {
            btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
            btn.style.color = "";
          }, 2000);
        });
      }
    });
  });
}

function renderPendingTransactionsCard(msg, isDark, lang) {
  const symbol = store.getCurrencySymbol();
  const txs = msg.pendingTxs;
  const statusClass = msg.status;

  let rowsHTML = "";
  txs.forEach((t) => {
    const cat = getCategoryInfo(t.category);
    const typeLabel = t.isIncome
      ? lang === "en"
        ? "Income"
        : "รายรับ"
      : lang === "en"
        ? "Expense"
        : "รายจ่าย";
    const dateStr = t.date.toLocaleDateString(
      lang === "en" ? "en-US" : "th-TH",
      { month: "short", day: "numeric" },
    );

    rowsHTML += `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; border-bottom: 1px dashed ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}; padding-bottom: 8px; width: 100%;">
        <div class="cat-icon" style="width: 24px; height: 24px; background: ${cat.color}18; color: ${cat.color}; border-color: ${cat.color}28; border-width: 1px;">
          <span style="display: flex; align-items: center; justify-content: center; width: 14px; height: 14px;">${cat.svg || cat.emoji}</span>
        </div>
        <div style="flex: 1; min-width: 0; text-align: left;">
          <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHTML(t.title)}</div>
          <div style="font-size: 10px; color: ${cat.color}; font-weight: 600;">${cat.label} (${typeLabel}) • ${dateStr}</div>
        </div>
        <div style="font-size: 13px; font-weight: 800; color: var(--text-primary); text-decoration: ${statusClass === "cancelled" ? "line-through" : "none"}; flex-shrink: 0;">
          ${symbol}${t.amount.toFixed(2)}
        </div>
      </div>
    `;
  });

  let buttonsHTML = "";
  let badgeHTML = "";

  if (statusClass === "pending") {
    buttonsHTML = `
      <div style="display: flex; gap: 8px; margin-top: 12px; width: 100%;">
        <button class="confirm-txs-btn" data-msg-id="${msg.id}" style="
          flex: 1; padding: 8px 10px; border-radius: 8px; border: none;
          background: linear-gradient(135deg, #10b981, #059669); color: #fff;
          font-weight: 700; font-size: 11px; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 4px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ${lang === "en" ? "Confirm All" : "ยืนยันทั้งหมด"}
        </button>
        <button class="cancel-txs-btn" data-msg-id="${msg.id}" style="
          flex: 1; padding: 8px 10px; border-radius: 8px;
          background: rgba(248, 113, 113, 0.08); border: 1px solid rgba(248, 113, 113, 0.22);
          color: var(--expense); font-weight: 700; font-size: 11px; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 4px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ${lang === "en" ? "Cancel All" : "ยกเลิก"}
        </button>
      </div>
    `;
    badgeHTML = `<span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: rgba(245, 158, 11, 0.15); color: var(--gold);">${lang === "en" ? "Pending Confirm" : "รอการยืนยัน"}</span>`;
  } else if (statusClass === "confirmed") {
    badgeHTML = `<span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: rgba(74, 222, 128, 0.15); color: var(--income);">${lang === "en" ? "Recorded All ✓" : "บันทึกเรียบร้อย ✓"}</span>`;
  } else {
    badgeHTML = `<span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: rgba(156, 163, 175, 0.15); color: var(--text-secondary);">${lang === "en" ? "Cancelled ✗" : "ยกเลิกแล้ว ✗"}</span>`;
  }

  const opacity = statusClass === "cancelled" ? "opacity: 0.65;" : "";

  return `
    <div class="chat-transaction-notice" style="margin-top: 12px; padding: 12px; background: ${isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(243, 244, 246, 0.8)"}; border-radius: 12px; border: 1px solid ${isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)"}; ${opacity} width: 100%; box-sizing: border-box;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; width: 100%;">
        <span style="font-size: 9px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">${lang === "en" ? "Awaiting Confirmation" : "ตรวจสอบรายการบันทึก"}</span>
        ${badgeHTML}
      </div>
      <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
        ${rowsHTML}
      </div>
      ${buttonsHTML}
    </div>
  `;
}

function formatMessageText(text) {
  let html = escapeHTML(text);

  // Format bullet points
  html = html.replace(
    /^[•\-\*]\s*(.+)$/gm,
    '<div style="display: flex; gap: 8px; margin-bottom: 4px;"><span style="color: var(--gold);">•</span><span>$1</span></div>',
  );

  // Convert bold formatting
  html = html.replace(
    /\*\*(.*?)\*\*/g,
    '<strong style="color: var(--gold);">$1</strong>',
  );

  return html.replace(/\n/g, "<br/>");
}

async function handleUserSendMessage(container, text) {
  // Append User message
  messages.push({
    id: "msg-usr-" + Date.now(),
    isUser: true,
    text: text,
    time: new Date(),
  });

  renderMessages(container);

  // Set loading status
  const statusEl = container.querySelector("#planner-status");
  statusEl.innerHTML = `<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span> ${t("plannerTyping")}`;
  statusEl.style.color = "var(--gold)";

  // Append temporary Typing indicator
  const msgContainer = container.querySelector("#chat-messages-container");
  const typingEl = document.createElement("div");
  typingEl.className = "typing-indicator";
  typingEl.innerHTML = `
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
  `;
  msgContainer.appendChild(typingEl);
  msgContainer.scrollTop = msgContainer.scrollHeight;

  // Use offline mock response directly
  setTimeout(() => {
    // Remove typing bubble
    typingEl.remove();

    const lang = store.settings.language;
    const symbol = store.getCurrencySymbol();

    // 1. Try to parse planning or budgeting queries first
    const offlineResult = getOfflinePlannerResponse(text);

    if (offlineResult && !offlineResult.isFallback) {
      // It's a matched planning query! Use it.
      messages.push({
        id: "msg-planner-" + Date.now(),
        isUser: false,
        text: offlineResult.response || "มีปัญหาระหว่างคำนวณผลลัพธ์ค่ะ",
        customHTML: offlineResult.customHTML || null,
        time: new Date(),
      });
    } else {
      // 2. If it wasn't a planning query, try basic transaction parsing (single or multiple)
      const results = parseTransactionsFromInput(text, lang === "en");

      if (results.length > 0) {
        const totalAmount = results.reduce((acc, t) => acc + t.amount, 0);
        let responseText = "";

        if (results.length === 1) {
          const t = results[0];
          const dateStr = t.date.toLocaleDateString(
            lang === "en" ? "en-US" : "th-TH",
            { month: "short", day: "numeric" },
          );
          responseText =
            lang === "en"
              ? `Do you want to save "${t.title}" for ${symbol}${t.amount.toFixed(2)} in ${t.category} on ${dateStr}?`
              : `ต้องการบันทึกรายการ "${t.title}" จำนวน ${symbol}${t.amount.toFixed(2)} ในหมวดหมู่ ${t.category} ของวันที่ ${dateStr} หรือไม่คะ?`;
        } else {
          responseText =
            lang === "en"
              ? `I detected ${results.length} transactions totaling ${symbol}${totalAmount.toFixed(2)}. Would you like to record them?`
              : `พบรายการทั้งหมด ${results.length} รายการ รวมเป็นเงิน ${symbol}${totalAmount.toFixed(2)} ค่ะ ต้องการบันทึกหรือไม่คะ?`;
        }

        messages.push({
          id: "msg-planner-" + Date.now(),
          isUser: false,
          text: responseText,
          pendingTxs: results,
          status: "pending",
          time: new Date(),
        });
      } else {
        // 3. Fallback to standard instructions
        messages.push({
          id: "msg-planner-" + Date.now(),
          isUser: false,
          text: offlineResult.response,
          customHTML: null,
          time: new Date(),
        });
      }
    }

    // Restore status text
    statusEl.innerHTML = `<span style="width: 6px; height: 6px; background: #4ade80; border-radius: 50%;"></span> ${t("plannerReady")}`;
    statusEl.style.color = "var(--text-secondary)";

    renderMessages(container);
  }, 450); // Natural visual delay
}

function parseTransactionsFromInput(input, isEnglish) {
  const normalized = input.toLowerCase().replace(/,/g, "");

  // Split on common connectors: "+", "และ", "and", ",", newline
  const parts = normalized.split(/(?:และ|and|\+|,|\n)/i);
  const results = [];
  const targetDate = parseRelativeDate(input);

  parts.forEach((part) => {
    const amountMatch = part.match(/(\d+(?:\.\d{1,2})?)/);
    if (!amountMatch) return;

    const amount = parseFloat(amountMatch[0]);
    if (isNaN(amount) || amount <= 0) return;

    const isInc =
      part.includes("เงินเดือน") ||
      part.includes("รายรับ") ||
      part.includes("ได้เงิน") ||
      part.includes("ขายของ") ||
      part.includes("salary") ||
      part.includes("income");

    let category = isInc ? "Salary" : "Other";
    if (
      part.includes("ข้าว") ||
      part.includes("อาหาร") ||
      part.includes("ชาบู") ||
      part.includes("หมูกระทะ") ||
      part.includes("สตาร์บัคส์") ||
      part.includes("กาแฟ") ||
      part.includes("ก๋วยเตี๋ยว") ||
      part.includes("ขนม") ||
      part.includes("food") ||
      part.includes("coffee")
    ) {
      category = "Food";
    } else if (
      part.includes("รถ") ||
      part.includes("เดินทาง") ||
      part.includes("bts") ||
      part.includes("mrt") ||
      part.includes("แท็กซี่") ||
      part.includes("น้ำมัน") ||
      part.includes("grab") ||
      part.includes("bolt") ||
      part.includes("transport")
    ) {
      category = "Transport";
    } else if (
      part.includes("ซื้อ") ||
      part.includes("ช้อป") ||
      part.includes("เสื้อ") ||
      part.includes("ห้าง") ||
      part.includes("shopee") ||
      part.includes("lazada") ||
      part.includes("shopping")
    ) {
      category = "Shopping";
    } else if (
      part.includes("ไฟ") ||
      part.includes("น้ำ") ||
      part.includes("เน็ต") ||
      part.includes("บิล") ||
      part.includes("netflix") ||
      part.includes("youtube") ||
      part.includes("สมัคร") ||
      part.includes("bill")
    ) {
      category = "Bills";
    }

    let cleanTitle = part.replace(amountMatch[0], "").replace("บาท", "").trim();
    cleanTitle = cleanTitle
      .replace(/เมื่อวานซืน|เมื่อวาน|วานซืน/gi, "")
      .replace(/เมื่อ\s*\d+\s*วันก่อน|เมื่อ\s*\d+\s*วันที่แล้ว/gi, "")
      .replace(/yesterday|day before yesterday|\d+\s*days?\s*ago/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanTitle) {
      cleanTitle = isInc ? "รายรับเพิ่มเติม" : "รายจ่ายเพิ่มเติม";
    }

    results.push({
      title: cleanTitle,
      amount: amount,
      isIncome: isInc,
      category: category,
      date: targetDate,
    });
  });

  return results;
}

function getOfflinePlannerResponse(input) {
  const lowerText = input.toLowerCase();
  const metrics = store.getFinanceMetrics();
  const symbol = store.getCurrencySymbol();
  const isEnglish = store.settings.language === "en";

  // 1. 50/30/20 budgeting rule check
  const budgetTotal = parseBudget503020(input);
  if (budgetTotal !== null) {
    return {
      response: isEnglish
        ? `Here is your 50/30/20 budget breakdown for ${symbol}${budgetTotal.toLocaleString()}:`
        : `นี่คือการวิเคราะห์การแบ่งสัดส่วนเงิน ${symbol}${budgetTotal.toLocaleString()} ตามกฎ 50/30/20 ค่ะ:`,
      customHTML: formatBudget503020Response(budgetTotal, symbol, isEnglish),
    };
  }

  // 2. Emergency fund planner check
  if (isEmergencyFundQuery(input)) {
    const avgExpense = getAverageMonthlyExpense();
    const currentCash = store.netWorth.assets.cash || 0;
    return {
      response: isEnglish
        ? `Here is your emergency fund analysis:`
        : `วิเคราะห์เงินสำรองฉุกเฉินให้คุณเรียบร้อยแล้วค่ะ:`,
      customHTML: formatEmergencyFundResponse(
        avgExpense,
        symbol,
        isEnglish,
        currentCash,
      ),
    };
  }

  // 3. Compound interest calculator check
  const interestPlan = parseCompoundInterest(input);
  if (interestPlan) {
    return {
      response: formatInterestResponse(interestPlan, symbol, isEnglish),
    };
  }

  // 4. Budget plan check ("มี 5000 ใช้ 20 วัน")
  const plan = parseMoneyPlan(input);
  if (plan) {
    return {
      response: formatOfflinePlan(plan, symbol, isEnglish),
    };
  }

  // Summary / Analysis Keywords
  if (
    lowerText.includes("สรุป") ||
    lowerText.includes("วิเคราะห์") ||
    lowerText.includes("แนะนำ")
  ) {
    const rate =
      metrics.monthlyIncome > 0
        ? ((metrics.monthlyIncome - metrics.monthlyExpense) /
            metrics.monthlyIncome) *
          100
        : 0;

    let advice = "";
    if (rate >= 30) {
      advice =
        "🌟 คุณบริหารเงินได้ยอดเยี่ยมมากค่ะ มีเงินเหลือเก็บเกิน 30% รักษามาตรฐานนี้นะคะ!";
    } else if (rate >= 10) {
      advice =
        "👍 การเงินอยู่ในเกณฑ์ดีค่ะ แต่ถ้าลองลดรายจ่ายฟุ่มเฟือยลงอีกนิด จะมีเงินออมเพิ่มขึ้นนะคะ";
    } else if (rate > 0) {
      advice =
        "⚠️ เดือนนี้ใช้จ่ายค่อนข้างตึงตัวนะคะ แนะนำให้ลองตรวจสอบหมวดหมู่ที่จ่ายเยอะสุดดูค่ะ";
    } else {
      advice =
        "🚨 สัญญาณอันตราย! เดือนนี้ใช้จ่ายเกินรายรับแล้วค่ะ แนะนำให้งดการใช้จ่ายที่ไม่จำเป็นทันทีนะคะ";
    }

    return {
      response: isEnglish
        ? `Financial summary for this month
 
Income: ${symbol}${metrics.monthlyIncome.toFixed(2)}
Expense: ${symbol}${metrics.monthlyExpense.toFixed(2)}
Remaining: ${symbol}${metrics.monthlyBalance.toFixed(2)}
 
Planner note:
${advice}`
        : `สรุปและวิเคราะห์การเงินเดือนนี้ค่ะ
 
รายรับ: ${symbol}${metrics.monthlyIncome.toFixed(2)}
รายจ่าย: ${symbol}${metrics.monthlyExpense.toFixed(2)}
คงเหลือ: ${symbol}${metrics.monthlyBalance.toFixed(2)}
 
คำแนะนำจากตัววางแผน:
${advice}`,
    };
  }

  // Balance keywords
  if (
    lowerText.includes("ยอด") ||
    lowerText.includes("เงินเหลือ") ||
    lowerText.includes("คงเหลือ")
  ) {
    return {
      response: isEnglish
        ? `Your remaining balance this month is ${symbol}${metrics.monthlyBalance.toFixed(2)}. Type "analyze" if you want a deeper breakdown.`
        : `ยอดเงินคงเหลือของคุณตอนนี้คือ ${symbol}${metrics.monthlyBalance.toFixed(2)} สำหรับเดือนนี้ค่ะ \nหากต้องการดูภาพรวมเพิ่มเติมพิมพ์ 'วิเคราะห์' ได้เลยนะคะ`,
    };
  }

  // Greeting
  if (
    lowerText.includes("สวัสดี") ||
    lowerText.includes("หวัดดี") ||
    lowerText.includes("hi") ||
    lowerText.includes("hello")
  ) {
    return {
      response: isEnglish
        ? `Hi! The Finny Assistant is ready to help you track spending, analyze cash flow, and plan your money.`
        : `สวัสดีค่ะ! Finny พร้อมช่วยจัดการและวิเคราะห์การเงินให้คุณแล้ววันนี้\nอยากให้บันทึกรายจ่าย วางแผนงบ 50/30/20 หรือวิเคราะห์เงินสำรอง บอกได้เลยค่ะ!`,
    };
  }

  // Standard Fallback instructions
  return {
    isFallback: true,
    response: isEnglish
      ? `The Finny Assistant can help with examples like:
• "I have 5000 for 20 days"
• "Save 30000 in 6 months"
• "Lunch 150"
• "Analyze my spending"`
      : `Finny ยังไม่เข้าใจคำถามนี้ค่ะ ลองบอกรายละเอียดให้ชัดเจนขึ้นดูนะคะ เช่น:
• บันทึกรายจ่ายเดี่ยว/กลุ่ม: "กินข้าว 120 ค่ารถ 50"
• แบ่งเงิน 50/30/20: "แบ่งเงิน 30000"
• คำนวณเงินสำรอง: "เงินสำรองฉุกเฉิน"
• วางแผนเงิน: "มีเงิน 5000 ใช้ 20 วัน"
• วิเคราะห์ภาพรวม: "วิเคราะห์" หรือ "สรุป"`,
  };
}

function parseRelativeDate(input) {
  const now = new Date();
  const lower = input.toLowerCase();

  // English matches
  if (lower.includes("yesterday")) {
    const d = new Date(now);
    d.setDate(now.getDate() - 1);
    return d;
  }
  if (lower.includes("day before yesterday")) {
    const d = new Date(now);
    d.setDate(now.getDate() - 2);
    return d;
  }
  const engAgoMatch = lower.match(/(\d+)\s*days?\s*ago/);
  if (engAgoMatch) {
    const days = parseInt(engAgoMatch[1], 10);
    const d = new Date(now);
    d.setDate(now.getDate() - days);
    return d;
  }

  // Thai matches
  if (lower.includes("เมื่อวาน")) {
    const d = new Date(now);
    d.setDate(now.getDate() - 1);
    return d;
  }
  if (lower.includes("เมื่อวานซืน") || lower.includes("วานซืน")) {
    const d = new Date(now);
    d.setDate(now.getDate() - 2);
    return d;
  }
  const thaiAgoMatch =
    lower.match(/เมื่อ\s*(\d+)\s*วันก่อน/) ||
    lower.match(/เมื่อ\s*(\d+)\s*วันที่แล้ว/);
  if (thaiAgoMatch) {
    const days = parseInt(thaiAgoMatch[1], 10);
    const d = new Date(now);
    d.setDate(now.getDate() - days);
    return d;
  }

  return now;
}

function parseMoneyPlan(input) {
  const normalized = input.toLowerCase().replace(/,/g, "");
  const numbers = [...normalized.matchAll(/(\d+(?:\.\d+)?)/g)].map((match) =>
    parseFloat(match[1]),
  );
  if (numbers.length < 2) return null;

  const hasTimeline =
    /(วัน|day|days|เดือน|month|months|ปี|year|years|week|weeks|สัปดาห์)/i.test(
      normalized,
    );
  const hasPlanningIntent =
    /(ใช้|พอ|plan|budget|save|saving|เก็บ|เป้าหมาย|goal|need|ต้องการ|อยาก)/i.test(
      normalized,
    );
  if (!hasTimeline && !hasPlanningIntent) return null;

  const amount = numbers[0];
  const duration = numbers[1];
  let days = duration;

  if (/(เดือน|month|months)/i.test(normalized)) days = duration * 30;
  if (/(ปี|year|years)/i.test(normalized)) days = duration * 365;
  if (/(week|weeks|สัปดาห์)/i.test(normalized)) days = duration * 7;

  const isSavingsGoal = /(save|saving|เก็บ|เป้าหมาย|goal)/i.test(normalized);

  return {
    amount,
    duration,
    days: Math.max(1, Math.round(days)),
    isSavingsGoal,
  };
}

function formatOfflinePlan(plan, symbol, isEnglish) {
  const daily = plan.amount / plan.days;
  const weekly = daily * 7;
  const monthly = daily * 30;
  const needsTightBudget = daily < 200;

  if (isEnglish) {
    if (plan.isSavingsGoal) {
      return `Offline plan:
Goal: ${symbol}${plan.amount.toLocaleString()} in ${plan.days} days
Save per day: ${symbol}${daily.toFixed(2)}
Save per week: ${symbol}${weekly.toFixed(2)}
Save per month: ${symbol}${monthly.toFixed(2)}
 
Suggested plan:
• Move the daily amount out first when income arrives.
• Keep a small emergency buffer before flexible spending.
• Review progress every 7 days and adjust if you miss a day.`;
    }

    return `Offline budget plan:
Available money: ${symbol}${plan.amount.toLocaleString()}
Timeline: ${plan.days} days
Daily limit: ${symbol}${daily.toFixed(2)}
Weekly limit: ${symbol}${weekly.toFixed(2)}
 
Suggested split:
• Essentials: ${symbol}${(daily * 0.65).toFixed(2)} per day
• Food/transport: ${symbol}${(daily * 0.25).toFixed(2)} per day
• Buffer: ${symbol}${(daily * 0.1).toFixed(2)} per day
${needsTightBudget ? "\nThis is a tight budget, so avoid non-essential spending until the timeline ends." : ""}`;
  }

  if (plan.isSavingsGoal) {
    return `แผนจัดการเงิน:
เป้าหมาย: ${symbol}${plan.amount.toLocaleString()} ภายใน ${plan.days} วัน
ต้องเก็บต่อวัน: ${symbol}${daily.toFixed(2)}
ต้องเก็บต่อสัปดาห์: ${symbol}${weekly.toFixed(2)}
ประมาณต่อเดือน: ${symbol}${monthly.toFixed(2)}
 
แนะนำ:
• แยกเงินเก็บทันทีเมื่อมีรายรับ
• กันเงินฉุกเฉินเล็กน้อยก่อนใช้จ่ายยืดหยุ่น
• ตรวจความคืบหน้าทุก 7 วันแล้วปรับแผนถ้าหลุด`;
  }

  return `แผนใช้งบ:
เงินที่มี: ${symbol}${plan.amount.toLocaleString()}
ระยะเวลา: ${plan.days} วัน
ใช้ได้ต่อวัน: ${symbol}${daily.toFixed(2)}
ใช้ได้ต่อสัปดาห์: ${symbol}${weekly.toFixed(2)}
 
แบ่งงบแนะนำ:
• จำเป็น: ${symbol}${(daily * 0.65).toFixed(2)} ต่อวัน
• อาหาร/เดินทาง: ${symbol}${(daily * 0.25).toFixed(2)} ต่อวัน
• กันพลาด: ${symbol}${(daily * 0.1).toFixed(2)} ต่อวัน
${needsTightBudget ? "\nงบนี้ค่อนข้างตึง ควรงดรายจ่ายที่ไม่จำเป็นจนกว่าจะครบระยะเวลานี้ค่ะ" : ""}`;
}

function parseCompoundInterest(input) {
  const normalized = input.toLowerCase().replace(/,/g, "");
  const isInterestQuery =
    /(ดอกเบี้ย|ทบต้น|compound|interest|ลงทุน|invest)/i.test(normalized);
  if (!isInterestQuery) return null;

  const numbers = [...normalized.matchAll(/(\d+(?:\.\d+)?)/g)].map((match) =>
    parseFloat(match[1]),
  );
  if (numbers.length < 2) return null;

  const principal = numbers[0];
  const rate = numbers[1];
  const years = numbers[2] || 10;

  return {
    principal,
    rate,
    years,
  };
}

function formatInterestResponse(plan, symbol, isEnglish) {
  const principal = plan.principal;
  const rate = plan.rate;
  const years = plan.years;
  const inflationRate = 2.0;

  const total = principal * Math.pow(1 + rate / 100, years);
  const interest = total - principal;
  const realTotal = total / Math.pow(1 + inflationRate / 100, years);

  if (isEnglish) {
    return `📈 Compound Interest & Inflation Plan:
• Principal: ${symbol}${principal.toLocaleString()}
• Return Rate: ${rate}% p.a.
• Duration: ${years} years
 
Results:
• Future Value: ${symbol}${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
• Interest Earned: ${symbol}${interest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
• Real Value (2% Inflation adjusted): ${symbol}${realTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 
Advisory Note:
- Compound interest is the 8th wonder of the world.
- Adjusted for a historical 2% inflation rate, the purchasing power of your future sum is equivalent to ${symbol}${realTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} today.`;
  } else {
    return `📈 แผนคำนวณดอกเบี้ยทบต้นและอัตราเงินเฟ้อ:
• เงินต้น: ${symbol}${principal.toLocaleString()}
• อัตราผลตอบแทน: ${rate}% ต่อปี
• ระยะเวลา: ${years} ปี
 
ผลลัพธ์:
• มูลค่าในอนาคต: ${symbol}${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
• ดอกเบี้ยสะสม: ${symbol}${interest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
• มูลค่าที่แท้จริง (ปรับเงินเฟ้อ 2%): ${symbol}${realTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 
คำแนะนำทางการเงิน:
- พลังของดอกเบี้ยทบต้นจะเติบโตแบบก้าวกระโดดเมื่อระยะเวลาเพิ่มขึ้น
- เมื่อปรับลดมูลค่าด้วยเงินเฟ้อเฉลี่ย 2% ต่อปี เงินในอนาคตจำนวนนี้จะมีอำนาจซื้อเท่ากับเงิน ${symbol}${realTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ในปัจจุบันค่ะ`;
  }
}

function parseBudget503020(input) {
  const normalized = input.toLowerCase().replace(/,/g, "");
  const has503020 =
    /(50[\/\-]30[\/\-]20|แบ่งเงิน|กฎ\s*50|แบ่งสัดส่วน|วางแผนเงิน)/i.test(
      normalized,
    );
  if (!has503020) return null;

  const amountMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!amountMatch) return null;

  const total = parseFloat(amountMatch[0]);
  if (isNaN(total) || total <= 0) return null;

  return total;
}

function formatBudget503020Response(total, symbol, isEnglish) {
  const needs = total * 0.5;
  const wants = total * 0.3;
  const savings = total * 0.2;

  const needsTitle = isEnglish ? "Needs (50%)" : "ส่วนที่จำเป็น (50%)";
  const needsDesc = isEnglish
    ? "Rent, bills, groceries, transport"
    : "ค่าหอ/บ้าน, ค่าน้ำไฟ, อาหารหลัก, การเดินทาง";

  const wantsTitle = isEnglish ? "Wants (30%)" : "ส่วนตามใจชอบ (30%)";
  const wantsDesc = isEnglish
    ? "Dining out, shopping, hobbies"
    : "ช้อปปิ้ง, อาหารหรู, กาแฟคาเฟ่, ความบันเทิง";

  const savingsTitle = isEnglish
    ? "Savings & Debt (20%)"
    : "เงินออมและลงทุน (20%)";
  const savingsDesc = isEnglish
    ? "Emergency fund, investments, debts"
    : "เงินออมเผื่อฉุกเฉิน, กองทุน/หุ้น, หรือโปะหนี้สิน";

  return `
    <div style="margin-top: 10px; padding: 14px; background: rgba(255, 255, 255, 0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); text-align: left;">
      <div style="font-size: 13px; font-weight: 800; color: var(--gold); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        ${isEnglish ? "50/30/20 Budgeting Rule" : "การแบ่งเงินตามกฎ 50/30/20"}
      </div>
      <p style="font-size: 11px; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.5;">
        ${isEnglish ? "Divide your monthly income into three simple categories to build balanced wealth:" : "แบ่งรายได้ของคุณออกเป็น 3 หมวดหมู่หลัก เพื่อความสมดุลและความคุ้มค่าทางการเงิน:"}
      </p>

      <!-- Progress Segment Bar -->
      <div style="height: 12px; display: flex; border-radius: 6px; overflow: hidden; margin-bottom: 16px;">
        <div style="width: 50%; background: #3b82f6;" title="${needsTitle}"></div>
        <div style="width: 30%; background: #ec4899;" title="${wantsTitle}"></div>
        <div style="width: 20%; background: #10b981;" title="${savingsTitle}"></div>
      </div>

      <!-- Detail rows -->
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; align-items: flex-start; gap: 10px;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; margin-top: 4px;"></div>
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: var(--text-primary);">
              <span>${needsTitle}</span>
              <span style="color: #3b82f6;">${symbol}${needs.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 1px;">${needsDesc}</div>
          </div>
        </div>

        <div style="display: flex; align-items: flex-start; gap: 10px;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: #ec4899; margin-top: 4px;"></div>
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: var(--text-primary);">
              <span>${wantsTitle}</span>
              <span style="color: #ec4899;">${symbol}${wants.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 1px;">${wantsDesc}</div>
          </div>
        </div>

        <div style="display: flex; align-items: flex-start; gap: 10px;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: #10b981; margin-top: 4px;"></div>
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: var(--text-primary);">
              <span>${savingsTitle}</span>
              <span style="color: #10b981;">${symbol}${savings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 1px;">${savingsDesc}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function isEmergencyFundQuery(input) {
  const normalized = input.toLowerCase();
  return /(ฉุกเฉิน|เงินสำรอง|emergency\s*fund|reserve\s*fund|สำรองเผื่อ)/i.test(
    normalized,
  );
}

function getAverageMonthlyExpense() {
  const transactions = store.transactions.filter((t) => !t.isIncome);
  if (transactions.length === 0) return 15000;

  const months = new Set();
  transactions.forEach((t) => {
    if (t.date instanceof Date) {
      months.add(`${t.date.getFullYear()}-${t.date.getMonth()}`);
    }
  });

  const totalExpense = transactions.reduce((acc, t) => acc + t.amount, 0);
  const numMonths = Math.max(1, months.size);
  return totalExpense / numMonths;
}

function formatEmergencyFundResponse(
  avgExpense,
  symbol,
  isEnglish,
  currentCash,
) {
  const basicTarget = avgExpense * 3;
  const comfortableTarget = avgExpense * 6;

  const basicPct =
    Math.min(100, Math.round((currentCash / basicTarget) * 100)) || 0;
  const comfortablePct =
    Math.min(100, Math.round((currentCash / comfortableTarget) * 100)) || 0;

  return `
    <div style="margin-top: 10px; padding: 14px; background: rgba(255, 255, 255, 0.03); border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); text-align: left;">
      <div style="font-size: 13px; font-weight: 800; color: var(--gold); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        ${isEnglish ? "Emergency Fund Planner" : "วิเคราะห์เงินสำรองฉุกเฉิน"}
      </div>
      <p style="font-size: 11px; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.5;">
        ${
          isEnglish
            ? `Based on your records, your average monthly expense is <strong>${symbol}${avgExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>.`
            : `คำนวณจากประวัติของคุณ คุณมีรายจ่ายเฉลี่ยเดือนละ <strong>${symbol}${avgExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>.`
        }
      </p>

      <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px;">
        <!-- 3 Months -->
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
            <span>${isEnglish ? "3 Months Target (Basic)" : "เป้าหมาย 3 เดือน (ระดับพื้นฐาน)"}</span>
            <span style="color: var(--gold);">${symbol}${basicTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; width: ${basicPct}%; background: linear-gradient(90deg, var(--gold), var(--gold-light)); border-radius: 3px;"></div>
          </div>
          <div style="font-size: 9.5px; color: var(--text-muted); margin-top: 3.5px;">
            ${
              isEnglish
                ? `Current Cash Portfolio: ${symbol}${currentCash.toLocaleString()} (${basicPct}% saved)`
                : `เงินสดสะสมปัจจุบัน: ${symbol}${currentCash.toLocaleString()} (ออมแล้ว ${basicPct}%)`
            }
          </div>
        </div>

        <!-- 6 Months -->
        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
            <span>${isEnglish ? "6 Months Target (Secure)" : "เป้าหมาย 6 เดือน (แนะนำเพื่อความมั่นคง)"}</span>
            <span style="color: #10b981;">${symbol}${comfortableTarget.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; width: ${comfortablePct}%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 3px;"></div>
          </div>
          <div style="font-size: 9.5px; color: var(--text-muted); margin-top: 3.5px;">
            ${
              isEnglish
                ? `Security progress: ${comfortablePct}% saved`
                : `ความมั่นคงทางการเงิน: สะสมแล้ว ${comfortablePct}%`
            }
          </div>
        </div>
      </div>

      <div style="background: rgba(255, 184, 0, 0.04); border: 1px dashed rgba(255, 184, 0, 0.2); padding: 10px; border-radius: 10px; font-size: 10px; color: var(--gold); line-height: 1.5;">
        💡 ${
          isEnglish
            ? "Keep your emergency fund in a separate, high-yield savings account so it remains highly liquid but still earns interest."
            : "ข้อแนะนำ: ควรเก็บเงินสำรองฉุกเฉินแยกไว้ในบัญชีออมทรัพย์ดอกเบี้ยสูง (e-Savings) เพื่อให้มีสภาพคล่องสูงถอนง่ายแต่ยังได้ผลตอบแทนดีค่ะ"
        }
      </div>
    </div>
  `;
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
