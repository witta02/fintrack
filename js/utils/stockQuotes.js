// Real-Time Global Stock Quotes & FX Rates Engine for FinTrack 3.0 Trader Mode

let cachedUsdThbRate = 35.5;
let lastFxFetchTime = 0;
const FX_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// In-memory quote cache
const quoteCache = new Map();
const QUOTE_CACHE_TTL = 30 * 1000; // 30 seconds for live quotes

/**
 * Fetch live USD to THB exchange rate from global FX API
 */
export async function getLiveUsdThbRate() {
  if (Date.now() - lastFxFetchTime < FX_CACHE_TTL && cachedUsdThbRate > 0) {
    return cachedUsdThbRate;
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && data.rates.THB) {
        cachedUsdThbRate = parseFloat(data.rates.THB);
        lastFxFetchTime = Date.now();
        return cachedUsdThbRate;
      }
    }
  } catch (err) {
    console.warn("Failed to fetch live FX rate, using fallback:", err);
  }

  return cachedUsdThbRate;
}

/**
 * Normalize stock symbol for Yahoo Finance
 */
function normalizeSymbol(symbol) {
  let s = (symbol || "").toUpperCase().trim();
  // If Thai stock without .BK suffix and not a standard US ticker
  const thaiStocks = ["DELTA", "PTT", "CPALL", "AOT", "SCB", "KBANK", "BBL", "GULF", "ADVANC", "TRUE", "BDMS", "CPN", "MINT", "OR", "EA", "BANPU", "CRC", "LH", "IVL", "TOP"];
  if (thaiStocks.includes(s) && !s.endsWith(".BK")) {
    return `${s}.BK`;
  }
  return s;
}

