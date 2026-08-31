/**
 * FinTrack Mechanical Rolling Ticker Animation Utility
 * Smooth 60FPS RAF-based counter for balance and metric displays
 */

const activeAnimations = new Map();

/**
 * Animate a numeric element smoothly from its current value to a target value
 * @param {HTMLElement|string} targetElement - DOM element or selector
 * @param {number} targetValue - The target numeric value (in primary currency display units)
 * @param {Object} options - Animation options
 * @param {string} options.prefix - Currency prefix symbol (e.g. '฿' or '$')
 * @param {number} options.duration - Duration in milliseconds (default 500ms)
 * @param {number} options.decimals - Decimal places (default 2)
 */
export function animateRollingNumber(targetElement, targetValue, options = {}) {
  const el = typeof targetElement === 'string' ? document.querySelector(targetElement) : targetElement;
  if (!el) return;

  const prefix = options.prefix ?? '';
  const duration = options.duration ?? 450;
  const decimals = options.decimals ?? 2;

  // Cancel any existing animation on this element
  if (activeAnimations.has(el)) {
    cancelAnimationFrame(activeAnimations.get(el));
    activeAnimations.delete(el);
  }

  // Parse current numeric value from element text
  const currentText = el.innerText || '';
  const currentNumeric = parseFloat(currentText.replace(/[^0-9.-]/g, '')) || 0;
  
  const formattedPrefix = prefix ? (prefix.endsWith(' ') ? prefix : prefix + ' ') : '';

  if (Math.abs(currentNumeric - targetValue) < 0.01) {
    el.innerText = `${formattedPrefix}${targetValue.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    return;
  }

  const startTime = performance.now();
  const startValue = currentNumeric;
  const delta = targetValue - startValue;

  function updateTicker(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease-out cubic for smooth mechanical deceleration
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentValue = startValue + (delta * easeProgress);

    el.innerText = `${formattedPrefix}${currentValue.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })}`;

    if (progress < 1) {
      const rafId = requestAnimationFrame(updateTicker);
      activeAnimations.set(el, rafId);
    } else {
      activeAnimations.delete(el);
      el.innerText = `${formattedPrefix}${targetValue.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })}`;
    }
  }

  const rafId = requestAnimationFrame(updateTicker);
  activeAnimations.set(el, rafId);
}

/**
 * Safe Mathematical Expression Evaluator for In-Line Amount Calculations
 * Supports +, -, *, /, parenthesis, and decimals.
 * @param {string} expr - e.g. "120 + 45 + 30" or "500 * 2 - 50"
 * @returns {number|null} Evaluated number or null if invalid
 */
export function evaluateMathExpression(expr) {
  if (!expr || typeof expr !== 'string') return null;
  
  // Clean whitespace and sanitize allowed math characters only
  const sanitized = expr.replace(/\s+/g, '').replace(/,/g, '');
  if (!sanitized) return null;

  // Validate only digits and basic arithmetic operators
  if (!/^[0-9+\-*/.()]+$/.test(sanitized)) return null;

  try {
    // Use Function constructor with strict mode for safe evaluation of arithmetic
    const result = Function('"use strict";return (' + sanitized + ')')();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result) && result >= 0) {
      return result;
    }
    return null;
  } catch (e) {
    return null;
  }
}
