import { store } from "../store.js";
import { t, getLanguage } from "../i18n.js";
import { router } from "../router.js";
import { alerts } from "../utils/alertHelper.js";
import { gachaItems } from "./collectibles.js";
import QRCode from "qrcode";
import { validateBankSlip } from "../utils/slipValidator.js";
import { generatePromptPayPayload, maskPromptPayId, DEFAULT_PROMPTPAY_ID } from "../utils/promptpayQR.js";

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
      desc: lang === 'en' ? "Forgives one bad habit penalty and restores lost XP!" : "ลบบทลงโทษจากใช้จ่ายฟุ่มเฟูอย 1 ครั้งและคืน XP ที่เสียไป!",
      price: 300,
    }
  ];

  let html = `
    <div class="screen screen-enter" style="padding: 0 16px 24px;">
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <button class="back-btn" style="background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <h1 style="font-size: 22px; font-weight: 900; color: var(--text-primary); margin: 0;">${lang === 'en' ? 'Rewards Shop' : 'ร้านค้าของรางวัล'}</h1>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; background: rgba(245,200,66,0.15); padding: 6px 12px; border-radius: 20px; border: 1px solid rgba(245,200,66,0.25);">
          <span style="font-size: 15px;">🪙</span>
          <span style="font-weight: 800; color: var(--gold); font-size: 13px;">${coins}</span>
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
        <button class="buy-btn" data-id="${item.id}" data-type="${item.type}" data-price="${item.price}" style="margin-top: auto; width: 100%; padding: 10px; background: ${canAfford ? 'var(--gold)' : 'rgba(245,200,66,0.15)'}; color: ${canAfford ? '#000' : 'var(--gold)'}; border: 1px solid var(--gold); border-radius: 8px; font-weight: 800; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 6px; transition: all var(--transition);">
          ${item.price} 🪙 ${canAfford ? '' : '(Get Coins)'}
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
        showBuyCoinsModal(container, lang);
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
    if (store.settings.coins < 100) {
      showBuyCoinsModal(container, lang);
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

    alerts.success(`${t('youGot')} ${item.name[lang]} ${item.icon}`);
    renderRewards(container); // Refresh
  });

  container.querySelector("#buy-coins-plus-btn")?.addEventListener("click", () => {
    showBuyCoinsModal(container, lang);
  });
}

function showBuyCoinsModal(container, lang) {
  const promptpayId = DEFAULT_PROMPTPAY_ID;
  const maskedPromptPayId = maskPromptPayId(promptpayId);
  
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.style.zIndex = "1000";
  modal.innerHTML = `
    <div class="modal-dialog" style="background: var(--surface); color: var(--text-primary); max-width: 400px; text-align: center;">
      <div class="modal-header" style="justify-content: center; border-bottom: none; padding-bottom: 0;">
        <h3 class="modal-title" style="font-size: 20px; color: var(--gold);">🪙 Buy FinCoins</h3>
        <button class="modal-close-btn" style="position: absolute; right: 20px; top: 20px;">&times;</button>
      </div>
      <div class="modal-body" style="padding-top: 10px;">
        <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 24px;">Support FinTrack and unlock premium items!</p>
        
        <div style="display: flex; gap: 12px; margin-bottom: 24px; justify-content: center;">
          <div class="coin-pack" data-coins="500" data-price="29" style="flex: 1; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; cursor: pointer; transition: 0.2s;">
            <div style="font-size: 24px; margin-bottom: 8px;">🪙</div>
            <div style="font-weight: 800; font-size: 16px;">500 Coins</div>
            <div style="color: var(--gold); font-weight: 700; margin-top: 4px;">฿29</div>
          </div>
          <div class="coin-pack" data-coins="2000" data-price="99" style="flex: 1; background: var(--card); border: 2px solid var(--gold); border-radius: 12px; padding: 16px; cursor: pointer; transition: 0.2s; position: relative;">
            <div style="position: absolute; top: -10px; right: -10px; background: var(--expense); color: white; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 12px;">BEST DEAL</div>
            <div style="font-size: 24px; margin-bottom: 8px;">👑</div>
            <div style="font-weight: 800; font-size: 16px;">2000 Coins</div>
            <div style="color: var(--gold); font-weight: 700; margin-top: 4px;">฿99</div>
          </div>
        </div>

        <div id="coin-payment-section" style="display: none; background: #fff; padding: 20px; border-radius: 16px;">
          <h4 style="color: #1a1a1a; margin-top: 0; margin-bottom: 4px; font-size: 15px;" id="coin-payment-desc">Transfer ฿0</h4>
          <p style="color: #6b7280; font-size: 12px; margin-top: 0; margin-bottom: 14px;">PromptPay: <strong style="color: #111827; letter-spacing: 0.5px;">${maskedPromptPayId}</strong></p>
          <canvas id="coin-promptpay-qr" style="margin: 0 auto; display: block; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);"></canvas>
          <div style="margin-top: 16px;">
            <input type="file" id="coin-slip-upload" accept="image/*" style="display: none;" />
            <div style="display: flex; gap: 8px; margin-top: 10px;">
              <button id="coin-save-qr-btn" style="flex: 1; background: #f3f4f6; color: #1f2937; padding: 12px; border-radius: 8px; font-weight: 600; border: 1px solid #e5e7eb; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: 0.2s;">
                ${lang === 'en' ? 'Save QR Code' : 'บันทึก QR Code'}
              </button>
              <button id="coin-upload-btn" class="btn-primary" style="flex: 1; background: #1a1a1a; color: #fff; padding: 12px; border-radius: 8px; font-weight: 600; border: none; cursor: pointer;">
                Upload Slip
              </button>
            </div>
            <p id="coin-upload-status" style="font-size: 12px; margin-top: 10px; color: #22c55e; font-weight: 600;"></p>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => document.body.removeChild(modal);
  modal.querySelector(".modal-close-btn").onclick = close;

  const packs = modal.querySelectorAll(".coin-pack");
  const paymentSection = modal.querySelector("#coin-payment-section");
  const desc = modal.querySelector("#coin-payment-desc");
  const canvas = modal.querySelector("#coin-promptpay-qr");
  const uploadInput = modal.querySelector("#coin-slip-upload");
  const uploadBtn = modal.querySelector("#coin-upload-btn");
  const saveQrBtn = modal.querySelector("#coin-save-qr-btn");
  const uploadStatus = modal.querySelector("#coin-upload-status");

  let selectedCoins = 0;
  let selectedPrice = 0;

  packs.forEach(pack => {
    pack.addEventListener("click", () => {
      selectedCoins = parseInt(pack.getAttribute("data-coins"));
      selectedPrice = parseInt(pack.getAttribute("data-price"));
      
      packs.forEach(p => p.style.transform = "scale(1)");
      pack.style.transform = "scale(1.05)";

      desc.textContent = `Transfer ฿${selectedPrice} for ${selectedCoins} FinCoins`;
      paymentSection.style.display = "block";
      
      const payload = generatePromptPayPayload(promptpayId, selectedPrice);
      QRCode.toCanvas(canvas, payload, { width: 170, margin: 1 }, (err) => {
        if (err) console.error(err);
      });
    });
  });

  saveQrBtn?.addEventListener("click", () => {
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `PromptPay_QR_฿${selectedPrice || 0}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alerts.success(
        lang === 'en' ? "QR Code Saved!" : "บันทึก QR Code แล้ว!",
        lang === 'en' ? "Image saved to your device. You can now scan it in your banking app." : "บันทึกรูปภาพแล้ว สามารถนำไปเลือกสแกนในแอปธนาคารได้เลย"
      );
    } catch (err) {
      console.error("Failed to save QR Code image:", err);
      alerts.error(
        lang === 'en' ? "Save Failed" : "บันทึกไม่สำเร็จ",
        lang === 'en' ? "Unable to download QR code image." : "ไม่สามารถดาวน์โหลดรูปภาพ QR code ได้"
      );
    }
  });

  uploadBtn.addEventListener("click", () => uploadInput.click());

  uploadInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<div class="spinner" style="display:inline-block; vertical-align:middle; width:16px; height:16px; border-width:2px; border-color: #fff transparent #fff transparent;"></div> Validating...';
    uploadStatus.textContent = "Scanning image for Bank Slip QR... / กำลังสแกน QR Code สลิป...";
    uploadStatus.style.color = "var(--text-secondary)";

    const validation = await validateBankSlip(file, { expectedPrice: selectedPrice }, (msg) => {
      uploadStatus.textContent = msg;
    });

    if (!validation.isValid) {
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = lang === 'en' ? 'Upload Slip' : 'อัปโหลดสลิป';
      uploadStatus.textContent = "❌ " + validation.reason;
      uploadStatus.style.color = "var(--expense)";
      alerts.error(
        lang === 'en' ? "Invalid Transfer Slip!" : "สลิปไม่ถูกต้อง!",
        validation.reason
      );
      return;
    }

    // Anti-replay protection: prevent redeeming the same slip twice via ref, QR data, image pixel hash, or file metadata
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
      uploadBtn.innerHTML = lang === 'en' ? 'Upload Slip' : 'อัปโหลดสลิป';
      uploadStatus.textContent = "❌ Duplicate slip! This slip has already been used. / สลิปนี้ถูกใช้งานไปแล้ว!";
      uploadStatus.style.color = "var(--expense)";
      alerts.error(
        "Duplicate Slip! / สลิปซ้ำ!",
        "This transfer slip has already been redeemed for FinCoins. / สลิปโอนเงินนี้ถูกใช้งานรับเหรียญไปแล้ว"
      );
      return;
    }

    uploadBtn.innerHTML = '<div class="spinner" style="display:inline-block; vertical-align:middle; width:16px; height:16px; border-width:2px; border-color: #fff transparent #fff transparent;"></div> Granting Coins...';
    
    setTimeout(() => {
      uploadStatus.textContent = `✅ Success! ${selectedCoins} Coins added.`;
      uploadStatus.style.color = "var(--income)";
      
      slipIdentifiers.forEach(id => {
        if (!store.settings.usedSlips.includes(id)) {
          store.settings.usedSlips.push(id);
        }
      });
      store.settings.coins = (store.settings.coins || 0) + selectedCoins;
      store.save();
      
      setTimeout(() => {
        close();
        renderRewards(container); // Refresh UI
        alerts.success(`Purchased ${selectedCoins} FinCoins! 🎉`);
      }, 1500);
      
    }, 1200);
  });
}
