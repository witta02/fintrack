import { store } from "../store.js";
import { t, getLanguage } from "../i18n.js";
import { router } from "../router.js";
import { alerts } from "../utils/alertHelper.js";
import { gachaItems } from "./collectibles.js";
import QRCode from "qrcode";
import confetti from "canvas-confetti";
import { validateBankSlip } from "../utils/slipValidator.js";
import { generatePromptPayPayload, maskPromptPayId, DEFAULT_PROMPTPAY_ID, downloadQRCodeCard } from "../utils/promptpayQR.js";

export function renderRewards(container) {
  const lang = getLanguage();
  const isEn = lang === "en";
  const coins = store.settings.coins || 0;
  const unlockedThemes = store.settings.unlockedThemes || ["light", "dark"];

  const shopItems = [
    {
      id: "midnight",
      type: "theme",
      icon: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
      title: isEn ? "Midnight Theme" : "ธีมมิดไนท์",
      desc: isEn ? "Sleek and dark blue aesthetic." : "ธีมมืดสบายตา โทนสีน้ำเงินพรีเมียม",
      price: 500,
    },
    {
      id: "emerald",
      type: "theme",
      icon: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
      title: isEn ? "Emerald Vault Theme" : "ธีมมรกตเพิ่มพูน",
      desc: isEn ? "Rich forest green for high-growth savers." : "สีเขียวมรกตสำหรับนักออมเงินตัวจริง",
      price: 1200,
    },
    {
      id: "cyberpunk",
      type: "theme",
      icon: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 8h6M9 12h6M9 16h6"/></svg>`,
      title: isEn ? "Cyberpunk Theme" : "ธีมไซเบอร์พังค์",
      desc: isEn ? "Neon lights and futuristic vibes." : "สไตล์นีออนล้ำสมัย แสงสีสดใส",
      price: 1000,
    },
    {
      id: "gold",
      type: "theme",
      icon: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
      title: isEn ? "Golden Theme" : "ธีมทองคำ",
      desc: isEn ? "Pure luxury gold accents." : "ความหรูหราสีทองระดับพรีเมียม",
      price: 2500,
    },
    {
      id: "forgiveness",
      type: "item",
      icon: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      title: isEn ? "Forgiveness Pass" : "บัตรไถ่บาป",
      desc: isEn ? "Forgives one bad habit penalty and restores lost XP!" : "ลบบทลงโทษจากใช้จ่ายฟุ่มเฟือย 1 ครั้งและคืน XP!",
      price: 300,
    }
  ];

  let html = `
    <div class="screen screen-enter" style="padding: 0 16px 100px;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <button class="back-btn" style="background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; transition: background 0.15s ease;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 style="font-size: 22px; font-weight: 900; color: var(--text-primary); margin: 0;">${isEn ? 'Rewards Shop' : 'ร้านค้าของรางวัล'}</h1>
        </div>

        <!-- Coin Balance & Top Up Button -->
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 6px; background: rgba(245,200,66,0.15); padding: 6px 12px; border-radius: 20px; border: 1px solid rgba(245,200,66,0.25);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v12"/></svg>
            <span style="font-weight: 800; color: var(--gold); font-size: 13px;">${coins} Coins</span>
          </div>
          <button id="buy-coins-plus-btn" style="background: var(--gold); color: #000; border: none; padding: 6px 12px; border-radius: 20px; font-weight: 800; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px rgba(245,200,66,0.3); transition: transform 0.15s ease;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>${isEn ? 'Top Up' : 'เติมเงิน'}</span>
          </button>
        </div>
      </div>

      <!-- Top-Up FinCoins Hero Banner -->
      <div id="rewards-topup-banner" style="background: linear-gradient(135deg, rgba(245, 200, 66, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%); border: 1px solid rgba(245, 200, 66, 0.35); border-radius: var(--radius-2xl); padding: 18px 20px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s ease; box-shadow: var(--card-shadow);">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 44px; height: 44px; border-radius: 14px; background: var(--gold); color: #000; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(245, 200, 66, 0.35);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div>
            <div style="font-size: 15px; font-weight: 900; color: var(--text-primary); margin-bottom: 2px;">
              ${isEn ? 'Top-Up FinCoins via PromptPay' : 'เติมเหรียญ FinCoins ผ่าน PromptPay QR'}
            </div>
            <div style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">
              ${isEn ? 'Scan PromptPay QR with automatic bank slip verification' : 'สแกนจ่ายผ่านแอปธนาคาร พร้อมระบบตรวจสลิปอัตโนมัติ'}
            </div>
          </div>
        </div>
        <button style="background: var(--gold); color: #000; border: none; padding: 8px 14px; border-radius: 999px; font-weight: 900; font-size: 12px; cursor: pointer; white-space: nowrap; box-shadow: 0 2px 8px rgba(245,200,66,0.3);">
          ${isEn ? 'Top Up' : 'เติมเหรียญ'}
        </button>
      </div>

      <!-- Gacha Machine Card -->
      <div style="margin: 0 0 24px; background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 22px; text-align: center; position: relative; overflow: hidden; box-shadow: var(--card-shadow);">
        <div style="width: 56px; height: 56px; margin: 0 auto 12px; border-radius: 16px; background: var(--surface); display: flex; align-items: center; justify-content: center; color: var(--gold); border: 1px solid var(--border);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/></svg>
        </div>
        <h2 style="font-size: 18px; font-weight: 800; color: var(--text-primary); margin-bottom: 6px;">
          ${isEn ? 'Gacha Vault' : 'ตู้สุ่มของสะสม'}
        </h2>
        <p style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 16px; max-width: 280px; margin-inline: auto; line-height: 1.4;">
          ${isEn ? 'Roll for financial badges and rare collectibles!' : 'สุ่มเหรียญตราและของสะสมพิเศษ'}
        </p>
        <button id="roll-gacha-btn" style="background: ${coins >= 100 ? 'var(--gold)' : 'var(--surface)'}; color: ${coins >= 100 ? 'var(--btn-text-primary)' : 'var(--text-secondary)'}; border: 1px solid ${coins >= 100 ? 'var(--gold)' : 'var(--border)'}; border-radius: 12px; padding: 11px 22px; font-size: 14px; font-weight: 800; cursor: ${coins >= 100 ? 'pointer' : 'not-allowed'}; display: inline-flex; align-items: center; gap: 8px; transition: all var(--transition-fast);">
          ${isEn ? 'Roll Gacha' : 'สุ่มกาชา'} (100 Coins)
        </button>
      </div>

      <!-- Shop Grid Header -->
      <div style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5"><polyline points="20 12 20 22 4 22 4 12"/><rect width="20" height="5" x="2" y="7"/><line x1="12" y1="22" y2="7"/></svg>
        <span>${isEn ? 'Exclusive Items & Themes' : 'ไอเทมและธีมพิเศษ'}</span>
      </div>

      <!-- Shop Items Grid -->
      <div class="shop-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; padding-bottom: 40px;">
  `;

  shopItems.forEach(item => {
    const isOwned = item.type === "theme" && unlockedThemes.includes(item.id);
    const canAfford = coins >= item.price;
    
    let btnHTML = '';
    if (isOwned) {
      btnHTML = `
        <div style="margin-top: auto; padding: 10px; width: 100%; text-align: center; background: var(--surface); border-radius: 8px; font-size: 12px; font-weight: 700; color: var(--text-secondary);">
          ${isEn ? 'Owned' : 'เป็นเจ้าของแล้ว'}
        </div>
      `;
    } else {
      btnHTML = `
        <button class="buy-btn" data-id="${item.id}" data-type="${item.type}" data-price="${item.price}" style="margin-top: auto; width: 100%; padding: 10px; background: ${canAfford ? 'var(--gold)' : 'rgba(245,200,66,0.15)'}; color: ${canAfford ? '#000' : 'var(--gold)'}; border: 1px solid var(--gold); border-radius: 8px; font-weight: 800; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 6px; transition: all var(--transition);">
          ${item.price} Coins ${canAfford ? '' : (isEn ? '(Need Coins)' : '(เหรียญไม่พอ)')}
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

  html += `</div></div>`;
  container.innerHTML = html;

  container.querySelector(".back-btn").addEventListener("click", () => {
    router.navigate("dashboard");
  });

  container.querySelector("#buy-coins-plus-btn")?.addEventListener("click", () => {
    showBuyCoinsModal(container, lang);
  });

  container.querySelector("#rewards-topup-banner")?.addEventListener("click", () => {
    showBuyCoinsModal(container, lang);
  });

  container.querySelectorAll(".buy-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const target = e.currentTarget;
      const id = target.getAttribute("data-id");
      const type = target.getAttribute("data-type");
      const price = parseInt(target.getAttribute("data-price"));

      if (store.settings.coins < price) {
        showBuyCoinsModal(container, lang, price);
        return;
      }

      // Deduct coins
      store.settings.coins -= price;

      if (type === "theme") {
        store.settings.unlockedThemes = store.settings.unlockedThemes || ["light", "dark"];
        if (!store.settings.unlockedThemes.includes(id)) {
          store.settings.unlockedThemes.push(id);
        }
        alerts.success(isEn ? "Theme Unlocked!" : "ปลดล็อกธีมแล้ว!");
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
      store.saveSettingsToCloud();
      renderRewards(container);
    });
  });

  container.querySelector("#roll-gacha-btn")?.addEventListener("click", () => {
    if (store.settings.coins < 100) {
      showBuyCoinsModal(container, lang, 100);
      return;
    }
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
    store.saveSettingsToCloud();

    confetti({ particleCount: 70, spread: 60 });
    alerts.success(`${t('youGot')} ${item.name[lang]} ${item.icon}`);
    renderRewards(container); // Refresh
  });
}

/**
 * Top-Up Modal (Buy FinCoins via PromptPay & Slip OCR/QR Verification)
 */
export function showBuyCoinsModal(container, lang = "th", preselectedNeedCoins = 0) {
  const isEn = lang === "en";
  const promptpayId = DEFAULT_PROMPTPAY_ID;
  const maskedPromptPayId = maskPromptPayId(promptpayId);

  const packsData = [
    { coins: 500, price: 29, tag: null },
    { coins: 1200, price: 59, tag: isEn ? '+20% Bonus' : '+20% โบนัส' },
    { coins: 2500, price: 99, tag: isEn ? 'Best Value' : 'ยอดนิยม' },
    { coins: 6000, price: 199, tag: isEn ? '+50% VIP' : '+50% คุ้มสุด' }
  ];

  // Pick default selected pack
  let defaultPack = packsData[1];
  if (preselectedNeedCoins > 0) {
    defaultPack = packsData.find(p => p.coins >= preselectedNeedCoins) || packsData[packsData.length - 1];
  }
  
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.style.zIndex = "1000";
  modal.innerHTML = `
    <div class="modal-dialog" style="background: var(--surface); color: var(--text-primary); max-width: 440px; width: 94%; max-height: 90vh; overflow-y: auto; text-align: center; border-radius: var(--radius-2xl); border: 1px solid var(--border); box-shadow: var(--card-shadow); padding: 22px;">
      
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(245,200,66,0.15); color: var(--gold); display: flex; align-items: center; justify-content: center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v12"/></svg>
          </div>
          <div style="text-align: left;">
            <h3 style="font-size: 16px; font-weight: 900; color: var(--text-primary); margin: 0;">
              ${isEn ? 'Top-Up FinCoins' : 'เติมเหรียญ FinCoins'}
            </h3>
            <div style="font-size: 11px; color: var(--text-secondary);">
              ${isEn ? 'PromptPay QR & Slip Verification' : 'สแกนจ่ายผ่านพร้อมเพย์ ตรวจสลิปอัตโนมัติ'}
            </div>
          </div>
        </div>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 4px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <!-- Coin Packs Grid -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px;">
        ${packsData.map(p => `
          <div class="coin-pack ${p.coins === defaultPack.coins ? 'active-pack' : ''}" data-coins="${p.coins}" data-price="${p.price}" style="background: var(--card); border: 2px solid ${p.coins === defaultPack.coins ? 'var(--gold)' : 'var(--border)'}; border-radius: var(--radius-xl); padding: 14px 10px; cursor: pointer; transition: all 0.2s ease; position: relative; text-align: center;">
            ${p.tag ? `
              <div style="position: absolute; top: -8px; right: 8px; background: ${p.price >= 99 ? 'var(--gold)' : 'var(--income)'}; color: #000; font-size: 9.5px; font-weight: 900; padding: 2px 7px; border-radius: 999px; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
                ${p.tag}
              </div>
            ` : ''}
            <div style="width: 28px; height: 28px; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center; color: var(--gold);">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polygon points="12 6 15 11 9 11"/></svg>
            </div>
            <div style="font-weight: 900; font-size: 15px; color: var(--text-primary); font-family: var(--font-heading);">
              ${p.coins.toLocaleString()} Coins
            </div>
            <div style="color: var(--gold); font-weight: 800; font-size: 13px; margin-top: 2px;">
              ฿${p.price}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Payment Section -->
      <div id="coin-payment-section" style="background: var(--card); border: 1px solid var(--border); padding: 18px; border-radius: var(--radius-2xl); margin-bottom: 12px;">
        <div style="font-size: 14px; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;" id="coin-payment-desc">
          ${isEn ? `Transfer ฿${defaultPack.price} for ${defaultPack.coins} FinCoins` : `โอนเงิน ฿${defaultPack.price} รับ ${defaultPack.coins} FinCoins`}
        </div>
        <div style="font-size: 11.5px; color: var(--text-secondary); margin-bottom: 12px;">
          PromptPay: <strong style="color: var(--text-primary); letter-spacing: 0.5px;">${maskedPromptPayId}</strong>
        </div>

        <!-- Canvas QR Holder -->
        <div style="background: #ffffff; padding: 14px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 14px rgba(0,0,0,0.1); margin-bottom: 12px;">
          <canvas id="coin-promptpay-qr" style="display: block; width: 170px; height: 170px;"></canvas>
        </div>

        <input type="file" id="coin-slip-upload" accept="image/*" style="display: none;" />
        
        <div style="display: flex; gap: 8px;">
          <button id="coin-save-qr-btn" style="flex: 1; background: var(--surface); color: var(--text-primary); padding: 10px; border-radius: var(--radius); font-weight: 700; font-size: 12px; border: 1px solid var(--border); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: background 0.15s ease;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>${isEn ? 'Save QR Code' : 'บันทึกรูป QR'}</span>
          </button>

          <button id="coin-upload-btn" style="flex: 1.2; background: var(--gold); color: #000; padding: 10px; border-radius: var(--radius); font-weight: 800; font-size: 12px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 8px rgba(245,200,66,0.3);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
            <span>${isEn ? 'Upload Slip' : 'อัปโหลดสลิป'}</span>
          </button>
        </div>

        <div id="coin-upload-status" style="font-size: 11.5px; margin-top: 10px; color: var(--text-secondary); font-weight: 700; min-height: 16px;"></div>
      </div>

      <button type="button" class="modal-close-btn" style="width: 100%; padding: 10px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); color: var(--text-secondary); font-size: 12px; font-weight: 800; cursor: pointer;">
        ${isEn ? 'Cancel' : 'ยกเลิก'}
      </button>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelectorAll(".modal-close-btn").forEach(b => (b.onclick = close));
  modal.onclick = (e) => { if (e.target === modal) close(); };

  const packs = modal.querySelectorAll(".coin-pack");
  const desc = modal.querySelector("#coin-payment-desc");
  const canvas = modal.querySelector("#coin-promptpay-qr");
  const uploadInput = modal.querySelector("#coin-slip-upload");
  const uploadBtn = modal.querySelector("#coin-upload-btn");
  const saveQrBtn = modal.querySelector("#coin-save-qr-btn");
  const uploadStatus = modal.querySelector("#coin-upload-status");

  let selectedCoins = defaultPack.coins;
  let selectedPrice = defaultPack.price;

  const renderQR = (price) => {
    try {
      const payload = generatePromptPayPayload(promptpayId, price);
      QRCode.toCanvas(canvas, payload, { width: 170, margin: 1 }, (err) => {
        if (err) console.error("QR Code rendering error:", err);
      });
    } catch (err) {
      console.error("Payload generation error:", err);
    }
  };

  renderQR(selectedPrice);

  packs.forEach(pack => {
    pack.addEventListener("click", () => {
      selectedCoins = parseInt(pack.getAttribute("data-coins"), 10);
      selectedPrice = parseInt(pack.getAttribute("data-price"), 10);

      packs.forEach(p => {
        p.style.borderColor = "var(--border)";
      });
      pack.style.borderColor = "var(--gold)";

      desc.textContent = isEn 
        ? `Transfer ฿${selectedPrice} for ${selectedCoins.toLocaleString()} FinCoins` 
        : `โอนเงิน ฿${selectedPrice} รับ ${selectedCoins.toLocaleString()} FinCoins`;
      
      renderQR(selectedPrice);
    });
  });

  saveQrBtn?.addEventListener("click", async () => {
    if (!canvas) return;
    try {
      saveQrBtn.disabled = true;
      const originalText = saveQrBtn.innerHTML;
      saveQrBtn.innerHTML = `<div class="spinner" style="display:inline-block; vertical-align:middle; width:12px; height:12px; border-width:2px; border-color: currentColor transparent currentColor transparent;"></div> <span>${isEn ? 'Saving...' : 'กำลังบันทึก...'}</span>`;

      await downloadQRCodeCard(canvas, {
        amount: selectedPrice,
        promptpayId: promptpayId,
        title: isEn ? "FinCoins Top-Up" : "เติมเหรียญ FinCoins",
        subtitle: isEn ? "Scan via any Thai Banking App" : "สแกนจ่ายผ่านแอปธนาคารทุกแห่ง"
      });

      saveQrBtn.disabled = false;
      saveQrBtn.innerHTML = originalText;

      alerts.success(
        isEn ? "QR Code Saved!" : "บันทึกรูป QR แล้ว!",
        isEn ? "Image saved to device. You can now scan it in your banking app." : "บันทึกรูปภาพเรียบร้อย นำไปสแกนในแอปธนาคารได้ทันที"
      );
    } catch (err) {
      console.error("Failed to save QR Code image:", err);
      saveQrBtn.disabled = false;
      saveQrBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> <span>${isEn ? 'Save QR Code' : 'บันทึกรูป QR'}</span>`;
      alerts.error(
        isEn ? "Save Failed" : "บันทึกไม่สำเร็จ",
        isEn ? "Unable to download QR code image." : "ไม่สามารถดาวน์โหลดรูปภาพ QR code ได้"
      );
    }
  });

  uploadBtn?.addEventListener("click", () => uploadInput.click());

  uploadInput?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    uploadBtn.disabled = true;
    uploadBtn.innerHTML = `<div class="spinner" style="display:inline-block; vertical-align:middle; width:14px; height:14px; border-width:2px; border-color: #000 transparent #000 transparent;"></div> ${isEn ? 'Validating...' : 'กำลังตรวจสอบ...'}`;
    uploadStatus.textContent = isEn ? "Scanning bank slip details..." : "กำลังสแกนและตรวจสอบข้อมูลสลิป...";
    uploadStatus.style.color = "var(--text-secondary)";

    const validation = await validateBankSlip(file, { expectedPrice: selectedPrice }, (msg) => {
      uploadStatus.textContent = msg;
    });

    if (!validation.isValid) {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = `<span>${isEn ? 'Upload Slip' : 'อัปโหลดสลิป'}</span>`;
      uploadStatus.textContent = validation.reason;
      uploadStatus.style.color = "var(--expense)";
      alerts.error(
        isEn ? "Invalid Transfer Slip!" : "สลิปไม่ถูกต้อง!",
        validation.reason
      );
      return;
    }

    // Anti-replay protection: prevent duplicate slip reuse
    const usedSlips = store.settings.usedSlips || [];
    const slipIdentifiers = [
      validation.ref ? `ref_${validation.ref}` : null,
      validation.qrData ? `qr_${validation.qrData}` : null,
      validation.imageHash ? `img_${validation.imageHash}` : null,
      `file_${file.name}_${file.size}`
    ].filter(Boolean);

    const isDuplicate = slipIdentifiers.some(id => usedSlips.includes(id));

    if (isDuplicate) {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = `<span>${isEn ? 'Upload Slip' : 'อัปโหลดสลิป'}</span>`;
      uploadStatus.textContent = isEn 
        ? "Duplicate slip! This slip has already been redeemed." 
        : "สลิปนี้ถูกใช้งานรับเหรียญไปแล้ว ไม่สามารถใช้ซ้ำได้";
      uploadStatus.style.color = "var(--expense)";
      alerts.error(
        isEn ? "Duplicate Slip!" : "สลิปซ้ำ!",
        isEn ? "This transfer slip has already been redeemed for FinCoins." : "สลิปโอนเงินนี้ถูกใช้งานรับเหรียญไปแล้ว"
      );
      return;
    }

    uploadBtn.innerHTML = `<div class="spinner" style="display:inline-block; vertical-align:middle; width:14px; height:14px; border-width:2px; border-color: #000 transparent #000 transparent;"></div> ${isEn ? 'Crediting Coins...' : 'กำลังเติมเหรียญ...'}`;
    
    setTimeout(() => {
      uploadStatus.textContent = isEn ? `Success! +${selectedCoins.toLocaleString()} Coins added.` : `สำเร็จ! ได้รับ +${selectedCoins.toLocaleString()} FinCoins เรียบร้อยแล้ว`;
      uploadStatus.style.color = "var(--income)";
      
      if (!store.settings.usedSlips) store.settings.usedSlips = [];
      slipIdentifiers.forEach(id => {
        if (!store.settings.usedSlips.includes(id)) {
          store.settings.usedSlips.push(id);
        }
      });
      
      store.settings.coins = (store.settings.coins || 0) + selectedCoins;
      store.save();
      store.saveSettingsToCloud();

      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      
      setTimeout(() => {
        close();
        if (container) renderRewards(container);
        alerts.success(isEn ? `Purchased ${selectedCoins.toLocaleString()} FinCoins!` : `เติมเหรียญสำเร็จ! ได้รับ ${selectedCoins.toLocaleString()} FinCoins`);
      }, 1400);
      
    }, 1200);
  });
}
