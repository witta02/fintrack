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

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog" style="max-width: 380px; width: 92%; padding: 22px; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); box-shadow: var(--card-shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 class="modal-title" style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0;">${t("taxSettingsTitle")}</h3>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-secondary); font-size: 22px; cursor: pointer;">&times;</button>
      </div>
      
      <p style="font-size: 11.5px; color: var(--text-secondary); margin: 0 0 14px 0; line-height: 1.4;">
        ${t("taxSettingsContext")}
      </p>

      <form id="tax-settings-form" style="display: flex; flex-direction: column; gap: 10px; max-height: 55vh; overflow-y: auto; padding-right: 4px;">
        <div>
          <label class="form-label" style="font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; display: block; text-transform: uppercase;">${t('taxPersonalLabel')}</label>
          <input type="number" id="tax-personal" class="tax-calc-input" style="width: 100%; font-size: 13px; font-weight: 700; padding: 9px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" value="${personal}" placeholder="60000" />
          <small style="color: var(--text-muted); font-size: 10px; display: block; margin-top: 3px;">${t("taxPersonalDeductionHint")}</small>
        </div>

        <div>
          <label class="form-label" style="font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; display: block; text-transform: uppercase;">${t('taxSocialSecurityLabel')}</label>
          <input type="number" id="tax-ssf" class="tax-calc-input" style="width: 100%; font-size: 13px; font-weight: 700; padding: 9px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" value="${ssf}" placeholder="9000" />
        </div>

        <div>
          <label class="form-label" style="font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; display: block; text-transform: uppercase;">${t('taxProvidentFundLabel')}</label>
          <input type="number" id="tax-pvd" class="tax-calc-input" style="width: 100%; font-size: 13px; font-weight: 700; padding: 9px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" value="${pvd}" placeholder="0" />
        </div>

        <div>
          <label class="form-label" style="font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; display: block; text-transform: uppercase;">${t('taxMutualFundsLabel')}</label>
          <input type="number" id="tax-mf" class="tax-calc-input" style="width: 100%; font-size: 13px; font-weight: 700; padding: 9px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" value="${mf}" placeholder="0" />
        </div>

        <div>
          <label class="form-label" style="font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; display: block; text-transform: uppercase;">${t('taxOtherDeductionsLabel')}</label>
          <input type="number" id="tax-other" class="tax-calc-input" style="width: 100%; font-size: 13px; font-weight: 700; padding: 9px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" value="${other}" placeholder="0" />
        </div>

        <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
          <strong style="font-size: 11.5px; color: var(--gold);">${t('taxTotalDeductions')}</strong>
          <strong style="font-size: 14px; color: var(--gold);" id="tax-total-deduction-display">${sym}0.00</strong>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <button type="button" class="btn-secondary modal-close-btn" style="flex: 1; padding: 10px; border-radius: var(--radius); font-size: 12px; font-weight: 800;">
            ${t("cancel")}
          </button>
          <button type="submit" class="btn-primary" style="flex: 1; padding: 10px; border-radius: var(--radius); font-size: 12px; font-weight: 800; background: var(--gold); color: #000; border: none; box-shadow: var(--btn-shadow);">
            ${t("save")}
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const calculateTotal = () => {
    const personalVal = parseFloat(modal.querySelector("#tax-personal").value) || 0;
    const ssfVal = parseFloat(modal.querySelector("#tax-ssf").value) || 0;
    const pvdVal = parseFloat(modal.querySelector("#tax-pvd").value) || 0;
    const mfVal = parseFloat(modal.querySelector("#tax-mf").value) || 0;
    const otherVal = parseFloat(modal.querySelector("#tax-other").value) || 0;
    const total = personalVal + ssfVal + pvdVal + mfVal + otherVal;
    modal.querySelector("#tax-total-deduction-display").textContent =
      `${sym}${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  modal.querySelectorAll(".tax-calc-input").forEach((inp) => {
    inp.addEventListener("input", calculateTotal);
  });
  calculateTotal();

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

    store.updateTaxSettings(personalVal, ssfVal, pvdVal, mfVal, otherVal);
    alerts.success(t("taxSaveSuccess"));
    close();
  };
}