// Top-level Stock & Company Registry for instant auto-matching
export const STOCK_REGISTRY = {
  // Top US Stocks
  "AAPL": { name: "Apple Inc.", price: 226.50, prev: 224.20, currency: "USD", type: "stock" },
  "NVDA": { name: "NVIDIA Corp.", price: 128.50, prev: 126.00, currency: "USD", type: "stock" },
  "TSLA": { name: "Tesla Inc.", price: 218.00, prev: 215.50, currency: "USD", type: "stock" },
  "MSFT": { name: "Microsoft Corp.", price: 448.00, prev: 445.90, currency: "USD", type: "stock" },
  "GOOGL": { name: "Alphabet Inc. (Google)", price: 178.60, prev: 177.50, currency: "USD", type: "stock" },
  "GOOG": { name: "Alphabet Inc. (Google)", price: 179.20, prev: 178.00, currency: "USD", type: "stock" },
  "AMZN": { name: "Amazon.com Inc.", price: 186.40, prev: 185.50, currency: "USD", type: "stock" },
  "META": { name: "Meta Platforms (Facebook)", price: 512.30, prev: 506.90, currency: "USD", type: "stock" },
  "AMD": { name: "Advanced Micro Devices", price: 154.20, prev: 151.00, currency: "USD", type: "stock" },
  "INTC": { name: "Intel Corp.", price: 21.50, prev: 20.80, currency: "USD", type: "stock" },
  "PLTR": { name: "Palantir Technologies", price: 32.40, prev: 31.25, currency: "USD", type: "stock" },
  "COIN": { name: "Coinbase Global", price: 215.00, prev: 210.00, currency: "USD", type: "stock" },
  "O": { name: "Realty Income Corp.", price: 61.20, prev: 60.80, currency: "USD", type: "stock" },
  "DIS": { name: "Walt Disney Co.", price: 92.40, prev: 91.50, currency: "USD", type: "stock" },
  "NFLX": { name: "Netflix Inc.", price: 685.00, prev: 678.00, currency: "USD", type: "stock" },
  "BABA": { name: "Alibaba Group", price: 85.00, prev: 83.50, currency: "USD", type: "stock" },
  "BRK.B": { name: "Berkshire Hathaway Inc.", price: 450.00, prev: 448.00, currency: "USD", type: "stock" },
  "JNJ": { name: "Johnson & Johnson", price: 165.00, prev: 164.20, currency: "USD", type: "stock" },
  "JPM": { name: "JPMorgan Chase & Co.", price: 220.00, prev: 218.50, currency: "USD", type: "stock" },
  "V": { name: "Visa Inc.", price: 280.00, prev: 278.00, currency: "USD", type: "stock" },
  "MA": { name: "Mastercard Inc.", price: 475.00, prev: 472.00, currency: "USD", type: "stock" },
  "KO": { name: "Coca-Cola Co.", price: 71.00, prev: 70.50, currency: "USD", type: "stock" },
  "PEP": { name: "PepsiCo Inc.", price: 175.00, prev: 174.00, currency: "USD", type: "stock" },
  "MCD": { name: "McDonald's Corp.", price: 290.00, prev: 288.00, currency: "USD", type: "stock" },
  "NKE": { name: "Nike Inc.", price: 83.00, prev: 82.00, currency: "USD", type: "stock" },
  "SBUX": { name: "Starbucks Corp.", price: 95.00, prev: 94.00, currency: "USD", type: "stock" },

  // Top US ETFs & Index Funds
  "VOO": { name: "Vanguard S&P 500 ETF", price: 512.40, prev: 509.80, currency: "USD", type: "etf" },
  "SPY": { name: "SPDR S&P 500 ETF Trust", price: 560.20, prev: 558.00, currency: "USD", type: "etf" },
  "QQQ": { name: "Invesco QQQ Trust (Nasdaq 100)", price: 486.20, prev: 482.30, currency: "USD", type: "etf" },
  "QQQM": { name: "Invesco NASDAQ 100 ETF", price: 200.50, prev: 198.80, currency: "USD", type: "etf" },
  "SCHD": { name: "Schwab US Dividend Equity ETF", price: 28.50, prev: 28.20, currency: "USD", type: "etf" },
  "BIL": { name: "SPDR Bloomberg 1-3 Month T-Bill ETF", price: 91.61, prev: 91.59, currency: "USD", type: "etf" },
  "IVV": { name: "iShares Core S&P 500 ETF", price: 562.00, prev: 560.00, currency: "USD", type: "etf" },
  "VTI": { name: "Vanguard Total Stock Market ETF", price: 275.00, prev: 273.50, currency: "USD", type: "etf" },
  "VT": { name: "Vanguard Total World Stock ETF", price: 115.00, prev: 114.20, currency: "USD", type: "etf" },
  "SMH": { name: "VanEck Semiconductor ETF", price: 245.00, prev: 242.00, currency: "USD", type: "etf" },
  "SOXX": { name: "iShares Semiconductor ETF", price: 225.00, prev: 222.00, currency: "USD", type: "etf" },
  "DIA": { name: "SPDR Dow Jones Industrial Average", price: 412.00, prev: 410.00, currency: "USD", type: "etf" },
  "VNQ": { name: "Vanguard Real Estate ETF", price: 92.00, prev: 91.20, currency: "USD", type: "etf" },
  "JEPI": { name: "JPMorgan Equity Premium Income", price: 58.00, prev: 57.80, currency: "USD", type: "etf" },
  "JEPQ": { name: "JPMorgan Nasdaq Equity Premium", price: 54.50, prev: 54.20, currency: "USD", type: "etf" },
  "TLT": { name: "iShares 20+ Year Treasury Bond ETF", price: 98.00, prev: 97.50, currency: "USD", type: "etf" },

  // Top Thai SET Stocks
  "DELTA": { name: "Delta Electronics (Thailand)", price: 110.00, prev: 109.00, currency: "THB", type: "stock" },
  "PTT": { name: "PTT Public Company Limited", price: 34.00, prev: 33.75, currency: "THB", type: "stock" },
  "CPALL": { name: "CP ALL (7-Eleven Thailand)", price: 65.50, prev: 65.00, currency: "THB", type: "stock" },
  "AOT": { name: "Airports of Thailand", price: 62.25, prev: 61.75, currency: "THB", type: "stock" },
  "SCB": { name: "SCB X Public Company Limited", price: 112.00, prev: 111.50, currency: "THB", type: "stock" },
  "KBANK": { name: "Kasikornbank", price: 155.00, prev: 154.00, currency: "THB", type: "stock" },
  "BBL": { name: "Bangkok Bank", price: 152.00, prev: 151.00, currency: "THB", type: "stock" },
  "KTB": { name: "Krungthai Bank", price: 20.20, prev: 20.00, currency: "THB", type: "stock" },
  "GULF": { name: "Gulf Energy Development", price: 64.00, prev: 63.50, currency: "THB", type: "stock" },
  "ADVANC": { name: "Advanced Info Service (AIS)", price: 275.00, prev: 273.00, currency: "THB", type: "stock" },
  "TRUE": { name: "True Corporation", price: 11.80, prev: 11.60, currency: "THB", type: "stock" },
  "BDMS": { name: "Bangkok Dusit Medical Services", price: 28.50, prev: 28.25, currency: "THB", type: "stock" },
  "CPN": { name: "Central Pattana (Central)", price: 66.00, prev: 65.50, currency: "THB", type: "stock" },
  "MINT": { name: "Minor International", price: 28.00, prev: 27.75, currency: "THB", type: "stock" },
  "OR": { name: "PTT Oil and Retail (Café Amazon)", price: 15.60, prev: 15.40, currency: "THB", type: "stock" },

  // Top Crypto
  "BTC": { name: "Bitcoin", price: 64000.0, prev: 63500.0, currency: "USD", type: "crypto" },
  "ETH": { name: "Ethereum", price: 2750.0, prev: 2700.0, currency: "USD", type: "crypto" },
  "SOL": { name: "Solana", price: 150.0, prev: 146.0, currency: "USD", type: "crypto" },
  "BNB": { name: "BNB", price: 580.0, prev: 575.0, currency: "USD", type: "crypto" },
};

