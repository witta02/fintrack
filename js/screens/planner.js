import { store } from "../store.js";
import { getCategoryInfo, getExpenseCategories } from "../categories.js";
import { t, getLanguage } from "../i18n.js";
import { router } from "../router.js";
import { alerts } from "../utils/alertHelper.js";

export function renderPlanner(container) {
  const isEn = store.settings.language === "en";
  const sym = store.getCurrencySymbol();
  const lang = getLanguage();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const txs = store.getAllTransactions().filter(t => new Date(t.date) >= monthStart && !t.isIncome);

  // Category spend map for this month
  const catSpendMap = {};
  txs.forEach(t => {
    const cat = t.category || "Other";
    catSpendMap[cat] = (catSpendMap[cat] || 0) + (parseFloat(t.amount) || 0);
  });

  const categoryBudgets = store.getCategoryBudgets();
  const expenseCats = getExpenseCategories();

  // 50/30/20 Rule state
  const totalMonthIncome = store.getAllTransactions()
    .filter(t => new Date(t.date) >= monthStart && t.isIncome)
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) || 30000;

  const needs = totalMonthIncome * 0.5;
  const wants = totalMonthIncome * 0.3;
  const savings = totalMonthIncome * 0.2;

  // Active Category Budgets summary
  const budgetEntries = Object.entries(categoryBudgets);
  const totalBudgeted = budgetEntries.reduce((sum, [, val]) => sum + (parseFloat(val) || 0), 0);
  const totalBudgetSpent = budgetEntries.reduce((sum, [cat]) => sum + (catSpendMap[cat] || 0), 0);

  container.innerHTML = `
    <div class="screen screen-enter planner-screen-wrap" style="padding: 0 16px 100px;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0 16px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <button id="planner-back-btn" class="icon-btn" style="background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: var(--radius);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 style="font-size: 20px; font-weight: 900; letter-spacing: -0.5px; color: var(--text-primary); margin: 0;">
            ${isEn ? 'Budget & Limits' : 'งบประมาณ & ลิมิตรายจ่าย'}
          </h1>
        </div>
        <button id="add-budget-limit-btn" class="btn-primary" style="padding: 8px 14px; font-size: 12px; font-weight: 800; border-radius: 999px; background: var(--gold); color: #000; border: none; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: var(--btn-shadow);">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          ${isEn ? 'Set Limit' : 'ตั้งงบหมวดหมู่'}
        </button>
      </div>

      <!-- Overview Budget Hero Card -->
      <div style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 20px; box-shadow: var(--card-shadow); margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">
              ${isEn ? 'Monthly Budget Status' : 'สถานะงบประมาณเดือนนี้'}
            </div>
            <div style="font-size: 26px; font-weight: 900; color: var(--text-primary); font-family: var(--font-heading); margin-top: 2px;">
              ${sym}${totalBudgetSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span style="font-size: 14px; font-weight: 700; color: var(--text-secondary);">/ ${sym}${totalBudgeted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div style="padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; background: ${totalBudgetSpent > totalBudgeted && totalBudgeted > 0 ? 'var(--expense-soft)' : 'var(--income-soft)'}; color: ${totalBudgetSpent > totalBudgeted && totalBudgeted > 0 ? 'var(--expense)' : 'var(--income)'}; border: 1px solid ${totalBudgetSpent > totalBudgeted && totalBudgeted > 0 ? 'var(--expense)' : 'var(--income)'};">
            ${totalBudgeted > 0 ? `${Math.min(999, Math.round((totalBudgetSpent / totalBudgeted) * 100))}%` : (isEn ? 'No budget limit' : 'ยังไม่ตั้งงบ')}
          </div>
        </div>

        <!-- Progress Bar -->
        ${totalBudgeted > 0 ? `
          <div style="height: 10px; background: var(--bg-secondary); border-radius: 999px; overflow: hidden; margin-top: 10px;">
            <div style="height: 100%; width: ${Math.min(100, Math.round((totalBudgetSpent / totalBudgeted) * 100))}%; background: ${totalBudgetSpent > totalBudgeted ? 'var(--expense)' : 'linear-gradient(90deg, var(--income), var(--gold))'}; border-radius: 999px; transition: width 0.5s ease;"></div>
          </div>
        ` : ''}
      </div>

      <!-- 1. Category Budgets Section -->
      <div style="margin-bottom: 24px;">
        <div style="font-size: 13px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; padding: 0 4px;">
          ${isEn ? 'Category Limits' : 'งบประมาณแยกตามหมวดหมู่'}
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${budgetEntries.length === 0 ? `
            <div style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 12.5px; font-weight: 700;">
              ${isEn ? 'No category budgets set yet. Tap "Set Limit" to define spending caps.' : 'ยังไม่มีการตั้งงบหมวดหมู่ แตะ "ตั้งงบหมวดหมู่" เพื่อเริ่มควบคุมรายจ่าย'}
            </div>
          ` : budgetEntries.map(([catName, limit]) => {
            const info = getCategoryInfo(catName);
            const spent = catSpendMap[catName] || 0;
            const lim = parseFloat(limit) || 1;
            const pct = Math.min(100, Math.round((spent / lim) * 100));
            const isOver = spent > lim;

            return `
              <div class="category-budget-card" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 16px; box-shadow: var(--card-shadow);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 36px; height: 36px; border-radius: 10px; background: ${info.color}18; color: ${info.color}; display: flex; align-items: center; justify-content: center; padding: 6px; box-sizing: border-box;">
                      ${info.svg || ''}
                    </div>
                    <div>
                      <div style="font-size: 13.5px; font-weight: 800; color: var(--text-primary);">${info.label || catName}</div>
                      <div style="font-size: 11px; color: ${isOver ? 'var(--expense)' : 'var(--text-secondary)'}; font-weight: 700;">
                        ${isOver ? (isEn ? `Exceeded by ${sym}${(spent - lim).toLocaleString()}` : `เกินงบ ${sym}${(spent - lim).toLocaleString()}`) : (isEn ? `Left: ${sym}${(lim - spent).toLocaleString()}` : `คงเหลือ: ${sym}${(lim - spent).toLocaleString()}`)}
                      </div>
                    </div>
                  </div>

                  <div style="text-align: right;">
                    <div style="font-size: 13.5px; font-weight: 900; font-family: var(--font-heading); color: ${isOver ? 'var(--expense)' : 'var(--text-primary)'};">
                      ${sym}${spent.toLocaleString()} / ${sym}${lim.toLocaleString()}
                    </div>
                    <button class="edit-cat-budget-btn" data-cat="${catName}" data-limit="${lim}" style="background: none; border: none; color: var(--gold); font-size: 11px; font-weight: 800; cursor: pointer; padding: 2px 0;">
                      ${isEn ? 'Edit' : 'แก้ไข'}
                    </button>
                  </div>
                </div>

                <!-- Bar -->
                <div style="height: 6px; background: var(--bg-secondary); border-radius: 999px; overflow: hidden;">
                  <div style="height: 100%; width: ${pct}%; background: ${isOver ? 'var(--expense)' : (pct > 80 ? 'var(--gold)' : 'var(--income)')}; border-radius: 999px; transition: width 0.4s ease;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- 2. 50/30/20 Budgeting Rule Card -->
      <div style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 20px; box-shadow: var(--card-shadow); margin-bottom: 20px;">
        <div style="font-size: 13px; font-weight: 800; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          ${isEn ? '50/30/20 Smart Allocation' : 'สัดส่วนงบประมาณ 50/30/20'}
        </div>
        <p style="font-size: 11.5px; color: var(--text-secondary); margin: 0 0 14px 0; line-height: 1.4;">
          ${isEn ? 'Calculated based on your monthly income baseline:' : 'คำนวณจากฐานรายรับประจำเดือนของคุณ:'}
        </p>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
          <!-- 50% Needs -->
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 14px 10px; text-align: center;">
            <div style="font-size: 11px; font-weight: 800; color: var(--income); margin-bottom: 2px;">50% ${isEn ? 'Needs' : 'จำเป็น'}</div>
            <div style="font-size: 14px; font-weight: 900; font-family: var(--font-heading); color: var(--text-primary);">
              ${sym}${needs.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div style="font-size: 9.5px; color: var(--text-muted); margin-top: 4px;">${isEn ? 'Rent, Food, Bills' : 'ค่าบ้าน บิล อาหาร'}</div>
          </div>

          <!-- 30% Wants -->
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 14px 10px; text-align: center;">
            <div style="font-size: 11px; font-weight: 800; color: var(--gold); margin-bottom: 2px;">30% ${isEn ? 'Wants' : 'ต้องการ'}</div>
            <div style="font-size: 14px; font-weight: 900; font-family: var(--font-heading); color: var(--text-primary);">
              ${sym}${wants.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div style="font-size: 9.5px; color: var(--text-muted); margin-top: 4px;">${isEn ? 'Dining, Travel' : 'ช้อปปิ้ง บันเทิง'}</div>
          </div>

          <!-- 20% Savings -->
          <div style="background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 14px 10px; text-align: center;">
            <div style="font-size: 11px; font-weight: 800; color: #818cf8; margin-bottom: 2px;">20% ${isEn ? 'Savings' : 'เงินออม'}</div>
            <div style="font-size: 14px; font-weight: 900; font-family: var(--font-heading); color: var(--text-primary);">
              ${sym}${savings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div style="font-size: 9.5px; color: var(--text-muted); margin-top: 4px;">${isEn ? 'Invest & Vaults' : 'ลงทุน & กระปุก'}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Event Listeners
  container.querySelector('#planner-back-btn')?.addEventListener('click', () => {
    router.navigate('dashboard');
  });

  container.querySelector('#add-budget-limit-btn')?.addEventListener('click', () => {
    showSetBudgetModal(container);
  });

  container.querySelectorAll('.edit-cat-budget-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-cat');
      const curLim = btn.getAttribute('data-limit');
      showSetBudgetModal(container, cat, curLim);
    });
  });
}

