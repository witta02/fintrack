import { store } from "../store.js";
import { t, getLanguage } from "../i18n.js";
import { router } from "../router.js";

// Master list of all possible collectibles
export const gachaItems = [
  { id: "coffee", name: { en: "Coffee Badge", th: "ตรากาแฟ" }, icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`, rarity: "common" },
  { id: "plant", name: { en: "Plant Badge", th: "ตราต้นไม้" }, icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 10v12"/><path d="M12 10a6 6 0 0 0-6-6H3v3a6 6 0 0 0 6 6h3z"/><path d="M12 14a6 6 0 0 1 6-6h3v3a6 6 0 0 1-6 6h-3z"/></svg>`, rarity: "common" },
  { id: "duck", name: { en: "Navigator Badge", th: "ตรานำทาง" }, icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`, rarity: "common" },
  
  { id: "skateboard", name: { en: "Cruiser Badge", th: "ตราสเก็ตบอร์ด" }, icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="8" x="2" y="8" rx="4"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>`, rarity: "rare" },
  { id: "cat", name: { en: "Mascot Badge", th: "ตราแมวนำโชค" }, icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 4-.42 4 .57 1.07 1 2.24 1 3.5C21 16.08 16.97 20 12 20s-9-3.92-9-9.5c0-1.26.43-2.43 1-3.5 0 0-1.82-3.42-.42-4 1.39-.58 4.64.26 6.42 2.26.65-.17 1.33-.26 2-.26z"/></svg>`, rarity: "rare" },
  { id: "dog", name: { en: "Loyalty Badge", th: "ตราความภักดี" }, icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.8 1.5 2.5 1.5 1.75 0 3-1.5 3-3.5a1.5 1.5 0 0 1 2-1.828z"/><path d="M14 5.172C14 3.782 15.577 2.679 17.5 3c2.823.47 4.113 6.006 4 7-.08.703-1.8 1.5-2.5 1.5-1.75 0-3-1.5-3-3.5a1.5 1.5 0 0 0-2-1.828z"/><path d="M7 14c0 3.866 2.239 7 5 7s5-3.134 5-7-2.239-7-5-7-5 3.134-5 7z"/></svg>`, rarity: "rare" },
  { id: "watch", name: { en: "Precision Badge", th: "ตราความแม่นยำ" }, icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="7"/><polyline points="12 9 12 12 13.5 13.5"/><path d="M16.51 17.35l-.35 3.83a2 2 0 0 1-2 1.82H9.83a2 2 0 0 1-2-1.82l-.35-3.83m.01-10.7l.35-3.83A2 2 0 0 1 9.83 1h4.35a2 2 0 0 1 2 1.82l.35 3.83"/></svg>`, rarity: "rare" },
  
  { id: "car", name: { en: "Speed Badge", th: "ตราความเร็ว" }, icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`, rarity: "epic" },
  { id: "dragon", name: { en: "Mythic Badge", th: "ตราในตำนาน" }, icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`, rarity: "epic" },
  { id: "rocket", name: { en: "Growth Rocket", th: "ตราเติบโตไว" }, icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>`, rarity: "epic" },
  
  { id: "island", name: { en: "Paradise Badge", th: "ตราเกาะสวรรค์" }, icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20a6 6 0 0 1 12 0"/><path d="M10 20a6 6 0 0 1 12 0"/><path d="M12 14c.5-3 2.5-5 5-5s4.5 2 5 5"/><line x1="12" y1="14" x2="12" y2="20"/></svg>`, rarity: "legendary" },
  { id: "crown", name: { en: "Crown Badge", th: "ตรามงกุฎทอง" }, icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>`, rarity: "legendary" },
  { id: "diamond", name: { en: "Diamond Vault", th: "ตราเพชรแท้" }, icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M11 3 8 9l4 12 4-12-3-6"/><path d="M2 9h20"/></svg>`, rarity: "legendary" },
];

export function renderCollectibles(container) {
  const lang = getLanguage();
  const ownedIds = store.settings.collectibles || [];
  
  const rarityColors = {
    common: "var(--text-secondary)",
    rare: "#34d399",
    epic: "#a855f7",
    legendary: "var(--gold)"
  };

  const rarityNames = {
    common: { en: "Common", th: "ทั่วไป" },
    rare: { en: "Rare", th: "หายาก" },
    epic: { en: "Epic", th: "อีปิก" },
    legendary: { en: "Legendary", th: "ตำนาน" }
  };

  const totalItems = gachaItems.length;
  const ownedCount = new Set(ownedIds).size;
  const progressPercent = Math.round((ownedCount / totalItems) * 100);

  let html = `
    <div class="screen screen-enter" style="padding: 0 16px 100px;">
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <button class="back-btn" style="background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 style="font-size: 22px; font-weight: 900; color: var(--text-primary); margin: 0;">${lang === 'en' ? 'Collection' : 'ตู้โชว์ของสะสม'}</h1>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; background: rgba(168, 85, 247, 0.15); padding: 6px 12px; border-radius: 20px; border: 1px solid rgba(168, 85, 247, 0.25);">
          <span style="font-weight: 800; color: #a855f7; font-size: 13px;">${ownedCount}/${totalItems}</span>
        </div>
      </div>

    <!-- Collection Progress -->
    <div style="background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 16px; margin-bottom: 24px; text-align: center;">
      <div style="font-size: 14px; font-weight: 700; margin-bottom: 8px;">${t('collectionProgress')}</div>
      <div style="font-size: 24px; font-weight: 800; color: var(--gold); margin-bottom: 12px;">${progressPercent}%</div>
      <div style="height: 8px; background: rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden; width: 100%;">
        <div style="height: 100%; width: ${progressPercent}%; background: var(--gold); border-radius: 4px;"></div>
      </div>
      <div style="font-size: 11px; color: var(--text-secondary); margin-top: 8px;">
        ${ownedCount} / ${totalItems} ${t('foundLabel')}
      </div>
    </div>

    <div class="vault-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; padding-bottom: 40px;">
  `;

  gachaItems.forEach(item => {
    const isOwned = ownedIds.includes(item.id);
    const count = ownedIds.filter(id => id === item.id).length;
    const rColor = rarityColors[item.rarity];
    const rName = rarityNames[item.rarity][lang];
    const iName = item.name[lang];

    if (isOwned) {
      html += `
        <div class="collectible-card" style="background: var(--surface); border: 1.5px solid ${rColor}; border-radius: 12px; padding: 16px 8px; text-align: center; position: relative;">
          ${count > 1 ? `<div style="position: absolute; top: -6px; right: -6px; background: ${rColor}; color: #000; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 10px;">x${count}</div>` : ''}
          <div style="width: 48px; height: 48px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; color: ${rColor};">${item.icon}</div>
          <div style="font-size: 11px; font-weight: 700; color: var(--text-primary); line-height: 1.2;">${iName}</div>
          <div style="font-size: 9px; font-weight: 800; color: ${rColor}; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.5px;">${rName}</div>
        </div>
      `;
    } else {
      html += `
        <div class="collectible-card locked" style="background: var(--surface); border: 1.5px dashed var(--border); border-radius: 12px; padding: 16px 8px; text-align: center; opacity: 0.5;">
          <div style="width: 48px; height: 48px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: var(--text-muted);">?</div>
          <div style="font-size: 11px; font-weight: 700; color: var(--text-secondary); line-height: 1.2;">???</div>
          <div style="font-size: 9px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-top: 4px; letter-spacing: 0.5px;">???</div>
        </div>
      `;
    }
  });

  html += `</div>`;
  container.innerHTML = html;

  container.querySelector(".back-btn").addEventListener("click", () => {
    router.navigate("dashboard");
  });
}
