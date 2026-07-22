import { store } from "../store.js";
import { t, getLanguage } from "../i18n.js";
import { router } from "../router.js";
import { alerts } from "../utils/alertHelper.js";
import { gachaItems } from "./collectibles.js";

export function renderRewards(container) {
  const lang = getLanguage();
  const coins = store.settings.coins || 0;
  const unlockedThemes = store.settings.unlockedThemes || ["light", "dark"];

  const shopItems = [
    {
      id: "midnight",
      type: "theme",
      icon: "🌙",
      title: lang === 'en' ? "Midnight Theme" : "ธีมมิดไนท์",
      desc: lang === 'en' ? "Sleek and dark blue aesthetic." : "ธีมมืดสบายตา",
      price: 500,
    },
    {
      id: "cyberpunk",
      type: "theme",
      icon: "🤖",
      title: lang === 'en' ? "Cyberpunk Theme" : "ธีมไซเบอร์พังค์",
      desc: lang === 'en' ? "Neon lights and futuristic vibes." : "มีความเล่นสีแบบตัวแม่ตัวมัม",
      price: 1000,
    },
    {
      id: "gold",
      type: "theme",
      icon: "✨",
      title: lang === 'en' ? "Golden Theme" : "ธีมทองคำ",
      desc: lang === 'en' ? "The ultimate flex. Pure luxury." : "ความหรูหราแบบตัวแม่",
      price: 2500,
    },
    {
      id: "forgiveness",
      type: "item",
      icon: "🕊️",
      title: lang === 'en' ? "Forgiveness Pass" : "บัตรไถ่บาป",
      desc: lang === 'en' ? "Forgives one bad habit penalty and restores lost XP!" : "ลบบทลงโทษจากใช้จ่ายฟุ่มเฟือย 1 ครั้งและคืน XP ที่เสียไป!",
      price: 300,
    }
  ];

  let html = `
    <div class="screen-header" style="padding-bottom: 20px; border-bottom: 1px solid var(--border); margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 14px;">
        <button class="back-btn" style="background: transparent; border: none; color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background: var(--surface);">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 class="brand-title" style="font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 0;">${lang === 'en' ? 'Rewards Shop' : 'ร้านค้าของรางวัล'}</h1>
      </div>
      <div style="margin-left: auto; display: flex; align-items: center; gap: 8px; background: rgba(245,200,66,0.15); padding: 6px 12px; border-radius: 20px;">
        <span style="font-size: 16px;">🪙</span>
        <span style="font-weight: 800; color: var(--gold); font-size: 14px;">${coins}</span>
      </div>
    </div>

    <div style="margin-bottom: 20px; text-align: center; color: var(--text-secondary); font-size: 14px;">
      ${lang === 'en' ? 'Spend your FinCoins to unlock exclusive app features!' : 'ใช้ FinCoins ของคุณเพื่อปลดล็อกฟีเจอร์พิเศษ!'}
    </div>

    <!-- Gacha Machine -->
    <div style="margin: 0 20px 24px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(52, 211, 153, 0.15)); border: 1px solid var(--border); border-radius: 16px; padding: 20px; text-align: center; position: relative; overflow: hidden; box-shadow: 0 4px 20px rgba(168, 85, 247, 0.2);">
      <div style="font-size: 64px; margin-bottom: 12px; animation: float 3s ease-in-out infinite;">🎰</div>
      <h2 style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">
        ${lang === 'en' ? 'Gacha Machine' : 'ตู้สุ่มกาชาปอง'}
      </h2>
      <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; max-width: 250px; margin-inline: auto; line-height: 1.4;">
        ${lang === 'en' ? 'Roll for random pets and collectibles! Can you find a Legendary item?' : 'สุ่มสัตว์เลี้ยงและของสะสม! คุณจะหาไอเทมระดับตำนานเจอไหม?'}
      </p>
      <button id="roll-gacha-btn" style="background: ${coins >= 100 ? 'linear-gradient(90deg, #a855f7, #3b82f6)' : 'var(--surface)'}; color: ${coins >= 100 ? '#FFF' : 'var(--text-muted)'}; border: none; border-radius: 12px; padding: 12px 24px; font-size: 16px; font-weight: 800; cursor: ${coins >= 100 ? 'pointer' : 'not-allowed'}; box-shadow: ${coins >= 100 ? '0 4px 15px rgba(168,85,247,0.4)' : 'none'}; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s;">
        ${lang === 'en' ? 'Roll Gacha' : 'สุ่มกาชา'} • 100 🪙
      </button>
    </div>

    <div class="shop-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; padding-bottom: 40px; padding-inline: 20px;">
  `;

  shopItems.forEach(item => {
    const isOwned = item.type === "theme" && unlockedThemes.includes(item.id);
    const canAfford = coins >= item.price;
    
    let btnHTML = '';
    if (isOwned) {
      btnHTML = `
        <div style="margin-top: auto; padding: 10px; width: 100%; text-align: center; background: var(--surface); border-radius: 8px; font-size: 12px; font-weight: 700; color: var(--text-secondary);">
          ${lang === 'en' ? 'Owned' : 'เป็นเจ้าของแล้ว'}
        </div>
      `;
    } else {
      btnHTML = `
        <button class="buy-btn" data-id="${item.id}" data-type="${item.type}" data-price="${item.price}" style="margin-top: auto; width: 100%; padding: 10px; background: ${canAfford ? 'var(--gold)' : 'var(--surface)'}; color: ${canAfford ? '#000' : 'var(--text-muted)'}; border: none; border-radius: 8px; font-weight: 800; cursor: ${canAfford ? 'pointer' : 'not-allowed'}; display: flex; justify-content: center; align-items: center; gap: 6px; transition: all var(--transition);">
          ${item.price} 🪙
        </button>
      `;
    }

    html += `
      <div class="shop-item-card" style="background: var(--card); border: 1px solid ${isOwned ? 'var(--gold)' : 'var(--border)'}; border-radius: 16px; padding: 20px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; box-shadow: ${isOwned ? 'var(--shadow-gold)' : 'none'};">
        <div style="font-size: 48px; line-height: 1;">
          ${item.icon}
        </div>
        <div style="font-size: 15px; font-weight: 800; color: var(--text-primary);">${item.title}</div>
        <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.4; min-height: 34px;">${item.desc}</div>
        
        ${btnHTML}
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;

  container.querySelector(".back-btn").addEventListener("click", () => {
    router.navigate("dashboard");
  });

  container.querySelectorAll(".buy-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const target = e.currentTarget;
      const id = target.getAttribute("data-id");
      const type = target.getAttribute("data-type");
      const price = parseInt(target.getAttribute("data-price"));

      if (store.settings.coins < price) {
        alerts.error(lang === 'en' ? "Not enough coins!" : "เหรียญไม่พอ!");
        return;
      }

      // Deduct coins
      store.settings.coins -= price;

      if (type === "theme") {
        store.settings.unlockedThemes = store.settings.unlockedThemes || ["light", "dark"];
        if (!store.settings.unlockedThemes.includes(id)) {
          store.settings.unlockedThemes.push(id);
        }
        alerts.success(lang === 'en' ? "Theme Unlocked!" : "ปลดล็อกธีมแล้ว!");
      } 
      else if (id === "forgiveness") {
        // Find a bad habit that is NOT forgiven yet
        const badHabits = ["junk", "gambling", "alcohol", "อาหารขยะ", "พนัน", "แอลกอฮอล์", "หวย", "lottery", "เหล้า", "เบียร์", "beer", "liquor", "สลาก"];
        const forgiven = store.settings.forgivenTransactions || [];
        
        const badTx = store.transactions.find(tx => {
          if (tx.isIncome) return false;
          if (forgiven.includes(tx.id)) return false;
          const cat = (tx.category || "").toLowerCase();
          return badHabits.some(bad => cat.includes(bad));
        });

        if (badTx) {
          store.settings.forgivenTransactions = store.settings.forgivenTransactions || [];
          store.settings.forgivenTransactions.push(badTx.id);
          alerts.success(t('badHabitForgiven'));
        } else {
          // Refund if they don't have any unforgiven bad habits
          store.settings.coins += price;
          alerts.info(t('noBadHabits'));
          return;
        }
      }

      store.save();
      renderRewards(container);
    });
  });

  container.querySelector("#roll-gacha-btn")?.addEventListener("click", () => {
    if (store.settings.coins < 100) return;
    store.settings.coins -= 100;
    
    // Gacha RNG logic
    const rand = Math.random();
    let rarity = "common";
    if (rand < 0.05) rarity = "legendary"; // 5%
    else if (rand < 0.20) rarity = "epic"; // 15%
    else if (rand < 0.50) rarity = "rare"; // 30%
    else rarity = "common"; // 50%

    const pool = gachaItems.filter(i => i.rarity === rarity);
    const item = pool[Math.floor(Math.random() * pool.length)];

    store.settings.collectibles = store.settings.collectibles || [];
    store.settings.collectibles.push(item.id);
    store.save();

    alerts.success(`${t('youGot')} ${item.name[lang]} ${item.icon}`);
    renderRewards(container); // Refresh
  });
}
