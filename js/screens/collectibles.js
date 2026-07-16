import { store } from "../store.js";
import { getLanguage } from "../i18n.js";
import { router } from "../router.js";

// Master list of all possible collectibles
export const gachaItems = [
  { id: "coffee", name: { en: "Coffee Mug", th: "แก้วกาแฟ" }, icon: "☕", rarity: "common" },
  { id: "plant", name: { en: "Potted Plant", th: "ต้นไม้กระถาง" }, icon: "🪴", rarity: "common" },
  { id: "duck", name: { en: "Rubber Duck", th: "เป็ดเหลือง" }, icon: "🦆", rarity: "common" },
  
  { id: "skateboard", name: { en: "Skateboard", th: "สเก็ตบอร์ด" }, icon: "🛹", rarity: "rare" },
  { id: "cat", name: { en: "Orange Cat", th: "แมวส้ม" }, icon: "🐱", rarity: "rare" },
  { id: "dog", name: { en: "Shiba Dog", th: "หมาชิบะ" }, icon: "🐶", rarity: "rare" },
  { id: "watch", name: { en: "Smart Watch", th: "สมาร์ทวอทช์" }, icon: "⌚", rarity: "rare" },
  
  { id: "car", name: { en: "Sports Car", th: "รถสปอร์ต" }, icon: "🏎️", rarity: "epic" },
  { id: "dragon", name: { en: "Baby Dragon", th: "ลูกมังกร" }, icon: "🐉", rarity: "epic" },
  { id: "rocket", name: { en: "Space Rocket", th: "จรวดอวกาศ" }, icon: "🚀", rarity: "epic" },
  
  { id: "island", name: { en: "Private Island", th: "เกาะส่วนตัว" }, icon: "🏝️", rarity: "legendary" },
  { id: "crown", name: { en: "Golden Crown", th: "มงกุฎทองคำ" }, icon: "👑", rarity: "legendary" },
  { id: "diamond", name: { en: "Huge Diamond", th: "เพชรเม็ดโต" }, icon: "💎", rarity: "legendary" },
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
    <div class="screen-header" style="padding-bottom: 20px; border-bottom: 1px solid var(--border); margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 14px;">
        <button class="back-btn" style="background: transparent; border: none; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background: var(--surface);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 class="brand-title" style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 0;">${lang === 'en' ? 'The Vault' : 'ห้องนิรภัย'}</h1>
      </div>
    </div>

    <!-- Collection Progress -->
    <div style="background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 16px; margin-bottom: 24px; text-align: center;">
      <div style="font-size: 14px; font-weight: 700; margin-bottom: 8px;">${lang === 'en' ? 'Collection Progress' : 'ความคืบหน้าของสะสม'}</div>
      <div style="font-size: 24px; font-weight: 800; color: var(--gold); margin-bottom: 12px;">${progressPercent}%</div>
      <div style="height: 8px; background: rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden; width: 100%;">
        <div style="height: 100%; width: ${progressPercent}%; background: linear-gradient(90deg, var(--gold), var(--amber)); border-radius: 4px;"></div>
      </div>
      <div style="font-size: 11px; color: var(--text-secondary); margin-top: 8px;">
        ${ownedCount} / ${totalItems} ${lang === 'en' ? 'Found' : 'ค้นพบแล้ว'}
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
        <div class="collectible-card" style="background: var(--surface); border: 1.5px solid ${rColor}; border-radius: 12px; padding: 16px 8px; text-align: center; position: relative; box-shadow: 0 4px 12px ${rColor}33;">
          ${count > 1 ? `<div style="position: absolute; top: -6px; right: -6px; background: ${rColor}; color: #000; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 10px;">x${count}</div>` : ''}
          <div style="font-size: 40px; margin-bottom: 8px; filter: drop-shadow(0 0 10px ${rColor}66);">${item.icon}</div>
          <div style="font-size: 11px; font-weight: 700; color: var(--text-primary); line-height: 1.2;">${iName}</div>
          <div style="font-size: 9px; font-weight: 800; color: ${rColor}; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.5px;">${rName}</div>
        </div>
      `;
    } else {
      html += `
        <div class="collectible-card locked" style="background: var(--surface); border: 1.5px dashed var(--border); border-radius: 12px; padding: 16px 8px; text-align: center; opacity: 0.5; filter: grayscale(100%);">
          <div style="font-size: 40px; margin-bottom: 8px;">❓</div>
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
