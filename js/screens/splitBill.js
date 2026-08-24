import { store } from "../store.js";
import { router } from "../router.js";
import { t } from "../i18n.js";
import { alerts } from "../utils/alertHelper.js";
import QRCode from "qrcode";
import { generatePromptPayPayload, DEFAULT_PROMPTPAY_ID } from "../utils/promptpayQR.js";

export function renderSplitBill(container) {
  const sym = store.getCurrencySymbol();
  const language = store.settings.language === "en" ? "en" : "th";

  // State
  let totalAmount = 0;
  let numPeople = 2;
  let serviceChargePct = 0; // 0 or 10
  let vatPct = 0; // 0 or 7
  let discountAmount = 0;
  let promptPayId = store.settings.promptPayId || "";

  container.innerHTML = `
    <style>
      .split-card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: var(--radius-xl);
        padding: 20px;
        margin-bottom: 16px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      }
      .split-label {
        font-size: 12px;
        font-weight: 800;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .stepper-btn {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: var(--surface);
        border: 1px solid var(--border);
        color: var(--text-primary);
        font-size: 20px;
        font-weight: 800;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      .stepper-btn:hover {
        background: var(--card-solid);
        border-color: var(--gold);
        color: var(--gold);
      }
      .stepper-btn:active {
        transform: scale(0.92);
      }
      .quick-chip {
        padding: 6px 12px;
        border-radius: 999px;
        font-size: 11.5px;
        font-weight: 700;
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text-secondary);
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .quick-chip.active {
        border-color: var(--gold);
        background: var(--gold-soft);
        color: var(--gold);
      }
    </style>

    <div class="screen screen-enter" style="padding: 0 16px 36px; max-width: 520px; margin: 0 auto;">
      
      <!-- Header -->
      <div style="display: flex; align-items: center; gap: 12px; padding: 14px 0 18px;">
        <button id="split-back-btn" class="icon-btn" style="background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div>
          <h1 style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: var(--text-primary); margin: 0;">
            ${language === 'en' ? 'Split Bill' : 'หารบิล (Split Bill)'}
          </h1>
          <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
            ${language === 'en' ? 'Quick amount & people calculator' : 'ใส่ยอดเงินและจำนวนคน คำนวณง่ายทันที'}
          </div>
        </div>
      </div>

      <!-- Result Hero Card -->
      <div style="background: linear-gradient(135deg, #0d1527 0%, #151e36 100%); border: 1px solid rgba(245, 200, 66, 0.3); border-radius: var(--radius-xl); padding: 22px; margin-bottom: 18px; text-align: center; position: relative; overflow: hidden; box-shadow: 0 6px 24px rgba(245, 200, 66, 0.12);">
        <div style="font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: var(--gold); margin-bottom: 6px;">
          ${language === 'en' ? 'Each Person Pays' : 'จ่ายคนละ (Per Person)'}
        </div>
        <div id="split-per-person-display" style="font-size: 42px; font-weight: 900; color: #fff; font-family: var(--font-heading); line-height: 1.1; margin-bottom: 10px;">
          ${sym}0.00
        </div>
        <div id="split-summary-subtext" style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">
          ${language === 'en' ? 'Total: ฿0.00 for 2 people' : 'ยอดรวม: ฿0.00 หาร 2 คน'}
        </div>
      </div>

      <!-- Input Card 1: Total Amount -->
      <div class="split-card">
        <div class="split-label">
          <span>${language === 'en' ? 'Total Bill Amount' : 'ยอดเงินรวมทั้งหมด'}</span>
          <span style="font-size: 11px; color: var(--gold); font-weight: 700;">${store.getSelectedCurrency()}</span>
        </div>
        <div style="position: relative; margin-bottom: 12px;">
          <input 
            type="number" 
            id="split-total-input" 
            step="0.01" 
            min="0" 
            placeholder="0.00"
            style="width: 100%; font-size: 26px; font-weight: 900; padding: 14px 16px; background: var(--surface); border: 2px solid var(--border); border-radius: var(--radius-lg); color: var(--text-primary); font-family: var(--font-heading); outline: none; transition: border-color 0.2s;"
          />
        </div>
        
        <!-- Preset amount additions -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="quick-chip" data-add="100">+100</button>
          <button class="quick-chip" data-add="500">+500</button>
          <button class="quick-chip" data-add="1000">+1,000</button>
          <button class="quick-chip" id="clear-amount-btn" style="color: var(--expense); margin-left: auto;">${language === 'en' ? 'Clear' : 'ล้างยอด'}</button>
        </div>
      </div>

      <!-- Input Card 2: Number of People -->
      <div class="split-card">
        <div class="split-label">
          <span>${language === 'en' ? 'Number of People' : 'จำนวนคนหาร'}</span>
          <span id="people-count-label" style="font-size: 12px; color: var(--gold); font-weight: 800;">2 ${language === 'en' ? 'people' : 'คน'}</span>
        </div>
        
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px;">
          <button id="minus-person-btn" class="stepper-btn">−</button>
          <input 
            type="number" 
            id="split-people-input" 
            min="1" 
            max="100" 
            value="2" 
            style="flex: 1; text-align: center; font-size: 24px; font-weight: 900; padding: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); color: var(--text-primary); font-family: var(--font-heading); outline: none;"
          />
          <button id="plus-person-btn" class="stepper-btn">+</button>
        </div>

        <!-- Quick people presets -->
        <div style="display: flex; gap: 8px;">
          <button class="quick-chip people-preset" data-people="2">2 ${language === 'en' ? 'pax' : 'คน'}</button>
          <button class="quick-chip people-preset" data-people="3">3 ${language === 'en' ? 'pax' : 'คน'}</button>
          <button class="quick-chip people-preset" data-people="4">4 ${language === 'en' ? 'pax' : 'คน'}</button>
          <button class="quick-chip people-preset" data-people="5">5 ${language === 'en' ? 'pax' : 'คน'}</button>
          <button class="quick-chip people-preset" data-people="8">8 ${language === 'en' ? 'pax' : 'คน'}</button>
        </div>
      </div>

      <!-- Input Card 3: Optional Charges (Service / VAT / Discount) -->
      <div class="split-card">
        <div class="split-label">
          <span>${language === 'en' ? 'Extra Fees / Discounts (Optional)' : 'ค่าบริการ / VAT / ส่วนลด (ตัวเลือก)'}</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <button id="toggle-service-btn" class="quick-chip" style="padding: 10px; text-align: center; border-radius: 12px;">
            Service +10%
          </button>
          <button id="toggle-vat-btn" class="quick-chip" style="padding: 10px; text-align: center; border-radius: 12px;">
            VAT +7%
          </button>
        </div>

        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">
            ${language === 'en' ? 'Discount Amount' : 'ส่วนลด (ถ้ามี)'}
          </label>
          <input 
            type="number" 
            id="split-discount-input" 
            placeholder="0.00" 
            step="0.01" 
            min="0"
            style="width: 100%; font-size: 14px; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); outline: none;"
          />
        </div>
      </div>

      <!-- Action Buttons Row -->
      <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px;">
        <button id="copy-summary-btn" class="btn-primary" style="padding: 15px; font-size: 14px; font-weight: 800; border-radius: var(--radius-lg); background: linear-gradient(135deg, var(--gold), var(--amber)); color: #000; border: none; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: var(--shadow-gold); cursor: pointer;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          <span>${language === 'en' ? 'Copy Share Message' : 'คัดลอกข้อความสรุปหารเงิน'}</span>
        </button>

        <button id="toggle-promptpay-btn" style="padding: 13px; font-size: 13px; font-weight: 700; border-radius: var(--radius-lg); background: var(--surface); color: var(--text-primary); border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.2"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
          <span>${language === 'en' ? 'Show PromptPay QR Code' : 'แสดง PromptPay QR สำหรับรับเงิน'}</span>
        </button>
      </div>

      <!-- PromptPay QR Card (collapsible) -->
      <div id="promptpay-qr-section" style="display: none; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 20px; text-align: center; margin-bottom: 18px;">
        <h3 style="font-size: 14px; font-weight: 800; color: var(--text-primary); margin: 0 0 12px 0;">
          ${language === 'en' ? 'PromptPay Split QR' : 'สแกนจ่ายพร้อมเพย์'}
        </h3>
        
        <div style="margin-bottom: 12px;">
          <input 
            type="text" 
            id="promptpay-id-input" 
            placeholder="เบอร์โทร / เลขบัตรประชาชน (PromptPay ID)"
            value="${promptPayId}"
            style="width: 100%; max-width: 280px; padding: 8px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); font-size: 12px; color: var(--text-primary); text-align: center; outline: none;"
          />
        </div>

        <div style="background: #ffffff; padding: 12px; border-radius: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          <canvas id="promptpay-qr-canvas" style="display: block; width: 180px; height: 180px;"></canvas>
        </div>
        <div id="qr-amount-caption" style="font-size: 13px; font-weight: 800; color: var(--gold); margin-top: 10px;">
          ${sym}0.00 / ${language === 'en' ? 'person' : 'คน'}
        </div>
      </div>
    </div>
  `;

  setupSplitBillListeners(container);
}

