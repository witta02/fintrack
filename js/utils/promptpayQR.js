import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

// Direct access to Vite environment variables for compile-time replacement
export const DEFAULT_PROMPTPAY_ID =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_PROMPTPAY_ID)
    ? import.meta.env.VITE_PROMPTPAY_ID
    : "0832173858";

/**
 * Formats PromptPay ID (Phone, Citizen ID, or e-Wallet ID) for payload generator.
 */
export function formatPromptPayId(id) {
  let formatted = (id || "").replace(/[\s-]/g, "");
  if (formatted.length === 10 && formatted.startsWith("0")) {
    formatted = "66" + formatted.substring(1);
  }
  return formatted;
}

/**
 * Masks PromptPay ID for safe web display without showing all digits.
 * e.g. 10-digit Phone -> 083-xxx-3858
 * e.g. 13-digit Tax ID -> 1-80xx-xxxxx-56-6
 */
export function maskPromptPayId(id) {
  if (!id) return "";
  const clean = id.replace(/[\s-]/g, "");
  if (clean.length === 10) {
    return `${clean.slice(0, 3)}-xxx-${clean.slice(6)}`;
  } else if (clean.length === 13) {
    return `${clean.slice(0, 1)}-${clean.slice(1, 3)}xx-xxxxx-${clean.slice(10, 12)}-${clean.slice(12)}`;
  }
  if (clean.length > 6) {
    return `${clean.slice(0, 3)}${"x".repeat(clean.length - 6)}${clean.slice(-3)}`;
  }
  return clean;
}

/**
 * Generates PromptPay EMVCo QR code payload.
 */
export function generatePromptPayPayload(targetId, amount) {
  const target = targetId || DEFAULT_PROMPTPAY_ID;
  const formattedId = formatPromptPayId(target);
  const numAmount = amount ? Number(amount) : undefined;
  return generatePayload(formattedId, numAmount ? { amount: numAmount } : undefined);
}

/**
 * Renders a high-resolution, branded PromptPay payment card to a canvas and triggers download or native mobile sharing.
 *
 * @param {HTMLCanvasElement|string} sourceCanvasOrPayload - Source QR canvas or EMVCo payload string
 * @param {Object} options
 * @param {number} [options.amount] - Payment amount (e.g. 59)
 * @param {string} [options.promptpayId] - Target PromptPay ID
 * @param {string} [options.title] - Card title (e.g. "FinCoins Top-Up")
 * @param {string} [options.subtitle] - Card subtitle
 * @returns {Promise<boolean>}
 */
