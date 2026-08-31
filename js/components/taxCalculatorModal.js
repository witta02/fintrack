import { store } from "../store.js";
import { t } from "../i18n.js";
import { alerts } from "../utils/alertHelper.js";

export function showTaxCalculatorModal() {
  const isEn = store.settings.language === "en";
  const sym = store.getCurrencySymbol();
  const s = store.settings;
  const getVal = (val, def) => (val !== undefined && val !== null ? val : def);

  const personal = getVal(s.taxPersonalDeduction, s.taxDeduction || 60000);
  const ssf = getVal(s.taxSocialSecurity, 9000);
  const pvd = getVal(s.taxProvidentFund, 0);
  const mf = getVal(s.taxMutualFunds, 0);
  const other = getVal(s.taxOtherDeductions, 0);

  // Compute estimated annual income from transactions of current year
  const now = new Date();
  const currentYear = now.getFullYear();
  const yearTxs = store.getAllTransactions().filter(t => {
    if (!t || !t.date) return false;
    const d = new Date(t.date);
    return !isNaN(d) && d.getFullYear() === currentYear;
  });
  const actualYTDIncome = yearTxs.filter(t => t.isIncome).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  
  // Annualized estimate (or 360,000 THB default fallback ~30k/mo)
  const defaultAnnualSalary = actualYTDIncome > 0 ? Math.round(actualYTDIncome) : 360000;

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog" style="max-width: 440px; width: 94%; max-height: 90vh; overflow-y: auto; padding: 22px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); box-shadow: var(--card-shadow);">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(59, 130, 246, 0.15); color: #3b82f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"/></svg>
          </div>
          <div>
            <h3 class="modal-title" style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0;">
              ${isEn ? 'Personal Tax Planner' : 'วางแผนภาษีเงินได้บุคคลธรรมดา'}
            </h3>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">
              ${isEn ? '2026 Progressive Thai Tax Calculator' : 'คำนวณอัตราภาษีขั้นบันไดปี 2569 (ภ.ง.ด. 90/91)'}
            </div>
          </div>
        </div>
        <button class="modal-close-btn" style="background: var(--surface); border: 1px solid var(--border); border-radius: 50%; width: 30px; height: 30px; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <!-- Live Tax Result Summary Card -->
      <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(124, 92, 252, 0.12) 100%); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: var(--radius-xl); padding: 16px; margin-bottom: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">
              ${isEn ? 'Estimated Tax to Pay' : 'ภาษีที่ต้องชำระโดยประมาณ'}
            </div>
            <div id="live-tax-payable" style="font-size: 26px; font-weight: 900; color: var(--gold); font-family: var(--font-heading); margin-top: 2px;">
              ${sym}0.00
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 10.5px; font-weight: 700; color: var(--text-secondary);">
              ${isEn ? 'Effective Rate' : 'อัตราภาษีเฉลี่ย'}
            </div>
            <div id="live-effective-rate" style="font-size: 16px; font-weight: 900; color: var(--text-primary); font-family: var(--font-heading); margin-top: 2px;">
              0.0%
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 11px;">
          <div>
            <span style="color: var(--text-secondary);">${isEn ? 'Net Taxable Income:' : 'เงินได้สุทธิ:'}</span>
            <strong id="live-net-taxable" style="color: var(--text-primary); display: block; font-family: var(--font-heading); margin-top: 1px;">${sym}0</strong>
          </div>
          <div style="text-align: right;">
            <span style="color: var(--text-secondary);">${isEn ? 'Total Deductions:' : 'ลดหย่อนรวม:'}</span>
            <strong id="live-total-deductions" style="color: var(--income); display: block; font-family: var(--font-heading); margin-top: 1px;">${sym}0</strong>
          </div>
        </div>
      </div>

      <!-- Form Inputs -->
      <form id="tax-settings-form" style="display: flex; flex-direction: column; gap: 12px;">
        <!-- Annual Income Input -->
        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label" style="font-size: 11.5px; font-weight: 800; color: var(--text-primary); margin: 0;">
              ${isEn ? 'Estimated Annual Income' : 'รายได้รวมทั้งปี (ก่อนหักภาษี)'}
            </label>
            <span style="font-size: 10px; color: var(--text-muted);">${isEn ? 'Salary + Bonuses' : 'เงินเดือน + โบนัส'}</span>
          </div>
          <input type="number" id="tax-annual-income" class="tax-calc-input" style="width: 100%; font-size: 14px; font-weight: 800; padding: 9px 12px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-family: var(--font-heading);" value="${defaultAnnualSalary}" placeholder="360000" />
        </div>

        <div style="font-size: 12px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">
          ${isEn ? 'Deduction Allowances' : 'รายการหักค่าลดหย่อน'}
        </div>

        <!-- 1. Personal Allowance -->
        <div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <label class="form-label" style="font-size: 11px; font-weight: 700; color: var(--text-secondary); margin: 0;">${isEn ? 'Personal Allowance' : 'ลดหย่อนส่วนตัว'}</label>
            <span style="font-size: 10px; color: var(--text-muted);">${isEn ? 'Standard: 60,000' : 'เกณฑ์มาตรฐาน: 60,000'}</span>
          </div>
          <input type="number" id="tax-personal" class="tax-calc-input" style="width: 100%; font-size: 13px; font-weight: 700; padding: 9px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" value="${personal}" placeholder="60000" />
        </div>

        <!-- 2. Social Security -->
        <div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <label class="form-label" style="font-size: 11px; font-weight: 700; color: var(--text-secondary); margin: 0;">${isEn ? 'Social Security Fund (SSF)' : 'ประกันสังคม (สูงสุด 9,000)'}</label>
            <span style="font-size: 10px; color: var(--text-muted);">${isEn ? 'Max: 9,000' : 'สูงสุด 9,000'}</span>
          </div>
          <input type="number" id="tax-ssf" class="tax-calc-input" style="width: 100%; font-size: 13px; font-weight: 700; padding: 9px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" value="${ssf}" placeholder="9000" />
        </div>

        <!-- 3. Provident Fund -->
        <div>
          <label class="form-label" style="font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; display: block;">${isEn ? 'Provident Fund (PVD) / GPF' : 'กองทุนสำรองเลี้ยงชีพ (PVD / กบข.)'}</label>
          <input type="number" id="tax-pvd" class="tax-calc-input" style="width: 100%; font-size: 13px; font-weight: 700; padding: 9px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" value="${pvd}" placeholder="0" />
        </div>

        <!-- 4. Mutual Funds -->
        <div>
          <label class="form-label" style="font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; display: block;">${isEn ? 'Mutual Funds (SSF / RMF / Thai ESG)' : 'กองทุนลดหย่อนภาษี (SSF / RMF / Thai ESG)'}</label>
          <input type="number" id="tax-mf" class="tax-calc-input" style="width: 100%; font-size: 13px; font-weight: 700; padding: 9px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" value="${mf}" placeholder="0" />
        </div>

        <!-- 5. Other Deductions -->
        <div>
          <label class="form-label" style="font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; display: block;">${isEn ? 'Other Deductions (Insurance, Donations)' : 'ลดหย่อนอื่นๆ (ประกันชีวิต, ดอกเบี้ยบ้าน, บริจาค)'}</label>
          <input type="number" id="tax-other" class="tax-calc-input" style="width: 100%; font-size: 13px; font-weight: 700; padding: 9px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" value="${other}" placeholder="0" />
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <button type="button" class="btn-secondary modal-close-btn" style="flex: 1; padding: 11px; border-radius: var(--radius); font-size: 12px; font-weight: 800; background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); cursor: pointer;">
            ${isEn ? 'Close' : 'ปิด'}
          </button>
          <button type="submit" class="btn-primary" style="flex: 1; padding: 11px; border-radius: var(--radius); font-size: 12px; font-weight: 800; background: var(--gold); color: #000; border: none; box-shadow: var(--btn-shadow); cursor: pointer;">
            ${isEn ? 'Save Deductions' : 'บันทึกค่าลดหย่อน'}
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Progressive Tax Computation Function (2026 Revenue Department rates)
  const computeLiveTax = () => {
    const annualIncome = Math.max(0, parseFloat(modal.querySelector("#tax-annual-income")?.value) || 0);
    const personalVal = Math.max(0, parseFloat(modal.querySelector("#tax-personal")?.value) || 0);
    const ssfVal = Math.max(0, parseFloat(modal.querySelector("#tax-ssf")?.value) || 0);
    const pvdVal = Math.max(0, parseFloat(modal.querySelector("#tax-pvd")?.value) || 0);
    const mfVal = Math.max(0, parseFloat(modal.querySelector("#tax-mf")?.value) || 0);
    const otherVal = Math.max(0, parseFloat(modal.querySelector("#tax-other")?.value) || 0);

    // Standard expense deduction: 50% max 100,000 THB
    const standardExpense = Math.min(annualIncome * 0.5, 100000);
    const customDeductions = personalVal + ssfVal + pvdVal + mfVal + otherVal;
    const totalDeductions = standardExpense + customDeductions;
    const netTaxableIncome = Math.max(0, annualIncome - totalDeductions);

    // Progressive Brackets
    const taxBrackets = [
      { min: 0, max: 150000, rate: 0 },
      { min: 150000, max: 300000, rate: 0.05 },
      { min: 300000, max: 500000, rate: 0.10 },
      { min: 500000, max: 750000, rate: 0.15 },
      { min: 750000, max: 1000000, rate: 0.20 },
      { min: 1000000, max: 2000000, rate: 0.25 },
      { min: 2000000, max: 5000000, rate: 0.30 },
      { min: 5000000, max: Infinity, rate: 0.35 },
    ];

    let totalTax = 0;
    taxBrackets.forEach(b => {
      if (netTaxableIncome > b.min) {
        const taxableInBracket = Math.min(netTaxableIncome, b.max) - b.min;
        if (taxableInBracket > 0) {
          totalTax += taxableInBracket * b.rate;
        }
      }
    });

    const effectiveRate = annualIncome > 0 ? ((totalTax / annualIncome) * 100).toFixed(1) : '0.0';

    // Update UI elements
    const payableEl = modal.querySelector("#live-tax-payable");
    const rateEl = modal.querySelector("#live-effective-rate");
    const netEl = modal.querySelector("#live-net-taxable");
    const dedEl = modal.querySelector("#live-total-deductions");

    if (payableEl) payableEl.textContent = `${sym}${totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (rateEl) rateEl.textContent = `${effectiveRate}%`;
    if (netEl) netEl.textContent = `${sym}${netTaxableIncome.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    if (dedEl) dedEl.textContent = `${sym}${totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  modal.querySelectorAll(".tax-calc-input").forEach((inp) => {
    inp.addEventListener("input", computeLiveTax);
  });
  computeLiveTax();

  const close = () => modal.remove();
  modal.querySelectorAll(".modal-close-btn").forEach((b) => (b.onclick = close));
  modal.onclick = (e) => { if (e.target === modal) close(); };

  modal.querySelector("#tax-settings-form").onsubmit = (e) => {
    e.preventDefault();
    const personalVal = parseFloat(modal.querySelector("#tax-personal").value) || 0;
    const ssfVal = parseFloat(modal.querySelector("#tax-ssf").value) || 0;
    const pvdVal = parseFloat(modal.querySelector("#tax-pvd").value) || 0;
    const mfVal = parseFloat(modal.querySelector("#tax-mf").value) || 0;
    const otherVal = parseFloat(modal.querySelector("#tax-other").value) || 0;

    store.updateTaxDeduction(personalVal, ssfVal, pvdVal, mfVal, otherVal);
    alerts.success(isEn ? "Tax allowances saved successfully!" : "บันทึกค่าลดหย่อนภาษีเรียบร้อยแล้ว");
    close();
  };
}
