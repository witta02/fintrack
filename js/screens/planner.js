import { store } from '../store.js';
import { getCategoryInfo } from '../categories.js';
import { t } from '../i18n.js';

let messages = [
  {
    isUser: false,
    text: `สวัสดีค่ะ! นี่คือตัววางแผนการเงินแบบออฟไลน์

ใช้งานได้โดยไม่ต้องเชื่อมต่อบริการภายนอก:
• บันทึกรายการ เช่น "กินข้าว 150 บาท"
• สรุปและวิเคราะห์เงินของคุณ
• วางแผนใช้เงิน เช่น "มี 5000 ใช้ 20 วัน"
• ช่วยแบ่งงบเพื่อเป้าหมาย เช่น "เก็บ 30000 ใน 6 เดือน"

ลองพิมพ์จำนวนเงิน เป้าหมาย หรือรายการที่ต้องการบันทึกได้เลยค่ะ`
  }
];

export function renderPlanner(container) {
  container.innerHTML = `
    <div class="chat-container">
      <!-- Header -->
      <div class="chat-header">
        <div class="chat-avatar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
        </div>
        <div style="flex: 1;">
          <h1 class="brand-title" style="font-size: 17px; margin: 0; font-weight: 800; letter-spacing: -0.3px;">Offline Planner</h1>
          <span id="planner-status" style="font-size: 11px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px;">
            <span style="width: 6px; height: 6px; background: #4ade80; border-radius: 50%;"></span>
            ${t('plannerReady')}
          </span>
        </div>
        <button id="quick-sum-btn" class="quick-action" title="${t('quickSummary')}" style="padding: 8px; border-radius: 10px; background: var(--card);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </button>
      </div>

      <!-- Messages Container -->
      <div id="chat-messages-container" class="chat-messages">
        <!-- Bubbles rendered here -->
      </div>

      <!-- Input area with suggestions inside -->
      <div class="chat-input-area">
        <div id="suggestion-chips-container" class="chat-suggestions">
          <button class="chat-suggestion" data-val="มีเงิน 5000 ใช้ 20 วัน">มีเงิน 5000 ใช้ 20 วัน</button>
          <button class="chat-suggestion" data-val="อยากเก็บ 30000 ใน 6 เดือน">เก็บ 30000 ใน 6 เดือน</button>
          <button class="chat-suggestion" data-val="วิเคราะห์การเงิน">วิเคราะห์การเงิน</button>
        </div>
        
        <form id="chat-form" class="chat-input-form">
          <input 
            type="text" 
            id="chat-input" 
            placeholder="${t('plannerPlaceholder')}" 
            autocomplete="off"
            required 
          />
          <button type="submit" id="chat-send-btn" class="chat-send-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>
    </div>
  `;

  // Bind Listeners
  setupEventListeners(container);

  // Render bubble messages
  renderMessages(container);
}

function setupEventListeners(container) {
  const form = container.querySelector('#chat-form');
  const input = container.querySelector('#chat-input');
  
  // Submit message handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = input.value.trim();
    if (val) {
      handleUserSendMessage(container, val);
      input.value = '';
    }
  });

  // Suggestion chip click
  container.querySelectorAll('.chat-suggestion').forEach(chip => {
    chip.addEventListener('click', () => {
      const val = chip.getAttribute('data-val');
      handleUserSendMessage(container, val);
    });
  });

  // Quick Action Buttons
  container.querySelector('#quick-sum-btn').addEventListener('click', () => {
    handleUserSendMessage(container, 'สรุป');
  });
}

