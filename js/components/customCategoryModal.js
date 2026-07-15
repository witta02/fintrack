import { store } from "../store.js";
import { t } from "../i18n.js";
import { alerts } from "../utils/alertHelper.js";

export function showCustomCategoryModal(onSave) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  const lang = store.settings.language;

  modal.innerHTML = `
    <div class="modal-dialog" style="max-width: 400px; padding: 22px; text-align: left;">
      <div class="modal-header">
        <h3 class="modal-title">${lang === 'en' ? 'Add Custom Category' : 'เพิ่มหมวดหมู่กำหนดเอง'}</h3>
        <button class="modal-close-btn">×</button>
      </div>
      
      <div style="display: flex; flex-direction: column; gap: 10px; padding-top: 14px;">
        <input type="text" id="new-cat-name" placeholder="${lang === 'en' ? 'Category Name' : 'ชื่อหมวดหมู่'}" style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: var(--text-primary); font-size: 14px;">
        
        <div style="display: flex; gap: 10px;">
          <input type="text" id="new-cat-emoji" placeholder="Emoji 🎨" style="width: 80px; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: var(--text-primary); font-size: 14px; text-align: center;">
          <input type="color" id="new-cat-color" value="#BC8CFF" style="flex: 1; height: 44px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); cursor: pointer; padding: 0;">
          <select id="new-cat-type" style="flex: 2; padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); color: var(--text-primary); font-size: 14px;">
            <option value="expense">${t('expense')}</option>
            <option value="income">${t('income')}</option>
          </select>
        </div>
        
        <button id="add-custom-cat-btn" class="btn-primary" style="padding: 12px; font-size: 13px; font-weight: 700; border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 8px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          ${lang === 'en' ? 'Add Category' : 'เพิ่มหมวดหมู่'}
        </button>
      </div>

      <div style="margin-top: 24px;">
        <div style="font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">${lang === 'en' ? 'Your Custom Categories' : 'หมวดหมู่กำหนดเองของคุณ'}</div>
        <div id="custom-categories-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto;">
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => document.body.removeChild(modal);
  modal.querySelector(".modal-close-btn").onclick = close;

  const renderCats = () => {
    const list = modal.querySelector("#custom-categories-list");
    if (!list) return;
    list.innerHTML = "";
    const cats = store.settings.customCategories || [];
    if (cats.length === 0) {
      list.innerHTML = `<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 12px 0;">${lang === 'en' ? 'No custom categories yet.' : 'ยังไม่มีหมวดหมู่ที่กำหนดเอง'}</div>`;
    } else {
      cats.forEach((cat, idx) => {
        const item = document.createElement("div");
        item.style.cssText = `display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 10px; background: rgba(0,0,0,0.02); border: 1px solid var(--border);`;
        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 28px; height: 28px; border-radius: 8px; background: ${cat.color}22; color: ${cat.color}; display: flex; align-items: center; justify-content: center; font-size: 14px;">
              ${cat.emoji}
            </div>
            <div>
              <div style="font-size: 12px; font-weight: 600; color: var(--text-primary);">${cat.name}</div>
              <div style="font-size: 10px; color: var(--text-secondary);">${cat.isIncome ? t('income') : t('expense')}</div>
            </div>
          </div>
          <button class="delete-cat-btn" data-idx="${idx}" style="background: transparent; border: none; color: var(--expense); cursor: pointer; padding: 4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        `;
        list.appendChild(item);
      });

      list.querySelectorAll(".delete-cat-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
          const idx = parseInt(e.currentTarget.getAttribute("data-idx"));
          const isConfirmed = await alerts.confirmDelete(
            lang === 'en' ? 'Delete Category?' : 'ลบหมวดหมู่?',
            lang === 'en' ? 'Are you sure you want to delete this custom category?' : 'คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่นี้?'
          );
          if (isConfirmed) {
            cats.splice(idx, 1);
            store.settings.customCategories = cats;
            store.save();
            if (store.user) store.saveSettingsToCloud();
            renderCats();
            if (onSave) onSave();
          }
        });
      });
    }
  };

  renderCats();

  modal.querySelector("#add-custom-cat-btn").addEventListener("click", () => {
    const name = modal.querySelector("#new-cat-name").value.trim();
    const emoji = modal.querySelector("#new-cat-emoji").value.trim() || '📦';
    const color = modal.querySelector("#new-cat-color").value;
    const type = modal.querySelector("#new-cat-type").value;
    
    if (!name) {
      alerts.error(lang === 'en' ? 'Error' : 'ผิดพลาด', lang === 'en' ? 'Category name is required' : 'กรุณากรอกชื่อหมวดหมู่');
      return;
    }
    
    const cats = store.settings.customCategories || [];
    if (cats.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      alerts.error(lang === 'en' ? 'Error' : 'ผิดพลาด', lang === 'en' ? 'Category already exists' : 'มีหมวดหมู่นี้อยู่แล้ว');
      return;
    }
    
    cats.push({
      name: name,
      label: name,
      emoji: emoji,
      color: color,
      isIncome: type === 'income',
      isCustom: true
    });
    
    store.settings.customCategories = cats;
    store.save();
    if (store.user) store.saveSettingsToCloud();
    
    modal.querySelector("#new-cat-name").value = '';
    modal.querySelector("#new-cat-emoji").value = '';
    renderCats();
    if (onSave) onSave();
  });
}