function setupSplitBillListeners(container) {
  const language = store.settings.language === "en" ? "en" : "th";
  const sym = store.getCurrencySymbol();

  const totalInput = container.querySelector("#split-total-input");
  const peopleInput = container.querySelector("#split-people-input");
  const discountInput = container.querySelector("#split-discount-input");
  const perPersonDisplay = container.querySelector("#split-per-person-display");
  const summarySubtext = container.querySelector("#split-summary-subtext");
  const peopleCountLabel = container.querySelector("#people-count-label");

  let serviceChargePct = 0;
  let vatPct = 0;

  const calculate = () => {
    let base = parseFloat(totalInput.value) || 0;
    let people = parseInt(peopleInput.value, 10) || 1;
    if (people < 1) people = 1;
    let discount = parseFloat(discountInput.value) || 0;

    let subtotal = Math.max(0, base - discount);
    if (serviceChargePct > 0) {
      subtotal += subtotal * (serviceChargePct / 100);
    }
    if (vatPct > 0) {
      subtotal += subtotal * (vatPct / 100);
    }

    const perPerson = subtotal / people;

    perPersonDisplay.textContent = `${sym}${perPerson.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    peopleCountLabel.textContent = `${people} ${language === 'en' ? 'people' : 'คน'}`;
    
    summarySubtext.textContent = language === 'en'
      ? `Total: ${sym}${subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} divided by ${people} people`
      : `ยอดรวมสุทธิ: ${sym}${subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} หาร ${people} คน`;

    // Update QR code if open
    updateQRCode(perPerson);
  };

  // Input listeners
  totalInput.addEventListener("input", calculate);
  peopleInput.addEventListener("input", calculate);
  discountInput.addEventListener("input", calculate);

  // Stepper buttons
  container.querySelector("#minus-person-btn").addEventListener("click", () => {
    let cur = parseInt(peopleInput.value, 10) || 1;
    if (cur > 1) {
      peopleInput.value = cur - 1;
      calculate();
    }
  });

  container.querySelector("#plus-person-btn").addEventListener("click", () => {
    let cur = parseInt(peopleInput.value, 10) || 1;
    peopleInput.value = cur + 1;
    calculate();
  });

  // Preset quick chips
  container.querySelectorAll("[data-add]").forEach(chip => {
    chip.addEventListener("click", () => {
      const add = parseFloat(chip.getAttribute("data-add")) || 0;
      const cur = parseFloat(totalInput.value) || 0;
      totalInput.value = (cur + add).toFixed(2);
      calculate();
    });
  });

  container.querySelector("#clear-amount-btn")?.addEventListener("click", () => {
    totalInput.value = "";
    calculate();
  });

  // People presets
  container.querySelectorAll(".people-preset").forEach(chip => {
    chip.addEventListener("click", () => {
      peopleInput.value = chip.getAttribute("data-people");
      calculate();
    });
  });

  // Service Charge toggle
  const serviceBtn = container.querySelector("#toggle-service-btn");
  serviceBtn?.addEventListener("click", () => {
    serviceChargePct = serviceChargePct === 0 ? 10 : 0;
    serviceBtn.classList.toggle("active", serviceChargePct > 0);
    calculate();
  });

  // VAT toggle
  const vatBtn = container.querySelector("#toggle-vat-btn");
  vatBtn?.addEventListener("click", () => {
    vatPct = vatPct === 0 ? 7 : 0;
    vatBtn.classList.toggle("active", vatPct > 0);
    calculate();
  });

  // Back button
  container.querySelector("#split-back-btn").addEventListener("click", () => {
    router.navigate("settings");
  });

  // Copy share message
  container.querySelector("#copy-summary-btn").addEventListener("click", () => {
    const base = parseFloat(totalInput.value) || 0;
    const people = parseInt(peopleInput.value, 10) || 1;
    const discount = parseFloat(discountInput.value) || 0;

    let subtotal = Math.max(0, base - discount);
    if (serviceChargePct > 0) subtotal += subtotal * (serviceChargePct / 100);
    if (vatPct > 0) subtotal += subtotal * (vatPct / 100);
    const perPerson = subtotal / people;

    const ppId = container.querySelector("#promptpay-id-input")?.value || store.settings.promptPayId || "";

    const text = language === 'en'
      ? `🍽️ FinTrack Bill Split Summary:\n• Total Bill: ${sym}${subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n• Split among: ${people} people\n👉 Each person pays: ${sym}${perPerson.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${ppId ? `\n• PromptPay: ${ppId}` : ''}`
      : `🍽️ สรุปหารบิล FinTrack:\n• ยอดรวมสุทธิ: ${sym}${subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n• หารทั้งหมด: ${people} คน\n👉 จ่ายคนละ: ${sym}${perPerson.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${ppId ? `\n• พร้อมเพย์: ${ppId}` : ''}`;

    navigator.clipboard.writeText(text).then(() => {
      alerts.success(language === 'en' ? 'Summary Copied!' : 'คัดลอกข้อความสรุปเรียบร้อยแล้ว 📋');
    }).catch(() => {
      alerts.info(text);
    });
  });

  // Toggle PromptPay QR
  const qrSection = container.querySelector("#promptpay-qr-section");
  container.querySelector("#toggle-promptpay-btn")?.addEventListener("click", () => {
    const isHidden = qrSection.style.display === "none";
    qrSection.style.display = isHidden ? "block" : "none";
    if (isHidden) {
      const base = parseFloat(totalInput.value) || 0;
      const people = parseInt(peopleInput.value, 10) || 1;
      const perPerson = base / people;
      updateQRCode(perPerson);
    }
  });

  const promptPayInput = container.querySelector("#promptpay-id-input");
  promptPayInput?.addEventListener("input", () => {
    store.settings.promptPayId = promptPayInput.value.trim();
    store.save();
    const base = parseFloat(totalInput.value) || 0;
    const people = parseInt(peopleInput.value, 10) || 1;
    updateQRCode(base / people);
  });

  function updateQRCode(amount) {
    const canvas = container.querySelector("#promptpay-qr-canvas");
    if (!canvas || qrSection.style.display === "none") return;

    const targetId = promptPayInput?.value.trim() || DEFAULT_PROMPTPAY_ID;
    const qrCaption = container.querySelector("#qr-amount-caption");

    if (qrCaption) {
      qrCaption.textContent = `${sym}${amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${language === 'en' ? 'person' : 'คน'}`;
    }

    try {
      const payload = generatePromptPayPayload(targetId, amount > 0 ? amount.toFixed(2) : undefined);
      QRCode.toCanvas(canvas, payload, {
        width: 180,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
    } catch (e) {
      console.error("QR gen error:", e);
    }
  }

  // Initial calculation
  calculate();
}