export async function downloadQRCodeCard(sourceCanvasOrPayload, options = {}) {
  const amount = options.amount || 0;
  const promptpayId = options.promptpayId || DEFAULT_PROMPTPAY_ID;
  const maskedId = maskPromptPayId(promptpayId);
  const title = options.title || "PromptPay QR Payment";
  const subtitle = options.subtitle || "สแกนจ่ายผ่านแอปธนาคารทุกแห่ง (Any Bank App)";

  // 1. Prepare QR Canvas (280x280)
  let qrCanvas;
  if (typeof sourceCanvasOrPayload === "string") {
    qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, sourceCanvasOrPayload, {
      width: 280,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" }
    });
  } else if (sourceCanvasOrPayload instanceof HTMLCanvasElement) {
    qrCanvas = sourceCanvasOrPayload;
  } else {
    // Generate from payload
    const payload = generatePromptPayPayload(promptpayId, amount);
    qrCanvas = document.createElement("canvas");
    await QRCode.toCanvas(qrCanvas, payload, {
      width: 280,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" }
    });
  }

  // 2. Create High-Resolution Card Canvas (640 x 820 px)
  const cardCanvas = document.createElement("canvas");
  const width = 640;
  const height = 820;
  cardCanvas.width = width;
  cardCanvas.height = height;
  const ctx = cardCanvas.getContext("2d");

  // Rounded card clip / background
  const radius = 32;
  ctx.save();
  ctx.fillStyle = "#0c101a";
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, radius);
  ctx.fill();

  // Outer border accent
  ctx.strokeStyle = "rgba(245, 200, 66, 0.4)";
  ctx.lineWidth = 4;
  ctx.stroke();

  // Top Header Banner (PromptPay Blue/Gold tone)
  const grad = ctx.createLinearGradient(0, 0, width, 140);
  grad.addColorStop(0, "#112240");
  grad.addColorStop(1, "#1a365d");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(16, 16, width - 32, 110, 20);
  ctx.fill();

  // Header Title
  ctx.fillStyle = "#F5C842";
  ctx.font = "bold 32px 'Plus Jakarta Sans', sans-serif, 'Noto Sans Thai'";
  ctx.textAlign = "center";
  ctx.fillText("PROMPTPAY", width / 2, 60);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "600 18px 'Plus Jakarta Sans', sans-serif, 'Noto Sans Thai'";
  ctx.fillText(title, width / 2, 95);

  // White QR Box Container
  const qrBoxSize = 380;
  const qrBoxX = (width - qrBoxSize) / 2;
  const qrBoxY = 145;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24);
  ctx.fill();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 20;

  // Draw QR in center of white box
  const qrInnerSize = 340;
  const qrInnerX = (width - qrInnerSize) / 2;
  const qrInnerY = qrBoxY + (qrBoxSize - qrInnerSize) / 2;
  ctx.drawImage(qrCanvas, qrInnerX, qrInnerY, qrInnerSize, qrInnerSize);
  ctx.shadowBlur = 0; // reset shadow

  // Amount Pill Box
  const pillY = 550;
  const pillHeight = 76;
  const pillWidth = 440;
  const pillX = (width - pillWidth) / 2;

  ctx.fillStyle = "rgba(245, 200, 66, 0.15)";
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 20);
  ctx.fill();
  ctx.strokeStyle = "#F5C842";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Amount Text
  ctx.fillStyle = "#F5C842";
  ctx.font = "bold 38px 'Plus Jakarta Sans', sans-serif, 'Noto Sans Thai'";
  ctx.textAlign = "center";
  const amountStr = amount > 0 ? `฿${Number(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Scan to Pay";
  ctx.fillText(amountStr, width / 2, pillY + 52);

  // PromptPay Account Info
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "600 20px 'Plus Jakarta Sans', sans-serif, 'Noto Sans Thai'";
  ctx.fillText(`PromptPay: ${maskedId}`, width / 2, 665);

  // Subtitle / instructions
  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 16px 'Plus Jakarta Sans', sans-serif, 'Noto Sans Thai'";
  ctx.fillText(subtitle, width / 2, 705);

  // Branding footer
  ctx.fillStyle = "#64748b";
  ctx.font = "700 14px 'Plus Jakarta Sans', sans-serif";
  ctx.fillText("FinTrack • Instant Slip Verification", width / 2, 770);

  ctx.restore();

  // 3. Trigger Download or Native Share
  return new Promise((resolve) => {
    cardCanvas.toBlob(async (blob) => {
      if (!blob) {
        // Fallback: direct data URL download
        const dataUrl = cardCanvas.toDataURL("image/png");
        triggerDirectDownload(dataUrl, amount);
        resolve(true);
        return;
      }

      const fileName = `PromptPay_QR_${amount ? Math.round(amount) : 'pay'}THB.png`;

      // Try Mobile Native Share if supported (iOS Safari / Android Chrome)
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `PromptPay QR ฿${amount || 0}`,
            text: `PromptPay QR Code for ฿${amount || 0} transfer`
          });
          resolve(true);
          return;
        } catch (shareErr) {
          // If user cancelled share dialog or error, fallback to direct download
          if (shareErr.name === "AbortError") {
            resolve(true);
            return;
          }
        }
      }

      // Standard browser download via Blob URL
      const blobUrl = URL.createObjectURL(blob);
      triggerDirectDownload(blobUrl, amount);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      resolve(true);
    }, "image/png", 1.0);
  });
}

function triggerDirectDownload(url, amount) {
  const fileName = `PromptPay_QR_${amount ? Math.round(amount) : 'pay'}THB.png`;
  const link = document.createElement("a");
  link.download = fileName;
  link.href = url;
  link.target = "_self";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