/**
 * Fast metadata lookup for any ticker
 */
export function lookupStockMeta(rawSymbol) {
  if (!rawSymbol || typeof rawSymbol !== 'string') return null;
  const sym = rawSymbol.toUpperCase().trim().replace('.BK', '');
  if (STOCK_REGISTRY[sym]) {
    return {
      symbol: sym,
      name: STOCK_REGISTRY[sym].name,
      currency: STOCK_REGISTRY[sym].currency,
      type: STOCK_REGISTRY[sym].type,
    };
  }
  const isThai = rawSymbol.toUpperCase().endsWith('.BK') || ["DELTA", "PTT", "CPALL", "AOT", "SCB", "KBANK", "BBL", "GULF", "ADVANC", "TRUE", "BDMS", "CPN", "MINT", "OR"].includes(sym);
  return {
    symbol: sym,
    name: sym,
    currency: isThai ? "THB" : "USD",
    type: ["SPY", "QQQ", "VOO", "QQQM", "SCHD", "BIL", "IVV", "VTI", "VT", "DIA"].includes(sym) ? "etf" : "stock",
  };
}

/**
 * Fetch real-time live stock quote from live financial exchange endpoints
 */
export async function fetchStockQuote(rawSymbol) {
  if (!rawSymbol) return null;
  const symbol = normalizeSymbol(rawSymbol);
  const displaySymbol = symbol.replace('.BK', '');

  // Check cache
  const cached = quoteCache.get(symbol);
  if (cached && (Date.now() - cached.timestamp < QUOTE_CACHE_TTL)) {
    return cached.data;
  }

  const endpoints = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`)}`,
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const meta = json?.chart?.result?.[0]?.meta;
        if (meta && meta.regularMarketPrice !== undefined) {
          const currentPrice = meta.regularMarketPrice;
          const prevClose = meta.chartPreviousClose || meta.previousClose || currentPrice;
          const change = currentPrice - prevClose;
          const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
          const currency = meta.currency || (symbol.endsWith('.BK') ? 'THB' : 'USD');
          const isETF = meta.instrumentType === 'ETF' || symbol === 'SPY' || symbol === 'QQQ' || symbol === 'VOO' || symbol === 'DIA';

          const quote = {
            symbol: displaySymbol,
            rawSymbol: symbol,
            name: meta.shortName || meta.longName || displaySymbol,
            price: Number(currentPrice.toFixed(4)),
            previousClose: Number(prevClose.toFixed(4)),
            change: Number(change.toFixed(4)),
            changePct: Number(changePct.toFixed(2)),
            currency: currency,
            type: isETF ? 'etf' : 'stock',
            marketState: meta.marketState || 'REGULAR',
            updatedAt: Date.now(),
            isRealtime: true,
          };

          quoteCache.set(symbol, { timestamp: Date.now(), data: quote });
          return quote;
        }
      }
    } catch (err) {
      // Continue to next endpoint or fallback
    }
  }

  // Backup fallback with accurate baseline prices if network offline
  const base = STOCK_REGISTRY[displaySymbol] || {
    name: displaySymbol,
    price: 100.0,
    prev: 100.0,
    currency: symbol.endsWith('.BK') ? 'THB' : 'USD',
    type: 'stock',
  };

  const change = base.price - (base.prev || base.price);
  const changePct = base.prev > 0 ? (change / base.prev) * 100 : 0;

  const fallback = {
    symbol: displaySymbol,
    rawSymbol: symbol,
    name: base.name,
    price: base.price,
    previousClose: base.prev || base.price,
    change: Number(change.toFixed(2)),
    changePct: Number(changePct.toFixed(2)),
    currency: base.currency,
    type: base.type,
    updatedAt: Date.now(),
    isRealtime: false,
  };

  quoteCache.set(symbol, { timestamp: Date.now(), data: fallback });
  return fallback;
}

