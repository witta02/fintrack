import { store } from "../store.js";
import { router } from "../router.js";
import { alerts } from "../utils/alertHelper.js";
import { t } from "../i18n.js";
import {
  fetchStockQuote,
  fetchMultipleQuotes,
  parseDimeCSV,
  calculatePortfolioStats,
  getLiveUsdThbRate,
  lookupStockMeta,
} from "../utils/stockQuotes.js";

let liveQuotes = {};
let isLoadingQuotes = false;
let autoRefreshTimer = null;

export async function renderPortfolio(container) {
  const portfolio = store.getPortfolio();
  const holdings = portfolio.holdings || [];
  const symbolTHB = "฿";

  // Fetch live quotes if we haven't already or when refreshing
  if (holdings.length > 0 && !isLoadingQuotes) {
    isLoadingQuotes = true;
    const symbols = holdings.map(h => h.symbol);
    fetchMultipleQuotes(symbols).then(async (quotes) => {
      liveQuotes = quotes;
      isLoadingQuotes = false;
      if (document.getElementById("portfolio-holdings-list")) {
        const stats = await calculatePortfolioStats(holdings, liveQuotes);
        updatePortfolioDOM(container, stats);
      }
    });
  }

  const stats = await calculatePortfolioStats(holdings, liveQuotes);

  container.innerHTML = `
    <div class="screen screen-enter" style="padding: 0 16px 28px;">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0 16px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <button id="back-btn" class="icon-btn" style="background: var(--surface); border: 1px solid var(--border); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: var(--text-primary); margin: 0;">
              ${store.settings.language === 'en' ? 'Trader Portfolio' : 'พอร์ตลงทุน (Trader)'}
            </h1>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="import-dime-btn" class="icon-btn" title="Import from Dime" style="width: 40px; height: 40px; border-radius: 12px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); display: flex; align-items: center; justify-content: center; color: #818cf8;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button id="add-stock-btn" class="icon-btn" title="Add Asset" style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, var(--gold), var(--amber)); border: none; display: flex; align-items: center; justify-content: center; color: #000; box-shadow: var(--shadow-gold);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>

      <!-- Realtime Status Banner -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: rgba(52, 211, 153, 0.08); border: 1px solid rgba(52, 211, 153, 0.2); border-radius: 10px; margin-bottom: 14px; font-size: 11px; color: var(--income); font-weight: 700;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="width: 7px; height: 7px; background: var(--income); border-radius: 50%; display: inline-block; box-shadow: 0 0 8px var(--income);"></span>
          <span>${store.settings.language === 'en' ? 'LIVE MARKET CONNECTED' : 'เชื่อมต่อข้อมูลตลาดแบบเรียลไทม์'}</span>
        </div>
        <span style="color: var(--text-secondary); font-weight: 600;">1 USD = ${stats.usdThbRate.toFixed(2)} THB</span>
      </div>

      <!-- Hero Portfolio Value Card -->
      <div style="background: linear-gradient(135deg, #0d1527 0%, #151e36 100%); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 22px; margin-bottom: 16px; position: relative; overflow: hidden;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary);">
            ${store.settings.language === 'en' ? 'Total Portfolio Value' : 'มูลค่าพอร์ตลงทุนรวม'}
          </div>
          <span style="font-size: 10px; font-weight: 800; background: rgba(99, 102, 241, 0.2); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); padding: 2px 8px; border-radius: 999px;">
            TRADER MODE
          </span>
        </div>
        
        <div id="stat-total-thb" style="font-size: 36px; font-weight: 900; color: #fff; font-family: var(--font-heading); line-height: 1.1; margin-bottom: 6px;">
          ${symbolTHB}${stats.totalValueTHB.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div id="stat-total-usd" style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; font-weight: 600;">
          ≈ $${stats.totalValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
        </div>

        <!-- Profit / Loss Row -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08);">
          <div style="background: rgba(255,255,255,0.03); padding: 10px 12px; border-radius: var(--radius); border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 10px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">
              ${store.settings.language === 'en' ? 'Total Profit/Loss' : 'กำไร/ขาดทุนสะสม'}
            </div>
            <div id="stat-total-pl" style="font-size: 14px; font-weight: 800; color: ${stats.totalPLTHB >= 0 ? 'var(--income)' : 'var(--expense)'};">
              ${stats.totalPLTHB >= 0 ? '+' : ''}${symbolTHB}${stats.totalPLTHB.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span style="font-size: 11px; opacity: 0.9;">(${stats.totalPLPct >= 0 ? '+' : ''}${stats.totalPLPct.toFixed(2)}%)</span>
            </div>
          </div>
          <div style="background: rgba(255,255,255,0.03); padding: 10px 12px; border-radius: var(--radius); border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 10px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px; text-transform: uppercase;">
              ${store.settings.language === 'en' ? "Today's Change" : 'การเปลี่ยนแปลงวันนี้'}
            </div>
            <div id="stat-day-gain" style="font-size: 14px; font-weight: 800; color: ${stats.dayGainTHB >= 0 ? 'var(--income)' : 'var(--expense)'};">
              ${stats.dayGainTHB >= 0 ? '+' : ''}${symbolTHB}${stats.dayGainTHB.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span style="font-size: 11px; opacity: 0.9;">(${stats.dayGainPct >= 0 ? '+' : ''}${stats.dayGainPct.toFixed(2)}%)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Chips -->
      <div style="display: flex; gap: 8px; margin-bottom: 18px; overflow-x: auto; padding-bottom: 2px;">
        <button id="import-dime-chip" style="flex-shrink: 0; padding: 8px 14px; background: rgba(99, 102, 241, 0.12); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 999px; color: #818cf8; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 6px; cursor: pointer;">
          <span>📥</span> ${store.settings.language === 'en' ? 'Import from Dime!' : 'นำเข้าพอร์ต Dime! / CSV'}
        </button>
        <button id="refresh-quotes-chip" style="flex-shrink: 0; padding: 8px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 999px; color: var(--text-secondary); font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 6px; cursor: pointer;">
          <span>🔄</span> ${store.settings.language === 'en' ? 'Refresh Live Quotes' : 'อัปเดตราคาแบบเรียลไทม์'}
        </button>
      </div>

      <!-- Holdings List Section -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px;">
        <div style="font-size: 13px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">
          ${store.settings.language === 'en' ? 'Holdings & Positions' : 'สินทรัพย์ในพอร์ต'} (${holdings.length})
        </div>
      </div>

      <div id="portfolio-holdings-list" style="display: flex; flex-direction: column; gap: 10px;">
        ${stats.holdings.length ? stats.holdings.map(renderHoldingTile).join('') : emptyPortfolioState()}
      </div>
    </div>
  `;

  setupPortfolioListeners(container);

  // Auto-refresh quotes every 30 seconds while screen is open
  if (autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(async () => {
    if (document.getElementById("portfolio-holdings-list")) {
      const currentHoldings = store.getPortfolio().holdings || [];
      if (currentHoldings.length > 0) {
        liveQuotes = await fetchMultipleQuotes(currentHoldings.map(h => h.symbol));
        const newStats = await calculatePortfolioStats(currentHoldings, liveQuotes);
        updatePortfolioDOM(container, newStats);
      }
    } else {
      clearInterval(autoRefreshTimer);
    }
  }, 30000);
}

function updatePortfolioDOM(container, stats) {
  const symbolTHB = "฿";
  const totThb = container.querySelector("#stat-total-thb");
  const totUsd = container.querySelector("#stat-total-usd");
  const totPl = container.querySelector("#stat-total-pl");
  const dayGain = container.querySelector("#stat-day-gain");
  const list = container.querySelector("#portfolio-holdings-list");

  if (totThb) totThb.textContent = `${symbolTHB}${stats.totalValueTHB.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (totUsd) totUsd.textContent = `≈ $${stats.totalValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  if (totPl) {
    totPl.style.color = stats.totalPLTHB >= 0 ? 'var(--income)' : 'var(--expense)';
    totPl.innerHTML = `${stats.totalPLTHB >= 0 ? '+' : ''}${symbolTHB}${stats.totalPLTHB.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size: 11px; opacity: 0.9;">(${stats.totalPLPct >= 0 ? '+' : ''}${stats.totalPLPct.toFixed(2)}%)</span>`;
  }
  if (dayGain) {
    dayGain.style.color = stats.dayGainTHB >= 0 ? 'var(--income)' : 'var(--expense)';
    dayGain.innerHTML = `${stats.dayGainTHB >= 0 ? '+' : ''}${symbolTHB}${stats.dayGainTHB.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style="font-size: 11px; opacity: 0.9;">(${stats.dayGainPct >= 0 ? '+' : ''}${stats.dayGainPct.toFixed(2)}%)</span>`;
  }
  if (list) {
    list.innerHTML = stats.holdings.length ? stats.holdings.map(renderHoldingTile).join('') : emptyPortfolioState();
    attachHoldingHandlers(container);
  }
}

function getStockBrandStyle(symbol) {
  const sym = (symbol || "").toUpperCase();
  const brands = {
    VOO: { bg: "rgba(197, 34, 31, 0.18)", color: "#f87171" },
    QQQM: { bg: "rgba(0, 47, 108, 0.25)", color: "#60a5fa" },
    QQQ: { bg: "rgba(0, 47, 108, 0.25)", color: "#60a5fa" },
    O: { bg: "rgba(179, 27, 27, 0.22)", color: "#fb7185" },
    SCHD: { bg: "rgba(0, 160, 223, 0.22)", color: "#38bdf8" },
    BIL: { bg: "rgba(11, 59, 96, 0.3)", color: "#93c5fd" },
    SPY: { bg: "rgba(11, 59, 96, 0.3)", color: "#93c5fd" },
    NVDA: { bg: "rgba(118, 185, 0, 0.2)", color: "#a3e635" },
    AAPL: { bg: "rgba(255, 255, 255, 0.12)", color: "#f1f5f9" },
    TSLA: { bg: "rgba(232, 33, 39, 0.2)", color: "#f43f5e" },
    DELTA: { bg: "rgba(0, 130, 138, 0.22)", color: "#2dd4bf" },
    PTT: { bg: "rgba(0, 84, 148, 0.25)", color: "#38bdf8" },
    CPALL: { bg: "rgba(34, 139, 34, 0.22)", color: "#4ade80" },
  };
  return brands[sym] || { bg: "rgba(99, 102, 241, 0.12)", color: "#818cf8" };
}

function renderHoldingTile(h) {
  const isUSD = h.currency === "USD";
  const sym = isUSD ? "$" : "฿";
  const isProfit = h.profitLoss >= 0;
  const brand = getStockBrandStyle(h.symbol);
  const sharesFormatted = typeof h.shares === 'number' 
    ? h.shares.toLocaleString('en-US', { maximumFractionDigits: 7 }) 
    : h.shares;

  const plAmountTHB = h.profitLossTHB !== undefined 
    ? Math.abs(h.profitLossTHB) 
    : Math.abs(h.profitLoss);

  return `
    <div class="card holding-card" style="background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 16px; transition: all var(--transition);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: ${brand.bg}; color: ${brand.color}; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 900; font-family: var(--font-heading); text-transform: uppercase; border: 1px solid rgba(255,255,255,0.06);">
            ${h.symbol.slice(0, 4)}
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <h3 style="font-size: 15px; font-weight: 800; color: var(--text-primary); margin: 0;">${h.symbol}</h3>
              <span style="font-size: 9px; font-weight: 700; background: var(--surface); color: var(--text-secondary); padding: 1px 5px; border-radius: 4px; text-transform: uppercase;">
                ${h.type || 'stock'}
              </span>
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 1px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${h.name || h.symbol}
            </div>
          </div>
        </div>

        <div style="text-align: right;">
          <div style="font-size: 16px; font-weight: 900; color: var(--text-primary); font-family: var(--font-heading);">
            ฿${(h.valInTHB || h.marketValue).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          ${isUSD ? `
            <div style="font-size: 11px; color: var(--text-secondary); font-weight: 600; margin-top: 1px;">
              ≈ $${h.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
          ` : ''}
          <div style="font-size: 11px; font-weight: 700; color: ${isProfit ? 'var(--income)' : 'var(--expense)'}; margin-top: 2px;">
            ${isProfit ? '+' : ''}${h.profitLossPct.toFixed(2)}% (${isProfit ? '+' : '-'}฿${plAmountTHB.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
          </div>
        </div>
      </div>

      <!-- Details Row -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid var(--border); font-size: 11.5px; color: var(--text-secondary);">
        <div>
          <span>${sharesFormatted} ${store.settings.language === 'en' ? 'shares' : 'หุ้น'} @ ${sym}${h.avgPrice.toFixed(2)}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: var(--text-primary); font-weight: 700;">
            ${store.settings.language === 'en' ? 'Live:' : 'ราคา:'} ${sym}${h.currentPrice.toFixed(2)}
          </span>
          <button class="edit-holding-btn" data-holding-id="${h.id}" title="Edit" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; display: flex; align-items: center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="delete-holding-btn" data-holding-id="${h.id}" title="Delete" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; display: flex; align-items: center;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function emptyPortfolioState() {
  return `
    <div style="text-align: center; padding: 48px 20px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-xl);">
      <div style="font-size: 40px; margin-bottom: 12px;">📈</div>
      <h3 style="font-size: 16px; font-weight: 800; color: var(--text-primary); margin-bottom: 6px;">
        ${store.settings.language === 'en' ? 'No stock positions yet' : 'ยังไม่มีสินทรัพย์ในพอร์ต'}
      </h3>
      <p style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 20px; max-width: 260px; margin-inline: auto;">
        ${store.settings.language === 'en' ? 'Import your stock portfolio from Dime! app or add manually to track live real-time prices & P/L.' : 'นำเข้าพอร์ตหุ้นจากแอป Dime! หรือเพิ่มหุ้นเพื่อติดตามราคาจริงและกำไร/ขาดทุนแบบเรียลไทม์'}
      </p>
      <div style="display: flex; flex-direction: column; gap: 8px; max-width: 240px; margin: 0 auto;">
        <button id="empty-import-btn" style="padding: 12px 20px; background: linear-gradient(135deg, var(--gold), var(--amber)); color: #000; font-weight: 800; font-size: 13px; border: none; border-radius: var(--radius); cursor: pointer; box-shadow: var(--shadow-gold);">
          📥 ${store.settings.language === 'en' ? 'Import from Dime!' : 'นำเข้าจาก Dime! / CSV'}
        </button>
        <button id="demo-import-btn" style="padding: 10px 16px; background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); color: #818cf8; font-weight: 700; font-size: 12px; border-radius: var(--radius); cursor: pointer;">
          ✨ ${store.settings.language === 'en' ? 'Load Sample Tech Portfolio' : 'ลองโหลดพอร์ตตัวอย่าง (AAPL, NVDA, TSLA)'}
        </button>
      </div>
    </div>
  `;
}

function attachHoldingHandlers(container) {
  container.querySelectorAll(".delete-holding-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-holding-id");
      const isConfirmed = await alerts.confirmDelete(
        store.settings.language === 'en' ? 'Remove Position?' : 'ต้องการลบรายการนี้?',
        store.settings.language === 'en' ? 'This will remove this asset from your portfolio.' : 'สินทรัพย์นี้จะถูกลบออกจากพอร์ตของคุณ'
      );
      if (isConfirmed) {
        store.deleteStockHolding(id);
        renderPortfolio(container);
      }
    });
  });

  container.querySelectorAll(".edit-holding-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-holding-id");
      const holdings = store.getPortfolio().holdings || [];
      const h = holdings.find((item) => item.id === id);
      if (h) {
        showEditStockModal(container, h);
      }
    });
  });
}

function showEditStockModal(container, holding) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog" style="background: var(--card-solid); border: 1px solid var(--border); border-radius: 20px; padding: 24px; max-width: 360px; width: 90%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 17px; font-weight: 800; color: var(--text-primary); margin: 0;">
          ${store.settings.language === 'en' ? 'Edit Asset Position' : 'แก้ไขสินทรัพย์ในพอร์ต'}
        </h3>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-muted); font-size: 24px; cursor: pointer;">×</button>
      </div>
      <form id="edit-stock-form" style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">
            ${store.settings.language === 'en' ? 'Ticker Symbol' : 'ชื่อย่อหุ้น (Ticker)'}
          </label>
          <input name="symbol" value="${holding.symbol}" required style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); text-transform: uppercase; font-weight: 800;" />
        </div>
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">
            ${store.settings.language === 'en' ? 'Company Name / Description' : 'ชื่อบริษัท / สินทรัพย์'}
          </label>
          <input name="name" value="${holding.name || holding.symbol}" placeholder="Apple Inc." style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" />
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">
              ${store.settings.language === 'en' ? 'Shares' : 'จำนวนหุ้น (Shares)'}
            </label>
            <input name="shares" type="number" step="any" min="0.0000001" value="${holding.shares}" required style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-weight: 700;" />
          </div>
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">
              ${store.settings.language === 'en' ? 'Avg Cost' : 'ราคาต้นทุนเฉลี่ย'}
            </label>
            <input name="avgPrice" type="number" step="any" min="0.0001" value="${holding.avgPrice}" required style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-weight: 700;" />
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">สกุลเงิน (Currency)</label>
            <select name="currency" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);">
              <option value="USD" ${holding.currency === 'USD' ? 'selected' : ''}>USD ($)</option>
              <option value="THB" ${holding.currency === 'THB' ? 'selected' : ''}>THB (฿)</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">ประเภท (Type)</label>
            <select name="type" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);">
              <option value="stock" ${holding.type === 'stock' ? 'selected' : ''}>หุ้น (Stock)</option>
              <option value="etf" ${holding.type === 'etf' ? 'selected' : ''}>ETF</option>
              <option value="crypto" ${holding.type === 'crypto' ? 'selected' : ''}>คริปโต (Crypto)</option>
            </select>
          </div>
        </div>
        <button type="submit" class="btn-primary" style="margin-top: 6px; padding: 14px; background: linear-gradient(135deg, var(--gold), var(--amber)); color: #000; font-weight: 800; border: none; border-radius: var(--radius); cursor: pointer;">
          ${t("save")}
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close-btn").addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

  const symbolInput = modal.querySelector('input[name="symbol"]');
  const nameInput = modal.querySelector('input[name="name"]');
  const currencySelect = modal.querySelector('select[name="currency"]');
  const typeSelect = modal.querySelector('select[name="type"]');

  symbolInput.addEventListener("input", (e) => {
    const sym = e.target.value.trim();
    const meta = lookupStockMeta(sym);
    if (meta && meta.name !== sym) {
      nameInput.value = meta.name;
      if (currencySelect) currencySelect.value = meta.currency;
      if (typeSelect) typeSelect.value = meta.type;
    }
  });

  modal.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    store.updateStockHolding({
      id: holding.id,
      symbol: data.get("symbol"),
      name: data.get("name") || data.get("symbol"),
      shares: parseFloat(data.get("shares")),
      avgPrice: parseFloat(data.get("avgPrice")),
      currency: data.get("currency"),
      type: data.get("type"),
    });
    close();
    alerts.success(store.settings.language === 'en' ? 'Position Updated!' : 'แก้ไขรายการสำเร็จ!');
    renderPortfolio(container);
  });
}

function setupPortfolioListeners(container) {
  container.querySelector("#back-btn")?.addEventListener("click", () => {
    router.navigate("dashboard");
  });

  const openImport = () => showDimeImportModal(container);
  container.querySelector("#import-dime-btn")?.addEventListener("click", openImport);
  container.querySelector("#import-dime-chip")?.addEventListener("click", openImport);
  container.querySelector("#empty-import-btn")?.addEventListener("click", openImport);

  container.querySelector("#demo-import-btn")?.addEventListener("click", () => {
    store.importPortfolio([
      { symbol: "AAPL", name: "Apple Inc.", shares: 15, avgPrice: 220.50, currency: "USD", type: "stock" },
      { symbol: "NVDA", name: "NVIDIA Corp.", shares: 30, avgPrice: 115.20, currency: "USD", type: "stock" },
      { symbol: "TSLA", name: "Tesla Inc.", shares: 8, avgPrice: 240.00, currency: "USD", type: "stock" },
      { symbol: "SPY", name: "SPDR S&P 500 ETF", shares: 5, avgPrice: 540.00, currency: "USD", type: "etf" },
      { symbol: "DELTA", name: "Delta Electronics (TH)", shares: 200, avgPrice: 110.00, currency: "THB", type: "stock" },
    ]);
    alerts.success(
      store.settings.language === 'en' ? 'Sample Portfolio Loaded!' : 'โหลดพอร์ตตัวอย่างสำเร็จ!',
      'AAPL, NVDA, TSLA, SPY, DELTA'
    );
    renderPortfolio(container);
  });

  container.querySelector("#add-stock-btn")?.addEventListener("click", () => {
    showAddStockModal(container);
  });

  container.querySelector("#refresh-quotes-chip")?.addEventListener("click", async () => {
    const portfolio = store.getPortfolio();
    const symbols = (portfolio.holdings || []).map(h => h.symbol);
    alerts.info(store.settings.language === 'en' ? 'Refreshing live market quotes...' : 'กำลังดึงราคาตลาดสดแบบเรียลไทม์...');
    liveQuotes = await fetchMultipleQuotes(symbols);
    const stats = await calculatePortfolioStats(portfolio.holdings || [], liveQuotes);
    updatePortfolioDOM(container, stats);
    alerts.success(store.settings.language === 'en' ? 'Prices Updated!' : 'อัปเดตราคาล่าสุดแล้ว!');
  });

  attachHoldingHandlers(container);
}

function showDimeImportModal(container) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog" style="background: var(--card-solid); border: 1px solid var(--border); border-radius: 20px; padding: 24px; max-width: 400px; width: 92%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <h3 style="font-size: 17px; font-weight: 800; color: var(--text-primary); margin: 0;">
          📥 ${store.settings.language === 'en' ? 'Import Dime! / CSV Portfolio' : 'นำเข้าพอร์ตจาก Dime! / CSV'}
        </h3>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-muted); font-size: 24px; cursor: pointer;">×</button>
      </div>
      
      <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 16px;">
        ${store.settings.language === 'en' ? 'Upload or paste your CSV export from Dime! / broker to automatically import stock positions.' : 'อัปโหลดไฟล์หรือวางข้อความ CSV จาก Dime! หรือโบรกเกอร์ เพื่อนำเข้าพอร์ตอัตโนมัติ'}
      </p>

      <form id="dime-import-form" style="display: flex; flex-direction: column; gap: 12px;">
        <!-- File upload box -->
        <label style="border: 2px dashed var(--border); border-radius: 14px; padding: 18px; text-align: center; cursor: pointer; background: var(--surface); display: block;">
          <input type="file" id="dime-file-input" accept=".csv,text/csv,text/plain" style="display: none;" />
          <div style="font-size: 24px; margin-bottom: 6px;">📄</div>
          <span style="font-size: 12px; font-weight: 700; color: var(--gold); display: block;" id="file-label">
            ${store.settings.language === 'en' ? 'Choose CSV File' : 'เลือกไฟล์ CSV'}
          </span>
          <span style="font-size: 10px; color: var(--text-muted);">${store.settings.language === 'en' ? 'or drag & drop here' : 'หรือลากไฟล์มาวางที่นี่'}</span>
        </label>

        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">
            ${store.settings.language === 'en' ? 'Or Paste CSV Text (Symbol, Shares, AvgPrice)' : 'หรือวางข้อความ CSV (Symbol, Shares, AvgPrice)'}
          </label>
          <textarea id="dime-csv-textarea" rows="4" placeholder="AAPL, 10, 210.50&#10;NVDA, 25, 120.00&#10;TSLA, 5, 230.00" style="width: 100%; padding: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); font-family: monospace; font-size: 12px; resize: vertical;"></textarea>
        </div>

        <button type="submit" class="btn-primary" style="margin-top: 6px; padding: 14px; background: linear-gradient(135deg, var(--gold), var(--amber)); color: #000; font-weight: 800; border: none; border-radius: var(--radius); cursor: pointer;">
          ${store.settings.language === 'en' ? 'Import Positions' : 'นำเข้าพอร์ตลงทุน'}
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close-btn").addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

  const fileInput = modal.querySelector("#dime-file-input");
  const fileLabel = modal.querySelector("#file-label");
  const textarea = modal.querySelector("#dime-csv-textarea");

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      fileLabel.textContent = `✓ ${file.name}`;
      const reader = new FileReader();
      reader.onload = (re) => {
        textarea.value = re.target.result;
      };
      reader.readAsText(file);
    }
  });

  modal.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const csvContent = textarea.value.trim();
    if (!csvContent) {
      alerts.warning(store.settings.language === 'en' ? 'Please provide CSV content' : 'กรุณากรอกหรืออัปโหลดไฟล์ CSV');
      return;
    }

    const items = parseDimeCSV(csvContent);
    if (items.length === 0) {
      alerts.error(store.settings.language === 'en' ? 'Could not parse any stock positions' : 'ไม่พบข้อมูลหุ้นที่ถูกต้องในไฟล์');
      return;
    }

    const count = store.importPortfolio(items);
    alerts.success(
      store.settings.language === 'en' ? `Imported ${count} positions!` : `นำเข้าพอร์ตสำเร็จ ${count} รายการ!`,
      items.map(i => i.symbol).join(', ')
    );
    close();
    renderPortfolio(container);
  });
}

function showAddStockModal(container) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-dialog" style="background: var(--card-solid); border: 1px solid var(--border); border-radius: 20px; padding: 24px; max-width: 360px; width: 90%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-size: 17px; font-weight: 800; color: var(--text-primary); margin: 0;">
          ${store.settings.language === 'en' ? 'Add Asset to Portfolio' : 'เพิ่มสินทรัพย์ในพอร์ต'}
        </h3>
        <button class="modal-close-btn" style="background: none; border: none; color: var(--text-muted); font-size: 24px; cursor: pointer;">×</button>
      </div>
      <form id="add-stock-form" style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">
            ${store.settings.language === 'en' ? 'Ticker Symbol (e.g. AAPL, NVDA, DELTA)' : 'ชื่อย่อหุ้น (เช่น AAPL, NVDA, DELTA)'}
          </label>
          <input name="symbol" required placeholder="AAPL" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary); text-transform: uppercase; font-weight: 800;" />
        </div>
        <div>
          <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">
            ${store.settings.language === 'en' ? 'Company Name / Description' : 'ชื่อบริษัท / สินทรัพย์'}
          </label>
          <input name="name" placeholder="Apple Inc." style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" />
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">
              ${store.settings.language === 'en' ? 'Shares (จำนวนหุ้น)' : 'จำนวนหุ้น'}
            </label>
            <input name="shares" type="number" step="any" min="0.0001" required placeholder="10" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" />
          </div>
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">
              ${store.settings.language === 'en' ? 'Avg Buy Price (ราคาเฉลี่ย)' : 'ราคาเฉลี่ย'}
            </label>
            <input name="avgPrice" type="number" step="0.01" min="0.001" required placeholder="215.50" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);" />
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">สกุลเงิน (Currency)</label>
            <select name="currency" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);">
              <option value="USD">USD ($)</option>
              <option value="THB">THB (฿)</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 11px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">ประเภท (Type)</label>
            <select name="type" style="width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text-primary);">
              <option value="stock">หุ้น (Stock)</option>
              <option value="etf">ETF</option>
              <option value="crypto">คริปโต (Crypto)</option>
            </select>
          </div>
        </div>
        <button type="submit" class="btn-primary" style="margin-top: 6px; padding: 14px; background: linear-gradient(135deg, var(--gold), var(--amber)); color: #000; font-weight: 800; border: none; border-radius: var(--radius); cursor: pointer;">
          ${t("save")}
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector(".modal-close-btn").addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

  const symbolInput = modal.querySelector('input[name="symbol"]');
  const nameInput = modal.querySelector('input[name="name"]');
  const currencySelect = modal.querySelector('select[name="currency"]');
  const typeSelect = modal.querySelector('select[name="type"]');

  symbolInput.addEventListener("input", (e) => {
    const sym = e.target.value.trim();
    const meta = lookupStockMeta(sym);
    if (meta && meta.name !== sym) {
      nameInput.value = meta.name;
      if (currencySelect) currencySelect.value = meta.currency;
      if (typeSelect) typeSelect.value = meta.type;
    }
  });

  modal.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    store.addStockHolding({
      symbol: data.get("symbol"),
      name: data.get("name") || data.get("symbol"),
      shares: parseFloat(data.get("shares")),
      avgPrice: parseFloat(data.get("avgPrice")),
      currency: data.get("currency"),
      type: data.get("type"),
    });
    close();
    renderPortfolio(container);
  });
}
