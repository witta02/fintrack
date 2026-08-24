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
  const STATIC_BASELINE = {
    "AAPL": { name: "Apple Inc.", price: 312.35, prev: 309.35, currency: "USD", type: "stock" },
    "NVDA": { name: "NVIDIA Corp.", price: 209.89, prev: 214.72, currency: "USD", type: "stock" },
    "TSLA": { name: "Tesla Inc.", price: 356.06, prev: 362.86, currency: "USD", type: "stock" },
    "MSFT": { name: "Microsoft Corp.", price: 448.00, prev: 445.90, currency: "USD", type: "stock" },
    "GOOGL": { name: "Alphabet Inc.", price: 178.60, prev: 177.50, currency: "USD", type: "stock" },
    "AMZN": { name: "Amazon.com Inc.", price: 186.40, prev: 185.50, currency: "USD", type: "stock" },
    "META": { name: "Meta Platforms", price: 512.30, prev: 506.90, currency: "USD", type: "stock" },
    "SPY": { name: "SPDR S&P 500 ETF", price: 764.36, prev: 765.72, currency: "USD", type: "etf" },
    "QQQ": { name: "Invesco QQQ Trust", price: 486.20, prev: 482.30, currency: "USD", type: "etf" },
    "VOO": { name: "Vanguard S&P 500", price: 512.40, prev: 509.80, currency: "USD", type: "etf" },
    "PLTR": { name: "Palantir Tech", price: 32.40, prev: 31.25, currency: "USD", type: "stock" },
    "DELTA": { name: "Delta Electronics (TH)", price: 254.00, prev: 258.00, currency: "THB", type: "stock" },
    "PTT": { name: "PTT Public Co.", price: 41.00, prev: 40.75, currency: "THB", type: "stock" },
    "CPALL": { name: "CP ALL Public Co.", price: 58.75, prev: 59.25, currency: "THB", type: "stock" },
    "AOT": { name: "Airports of Thailand", price: 59.25, prev: 58.50, currency: "THB", type: "stock" },
  };

  const base = STATIC_BASELINE[displaySymbol] || {
    name: displaySymbol,
    price: 100.0,
    prev: 100.0,
    currency: symbol.endsWith('.BK') ? 'THB' : 'USD',
    type: 'stock',
  };

  const change = base.price - base.prev;
  const changePct = base.prev > 0 ? (change / base.prev) * 100 : 0;

  const fallback = {
    symbol: displaySymbol,
    rawSymbol: symbol,
    name: base.name,
    price: base.price,
    previousClose: base.prev,
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
    const name = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : rawSym;

    if (rawSym && shares > 0) {
      const isThai = rawSym.endsWith('.BK') || ["DELTA", "PTT", "CPALL", "AOT", "SCB", "KBANK", "GULF", "ADVANC"].includes(rawSym);
      parsedHoldings.push({
        symbol: rawSym.replace('.BK', ''),
        name: name || rawSym,
        shares: shares,
        avgPrice: avgPrice,
        currency: isThai ? 'THB' : 'USD',
        type: ['SPY', 'QQQ', 'VOO', 'IVV', 'VTI', 'SCHD'].includes(rawSym) ? 'etf' : 'stock',
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

    return {
      ...h,
      currentPrice,
      marketValue,
      totalCost,
      profitLoss,
      profitLossPct,
      dayGain,
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