/**
 * Batch fetch real-time quotes for multiple symbols
 */
export async function fetchMultipleQuotes(symbols) {
  const unique = Array.from(new Set((symbols || []).map(s => normalizeSymbol(s))));
  const results = {};
  await Promise.all(
    unique.map(async (sym) => {
      try {
        const q = await fetchStockQuote(sym);
        if (q) {
          results[q.symbol] = q;
          results[sym] = q;
        }
      } catch (e) {
        console.warn(`Error fetching ${sym}:`, e);
      }
    })
  );
  return results;
}

/**
 * Parse Dime!, Excel, and Universal CSV/TSV Portfolio files
 */
export function parseDimeCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Detect delimiter: comma, tab, or semicolon
  const detectDelimiter = (str) => {
    if (str.includes('\t')) return '\t';
    if (str.includes(';')) return ';';
    return ',';
  };

  const delimiter = detectDelimiter(lines[0]);

  // Check if header exists
  const firstLine = lines[0].toLowerCase();
  const hasHeader = firstLine.includes('symbol') || firstLine.includes('ticker') || firstLine.includes('หุ้น') || firstLine.includes('asset') || firstLine.includes('name') || firstLine.includes('สัญลักษณ์');
  const startIdx = hasHeader ? 1 : 0;

  let symIdx = 0, sharesIdx = 1, priceIdx = 2, nameIdx = -1;

  if (hasHeader) {
    const headers = lines[0].split(delimiter).map(h => h.replace(/["']/g, '').trim().toLowerCase());
    symIdx = headers.findIndex(h => h.includes('symbol') || h.includes('ticker') || h.includes('หุ้น') || h.includes('asset') || h.includes('สัญลักษณ์'));
    sharesIdx = headers.findIndex(h => h.includes('shares') || h.includes('quantity') || h.includes('จำนวน') || h.includes('unit') || h.includes('qty') || h.includes('หน่วย'));
    priceIdx = headers.findIndex(h => h.includes('price') || h.includes('avg') || h.includes('cost') || h.includes('ราคา') || h.includes('ต้นทุน'));
    nameIdx = headers.findIndex(h => h.includes('name') || h.includes('ชื่อ'));
  }

  const cleanNum = (val) => {
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) || 0;
  };

  const parsedHoldings = [];

  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.replace(/["']/g, '').trim());
    if (cols.length < 2) continue;

    const rawSym = (symIdx !== -1 && cols[symIdx] ? cols[symIdx] : cols[0])?.toUpperCase().trim();
    const shares = cleanNum(sharesIdx !== -1 ? cols[sharesIdx] : cols[1]);
    const avgPrice = cleanNum(priceIdx !== -1 ? cols[priceIdx] : cols[2]);
    const extractedName = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : "";

    if (rawSym && shares > 0) {
      const meta = lookupStockMeta(rawSym);
      const isThai = rawSym.endsWith('.BK') || (meta && meta.currency === 'THB');
      
      parsedHoldings.push({
        symbol: rawSym.replace('.BK', ''),
        name: (extractedName && extractedName !== rawSym) ? extractedName : (meta ? meta.name : rawSym),
        shares: shares,
        avgPrice: avgPrice,
        currency: isThai ? 'THB' : (meta ? meta.currency : 'USD'),
        type: meta ? meta.type : (isThai ? 'stock' : 'stock'),
      });
    }
  }

  return parsedHoldings;
}

/**
 * Calculate accurate real-time portfolio value, P/L, and allocation
 */
export async function calculatePortfolioStats(holdings, quotes = {}) {
  const usdThbRate = await getLiveUsdThbRate();
  let totalValueTHB = 0;
  let totalCostTHB = 0;
  let totalValueUSD = 0;
  let totalCostUSD = 0;
  let dayGainTHB = 0;

  const enrichedHoldings = (holdings || []).map((h) => {
    const q = quotes[h.symbol] || quotes[`${h.symbol}.BK`] || {
      price: h.avgPrice,
      change: 0,
      changePct: 0,
      currency: h.currency || "USD",
      isRealtime: false,
    };

    const currentPrice = q.price || h.avgPrice;
    const marketValue = h.shares * currentPrice;
    const totalCost = h.shares * h.avgPrice;
    const profitLoss = marketValue - totalCost;
    const profitLossPct = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;
    const dayGain = h.shares * (q.change || 0);

    const isUSD = h.currency === "USD";
    const valInTHB = isUSD ? marketValue * usdThbRate : marketValue;
    const costInTHB = isUSD ? totalCost * usdThbRate : totalCost;
    const dayGainInTHB = isUSD ? dayGain * usdThbRate : dayGain;

    totalValueTHB += valInTHB;
    totalCostTHB += costInTHB;
    dayGainTHB += dayGainInTHB;

    if (isUSD) {
      totalValueUSD += marketValue;
      totalCostUSD += totalCost;
    } else {
      totalValueUSD += marketValue / usdThbRate;
      totalCostUSD += totalCost / usdThbRate;
    }

    const meta = lookupStockMeta(h.symbol);
    const resolvedName = (h.name && h.name !== h.symbol) 
      ? h.name 
      : (q.name && q.name !== h.symbol ? q.name : (meta ? meta.name : h.symbol));
    const resolvedType = meta ? meta.type : (h.type || 'stock');
    const profitLossTHB = isUSD ? profitLoss * usdThbRate : profitLoss;
    const profitLossUSD = isUSD ? profitLoss : profitLoss / usdThbRate;

    return {
      ...h,
      name: resolvedName,
      type: resolvedType,
      currentPrice,
      marketValue,
      totalCost,
      profitLoss,
      profitLossTHB,
      profitLossUSD,
      profitLossPct,
      dayGain,
      dayGainInTHB,
      changePct: q.changePct || 0,
      valInTHB,
      isRealtime: q.isRealtime !== false,
    };
  });

  const totalPLTHB = totalValueTHB - totalCostTHB;
  const totalPLPct = totalCostTHB > 0 ? (totalPLTHB / totalCostTHB) * 100 : 0;
  const dayGainPct = totalValueTHB > 0 ? (dayGainTHB / totalValueTHB) * 100 : 0;

  return {
    usdThbRate,
    totalValueTHB,
    totalCostTHB,
    totalPLTHB,
    totalPLPct,
    totalValueUSD,
    totalCostUSD,
    dayGainTHB,
    dayGainPct,
    holdings: enrichedHoldings,
  };
}