function showSetBudgetModal(container, presetCat = null, presetLimit = null) {
  const isEn = store.settings.language === "en";
  const sym = store.getCurrencySymbol();
  const cats = getExpenseCategories();

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-2xl); padding: 24px; max-width: 340px; width: 90%; box-shadow: var(--card-shadow);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin: 0;">
          ${isEn ? 'Set Category Budget' : 'ตั้งงบประมาณรายหมวดหมู่'}
        </h3>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-secondary); font-size: 22px; cursor: pointer;">&times;</button>
      </div>

      <div style="margin-bottom: 14px;">
        <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">
          ${isEn ? 'Category' : 'หมวดหมู่'}
        </label>
        <select id="budget-cat-select" style="width: 100%; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 13px; font-weight: 700;">
          ${cats.map(c => `<option value="${c.name}" style="background: var(--card); color: var(--text-primary);" ${presetCat === c.name ? 'selected' : ''}>${c.label || c.name}</option>`).join('')}
        </select>
      </div>

      <div style="margin-bottom: 18px;">
        <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">
          ${isEn ? 'Monthly Limit' : 'วงเงินจำกัดรายเดือน'}
        </label>
        <div style="position: relative;">
          <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-weight: 800; color: var(--text-secondary);">${sym}</span>
          <input id="budget-limit-input" type="number" step="100" min="0" value="${presetLimit || ''}" placeholder="5000" style="width: 100%; padding: 10px 12px 10px 28px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-size: 14px; font-weight: 800;" />
        </div>
      </div>

      <div style="display: flex; gap: 8px;">
        ${presetCat ? `
          <button id="delete-budget-btn" style="flex: 1; padding: 12px; border-radius: var(--radius); background: var(--expense-soft); color: var(--expense); border: 1px solid var(--expense); font-weight: 800; font-size: 12.5px; cursor: pointer;">
            ${isEn ? 'Remove' : 'ลบงบนี้'}
          </button>
        ` : ''}
        <button id="save-budget-btn" class="btn-primary" style="flex: 2; padding: 12px; border-radius: var(--radius); background: var(--gold); color: #000; font-weight: 800; font-size: 13px; border: none; cursor: pointer; box-shadow: var(--btn-shadow);">
          ${isEn ? 'Save Limit' : 'บันทึกงบประมาณ'}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector(".modal-close-btn").onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  modal.querySelector("#save-budget-btn")?.addEventListener("click", () => {
    const cat = modal.querySelector("#budget-cat-select")?.value;
    const limitVal = parseFloat(modal.querySelector("#budget-limit-input")?.value);
    if (isNaN(limitVal) || limitVal < 0) {
      alerts.error(isEn ? "Please enter a valid amount" : "กรุณาระบุจำนวนเงินที่ถูกต้อง");
      return;
    }
    store.setCategoryBudget(cat, limitVal);
    close();
    alerts.success(isEn ? "Category budget saved!" : "บันทึกงบประมาณเรียบร้อยแล้ว!");
    renderPlanner(container);
  });

  modal.querySelector("#delete-budget-btn")?.addEventListener("click", () => {
    const cat = modal.querySelector("#budget-cat-select")?.value;
    store.setCategoryBudget(cat, 0);
    close();
    alerts.success(isEn ? "Category budget removed" : "ลบงบประมาณหมวดหมู่นี้แล้ว");
    renderPlanner(container);
  });
}
