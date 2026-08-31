import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

const env = (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : (typeof process !== "undefined" ? process.env : {});
export const DEFAULT_PROMPTPAY_ID = env?.VITE_PROMPTPAY_ID || "";

/**
 * Formats PromptPay ID (Phone or Tax ID) for payload generator.
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
 * e.g. 13-digit Tax ID -> 1-80xx-xxxxx-56-6
 * e.g. 10-digit Phone -> 081-xxx-5678
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
  return generatePayload(formattedId, amount ? { amount: Number(amount) } : undefined);
}