function renderMessages(container) {
  const msgContainer = container.querySelector('#chat-messages-container');
  if (!msgContainer) return;

  msgContainer.innerHTML = '';

  messages.forEach(msg => {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${msg.isUser ? 'user' : 'planner'}`;
    
    bubble.innerHTML = `
      <div class="chat-bubble-text">${formatMessageText(msg.text)}</div>
      ${msg.transaction ? renderTransactionNotice(msg.transaction) : ''}
    `;

    msgContainer.appendChild(bubble);
  });

  // Scroll to bottom
  msgContainer.scrollTop = msgContainer.scrollHeight;

  // Toggle suggestion chips visibility (hide after the first real exchange)
  const sugContainer = container.querySelector('#suggestion-chips-container');
  if (sugContainer) {
    if (messages.length > 2) {
      sugContainer.style.display = 'none';
    } else {
      sugContainer.style.display = 'flex';
    }
  }
}

function renderTransactionNotice(t) {
  const cat = getCategoryInfo(t.category);
  const typeLabel = t.isIncome ? 'รายรับ' : 'รายจ่าย';
  const symbol = store.getCurrencySymbol();
  
  return `
    <div class="chat-transaction-notice" style="margin-top: 12px; padding: 12px; background: rgba(255, 255, 255, 0.05); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-size: 10px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">จดบันทึกสำเร็จ ✨</span>
        <span style="font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: ${t.isIncome ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'}; color: ${t.isIncome ? 'var(--income)' : 'var(--expense)'}">${typeLabel}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 32px; height: 32px; background: ${cat.color}20; color: ${cat.color}; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px;">
          ${cat.emoji}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 13px; font-weight: 700; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHTML(t.title)}</div>
          <div style="font-size: 11px; color: ${cat.color}; font-weight: 600;">${cat.label}</div>
        </div>
        <div style="font-size: 14px; font-weight: 800; color: var(--text-primary);">
          ${symbol}${t.amount.toFixed(2)}
        </div>
      </div>
    </div>
  `;
}

function formatMessageText(text) {
  // Convert newlines to breaks
  let html = escapeHTML(text);
  
  // Format bullet points
  html = html.replace(/^[•\-\*]\s*(.+)$/gm, '<div style="display: flex; gap: 8px; margin-bottom: 4px;"><span style="color: var(--gold);">•</span><span>$1</span></div>');

  // Convert bold formatting
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--gold);">$1</strong>');

  return html.replace(/\n/g, '<br/>');
}

async function handleUserSendMessage(container, text) {
  // Append User message
  messages.push({
    isUser: true,
    text: text,
    time: new Date()
  });

  renderMessages(container);

  // Set loading status
  const statusEl = container.querySelector('#planner-status');
  statusEl.innerHTML = `<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span> ${t('plannerTyping')}`;
  statusEl.style.color = 'var(--gold)';

  // Append temporary Typing indicator
  const msgContainer = container.querySelector('#chat-messages-container');
  const typingEl = document.createElement('div');
  typingEl.className = 'typing-indicator';
  typingEl.innerHTML = `
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
  `;
  msgContainer.appendChild(typingEl);
  msgContainer.scrollTop = msgContainer.scrollHeight;

  // Use offline mock response directly
  setTimeout(() => {
    const result = getOfflinePlannerResponse(text);

    // Remove typing bubble
    typingEl.remove();

    // Process Transaction auto-creation if supplied
    let newTransaction = null;
    if (result.transaction_to_add) {
      const tx = result.transaction_to_add;
      
      // Auto-insert transaction in base THB currency
      const thbAmount = store.settings.selectedCurrency === 'THB' 
        ? tx.amount 
        : tx.amount / store.toDisplay(1.0);

      newTransaction = {
        title: tx.title || 'รายการด่วนจาก Planner',
        amount: thbAmount,
        isIncome: !!tx.isIncome,
        category: tx.category || 'Other',
        date: new Date()
      };
      
      store.addTransaction(newTransaction);
    }

    // Append planner response
    messages.push({
      isUser: false,
      text: result.response || 'มีปัญหาระหว่างคำนวณผลลัพธ์ค่ะ',
      transaction: newTransaction,
      time: new Date()
    });

    // Restore status text
    statusEl.innerHTML = `<span style="width: 6px; height: 6px; background: #4ade80; border-radius: 50%;"></span> ${t('plannerReady')}`;
    statusEl.style.color = 'var(--text-secondary)';

    renderMessages(container);
  }, 600); // Small delay to feel natural
}

function getOfflinePlannerResponse(input) {
  const lowerText = input.toLowerCase();
  const metrics = store.getFinanceMetrics();
  const symbol = store.getCurrencySymbol();
  const isEnglish = store.settings.language === 'en';

  const plan = parseMoneyPlan(input);
  if (plan) {
    return {
      response: formatOfflinePlan(plan, symbol, isEnglish),
      transaction_to_add: null
    };
  }

  // Summary / Analysis Keywords
  if (lowerText.includes('สรุป') || lowerText.includes('วิเคราะห์') || lowerText.includes('แนะนำ')) {
    const rate = metrics.monthlyIncome > 0 
      ? ((metrics.monthlyIncome - metrics.monthlyExpense) / metrics.monthlyIncome * 100)
      : 0;

    let advice = '';
    if (rate >= 30) {
      advice = '🌟 คุณบริหารเงินได้ยอดเยี่ยมมากค่ะ มีเงินเหลือเก็บเกิน 30% รักษามาตรฐานนี้นะคะ!';
    } else if (rate >= 10) {
      advice = '👍 การเงินอยู่ในเกณฑ์ดีค่ะ แต่ถ้าลองลดรายจ่ายฟุ่มเฟือยลงอีกนิด จะมีเงินออมเพิ่มขึ้นนะคะ';
    } else if (rate > 0) {
      advice = '⚠️ เดือนนี้ใช้จ่ายค่อนข้างตึงตัวนะคะ แนะนำให้ลองตรวจสอบหมวดหมู่ที่จ่ายเยอะสุดดูค่ะ';
    } else {
      advice = '🚨 สัญญาณอันตราย! เดือนนี้ใช้จ่ายเกินรายรับแล้วค่ะ แนะนำให้งดการใช้จ่ายที่ไม่จำเป็นทันทีนะคะ';
    }

    return {
      response: isEnglish ? `Financial summary for this month

Income: ${symbol}${metrics.monthlyIncome.toFixed(2)}
Expense: ${symbol}${metrics.monthlyExpense.toFixed(2)}
Remaining: ${symbol}${metrics.monthlyBalance.toFixed(2)}

Planner note:
${advice}` : `สรุปและวิเคราะห์การเงินเดือนนี้ค่ะ

รายรับ: ${symbol}${metrics.monthlyIncome.toFixed(2)}
รายจ่าย: ${symbol}${metrics.monthlyExpense.toFixed(2)}
คงเหลือ: ${symbol}${metrics.monthlyBalance.toFixed(2)}

คำแนะนำจากตัววางแผน:
${advice}`,
      transaction_to_add: null
    };
  }

  // Balance keywords
  if (lowerText.includes('ยอด') || lowerText.includes('เงินเหลือ') || lowerText.includes('คงเหลือ')) {
    return {
      response: isEnglish
        ? `Your remaining balance this month is ${symbol}${metrics.monthlyBalance.toFixed(2)}. Type "analyze" if you want a deeper breakdown.`
        : `ยอดเงินคงเหลือของคุณตอนนี้คือ ${symbol}${metrics.monthlyBalance.toFixed(2)} สำหรับเดือนนี้ค่ะ \nหากต้องการดูภาพรวมเพิ่มเติมพิมพ์ 'วิเคราะห์' ได้เลยนะคะ`,
      transaction_to_add: null
    };
  }

  // Basic transaction pattern parsing: e.g. "กินข้าว 150 บาท", "เติมเงิน 200"
  const amountMatch = input.match(/(\d+(?:\.\d{1,2})?)/);
  if (amountMatch) {
    const amount = parseFloat(amountMatch[0]);
    if (!isNaN(amount) && amount > 0) {
      const isInc = lowerText.includes('เงินเดือน') || lowerText.includes('รายรับ') || lowerText.includes('ได้เงิน') || lowerText.includes('ขายของ');
      
      let category = isInc ? 'Salary' : 'Other';
      if (lowerText.includes('ข้าว') || lowerText.includes('อาหาร') || lowerText.includes('ชาบู')) {
        category = 'Food';
      } else if (lowerText.includes('รถ') || lowerText.includes('เดินทาง') || lowerText.includes('bts') || lowerText.includes('แท็กซี่')) {
        category = 'Transport';
      } else if (lowerText.includes('ซื้อ') || lowerText.includes('ช้อป') || lowerText.includes('เสื้อ')) {
        category = 'Shopping';
      } else if (lowerText.includes('ค่าไฟ') || lowerText.includes('ค่าน้ำ') || lowerText.includes('เน็ต') || lowerText.includes('บิล')) {
        category = 'Bills';
      }

      const cleanTitle = input
        .replace(amountMatch[0], '')
        .replace('บาท', '')
        .trim() || (isInc ? 'รายรับเพิ่มเติม' : 'รายจ่ายเพิ่มเติม');

      return {
        response: isEnglish
          ? `Saved "${cleanTitle}" for ${symbol}${amount.toFixed(2)} in ${category}.`
          : `รับทราบค่ะ! บันทึกรายการ "${cleanTitle}" จำนวน ${symbol}${amount.toFixed(2)} ในหมวดหมู่ ${category} เรียบร้อยแล้วนะคะ`,
      transaction_to_add: {
          title: cleanTitle,
          amount: amount,
          isIncome: isInc,
          category: category
      }
    };
    }
  }

  // Greeting
  if (lowerText.includes('สวัสดี') || lowerText.includes('หวัดดี') || lowerText.includes('hi') || lowerText.includes('hello')) {
    return {
      response: isEnglish
        ? `Hi! The offline planner is ready to help you track spending, analyze cash flow, and plan your money.`
        : `สวัสดีค่ะ! ตัววางแผนออฟไลน์พร้อมช่วยจัดการและวิเคราะห์การเงินให้คุณแล้ววันนี้\nอยากให้บันทึกรายจ่าย หรือวิเคราะห์ภาพรวมการเงิน บอกได้เลยค่ะ!`,
      transaction_to_add: null
    };
  }

  // Standard Fallback instructions
  return {
    response: isEnglish ? `The offline planner can help with examples like:
• "I have 5000 for 20 days"
• "Save 30000 in 6 months"
• "Lunch 150"
• "Analyze my spending"` : `ตัววางแผนยังไม่เข้าใจคำถามนี้ค่ะ ลองบอกรายละเอียดให้ชัดเจนขึ้นดูนะคะ เช่น:
• บันทึกรายรับ: "ได้ค่าของ 800 บาท"
• บันทึกรายจ่าย: "จ่ายค่าเดินทาง 60"
• วางแผนเงิน: "มีเงิน 5000 ใช้ 20 วัน"
• วิเคราะห์ภาพรวม: "วิเคราะห์" หรือ "สรุป"`,
    transaction_to_add: null
  };
}

function parseMoneyPlan(input) {
  const normalized = input.toLowerCase().replace(/,/g, '');
  const numbers = [...normalized.matchAll(/(\d+(?:\.\d+)?)/g)].map(match => parseFloat(match[1]));
  if (numbers.length < 2) return null;

  const hasTimeline = /(วัน|day|days|เดือน|month|months|ปี|year|years|week|weeks|สัปดาห์)/i.test(normalized);
  const hasPlanningIntent = /(ใช้|พอ|plan|budget|save|saving|เก็บ|เป้าหมาย|goal|need|ต้องการ|อยาก)/i.test(normalized);
  if (!hasTimeline && !hasPlanningIntent) return null;

  const amount = numbers[0];
  const duration = numbers[1];
  let days = duration;

  if (/(เดือน|month|months)/i.test(normalized)) days = duration * 30;
  if (/(ปี|year|years)/i.test(normalized)) days = duration * 365;
  if (/(week|weeks|สัปดาห์)/i.test(normalized)) days = duration * 7;

  const isSavingsGoal = /(save|saving|เก็บ|เป้าหมาย|goal)/i.test(normalized);

  return {
    amount,
    duration,
    days: Math.max(1, Math.round(days)),
    isSavingsGoal
  };
}

function formatOfflinePlan(plan, symbol, isEnglish) {
  const daily = plan.amount / plan.days;
  const weekly = daily * 7;
  const monthly = daily * 30;
  const needsTightBudget = daily < 200;

  if (isEnglish) {
    if (plan.isSavingsGoal) {
      return `Offline plan:
Goal: ${symbol}${plan.amount.toLocaleString()} in ${plan.days} days
Save per day: ${symbol}${daily.toFixed(2)}
Save per week: ${symbol}${weekly.toFixed(2)}
Save per month: ${symbol}${monthly.toFixed(2)}

Suggested plan:
• Move the daily amount out first when income arrives.
• Keep a small emergency buffer before flexible spending.
• Review progress every 7 days and adjust if you miss a day.`;
    }

    return `Offline budget plan:
Available money: ${symbol}${plan.amount.toLocaleString()}
Timeline: ${plan.days} days
Daily limit: ${symbol}${daily.toFixed(2)}
Weekly limit: ${symbol}${weekly.toFixed(2)}

Suggested split:
• Essentials: ${symbol}${(daily * 0.65).toFixed(2)} per day
• Food/transport: ${symbol}${(daily * 0.25).toFixed(2)} per day
• Buffer: ${symbol}${(daily * 0.10).toFixed(2)} per day
${needsTightBudget ? '\nThis is a tight budget, so avoid non-essential spending until the timeline ends.' : ''}`;
  }

  if (plan.isSavingsGoal) {
    return `แผนจัดการเงิน:
เป้าหมาย: ${symbol}${plan.amount.toLocaleString()} ภายใน ${plan.days} วัน
ต้องเก็บต่อวัน: ${symbol}${daily.toFixed(2)}
ต้องเก็บต่อสัปดาห์: ${symbol}${weekly.toFixed(2)}
ประมาณต่อเดือน: ${symbol}${monthly.toFixed(2)}

แนะนำ:
• แยกเงินเก็บทันทีเมื่อมีรายรับ
• กันเงินฉุกเฉินเล็กน้อยก่อนใช้จ่ายยืดหยุ่น
• ตรวจความคืบหน้าทุก 7 วันแล้วปรับแผนถ้าหลุด`;
  }

  return `แผนใช้งบ:
เงินที่มี: ${symbol}${plan.amount.toLocaleString()}
ระยะเวลา: ${plan.days} วัน
ใช้ได้ต่อวัน: ${symbol}${daily.toFixed(2)}
ใช้ได้ต่อสัปดาห์: ${symbol}${weekly.toFixed(2)}

แบ่งงบแนะนำ:
• จำเป็น: ${symbol}${(daily * 0.65).toFixed(2)} ต่อวัน
• อาหาร/เดินทาง: ${symbol}${(daily * 0.25).toFixed(2)} ต่อวัน
• กันพลาด: ${symbol}${(daily * 0.10).toFixed(2)} ต่อวัน
${needsTightBudget ? '\nงบนี้ค่อนข้างตึง ควรงดรายจ่ายที่ไม่จำเป็นจนกว่าจะครบระยะเวลานี้ค่ะ' : ''}`;
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
