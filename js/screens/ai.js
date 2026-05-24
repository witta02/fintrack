import { store } from '../store.js';
import { getCategoryInfo } from '../categories.js';

const API_KEY = 'AIzaSyD_HbW4n63iEyyESfw2Uux877SHmBCoP-g';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

let messages = [
  {
    isUser: false,
    text: `สวัสดีค่ะ! 👋 ฉันคือ Finny ของ FinTrack

ฉันช่วยคุณได้หลายเรื่อง:
• 📝 บันทึกรายการ — พิมพ์ เช่น "กินข้าว 150 บาท"
• 📊 วิเคราะห์การเงิน — พิมพ์ "วิเคราะห์"
• 💡 ขอคำแนะนำ — พิมพ์ "แนะนำ"
• 📋 ดูสรุป — พิมพ์ "สรุป"

ลองพิมพ์ข้อความคุยกับ Finny ได้เลยค่ะ!`
  }
];

export function renderAI(container) {
  container.innerHTML = `
    <div class="chat-container">
      <!-- Header -->
      <div class="chat-header">
        <div class="chat-avatar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
        </div>
        <div style="flex: 1;">
          <h1 class="brand-title" style="font-size: 17px; margin: 0; font-weight: 800; letter-spacing: -0.3px;">Finny Assistant</h1>
          <span id="ai-status" style="font-size: 11px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px;">
            <span style="width: 6px; height: 6px; background: #4ade80; border-radius: 50%;"></span>
            พร้อมช่วยเหลือ
          </span>
        </div>
        <button id="quick-sum-btn" class="quick-action" title="สรุปการเงิน" style="padding: 8px; border-radius: 10px; background: var(--card);">
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
          <button class="chat-suggestion" data-val="กินข้าว 150 บาท">กินข้าว 150 บาท</button>
          <button class="chat-suggestion" data-val="สรุปเดือนนี้">สรุปเดือนนี้</button>
          <button class="chat-suggestion" data-val="วิเคราะห์การเงิน">วิเคราะห์การเงิน</button>
        </div>
        
        <form id="chat-form" class="chat-input-form">
          <input 
            type="text" 
            id="chat-input" 
            placeholder="พิมพ์ข้อความคุยกับ Finny..." 
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
    bubble.className = `chat-bubble ${msg.isUser ? 'user' : 'ai'}`;
    
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
  const typeClass = t.isIncome ? 'income' : 'expense';
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
  const statusEl = container.querySelector('#ai-status');
  statusEl.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span> กำลังพิมพ์...';
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

  try {
    // Generate AI response (using real Gemini API or mock)
    const result = await getAIResponse(text);

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
        title: tx.title || 'รายการด่วนจาก AI',
        amount: thbAmount,
        isIncome: !!tx.isIncome,
        category: tx.category || 'Other',
        date: new Date()
      };
      
      store.addTransaction(newTransaction);
    }

    // Append AI Response
    messages.push({
      isUser: false,
      text: result.response || 'มีปัญหาระหว่างคำนวณผลลัพธ์ค่ะ',
      transaction: newTransaction,
      time: new Date()
    });

  } catch (error) {
    console.error('AI error:', error);
    typingEl.remove();
    messages.push({
      isUser: false,
      text: 'ขออภัยค่ะ Finny กำลังประสบปัญหาการเชื่อมต่อเพื่อคุยกับคุณในขณะนี้ ลองพิมพ์ข้อความแบบออฟไลน์ดูนะคะ 🙏',
      time: new Date()
    });
  }

  // Restore status text
  statusEl.innerHTML = '<span style="width: 6px; height: 6px; background: #4ade80; border-radius: 50%;"></span> พร้อมช่วยเหลือ';
  statusEl.style.color = 'var(--text-secondary)';

  renderMessages(container);
}


async function getAIResponse(userInput) {
  // Check if API Key is not set or mock fallback is forced
  if (API_KEY === 'YOUR_GEMINI_API_KEY' || !API_KEY) {
    return mockSmartResponse(userInput);
  }

  // Retrieve current financial context to pass to Gemini API
  const metrics = store.getFinanceMetrics();
  const symbol = store.getCurrencySymbol();
  const transactions = store.getAllTransactions();

  // Get Top 3 categories spending this month
  const categoryTotals = {};
  const now = new Date();
  transactions.forEach(t => {
    if (!t.isIncome && t.date.getFullYear() === now.getFullYear() && t.date.getMonth() === now.getMonth()) {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + store.toDisplay(t.amount);
    }
  });
  
  const sortedCats = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(e => `${e[0]}: ${symbol}${e[1].toFixed(2)}`)
    .join(', ');

  const prompt = `
  ข้อมูลการเงินปัจจุบันของผู้ใช้ (เดือนนี้):
  - รายรับ: ${symbol}${metrics.monthlyIncome.toFixed(2)}
  - รายจ่าย: ${symbol}${metrics.monthlyExpense.toFixed(2)}
  - คงเหลือ: ${symbol}${metrics.monthlyBalance.toFixed(2)}
  - รายจ่ายสูงสุด 3 อันดับ: ${sortedCats || 'ยังไม่มีข้อมูล'}

  คำพูดของผู้ใช้: "${userInput}"

  จงตอบกลับด้วย JSON FORMAT เท่านั้น! (ห้ามมี backticks (\`\`\`json หรือ \`\`\`) หรือคำอธิบายภายนอกตัววัตถุ) รูปแบบตามนี้:
  {
    "response": "คำตอบที่จะพูดกับผู้ใช้ (เป็นภาษาไทย แนะนำ อภิปราย วิเคราะห์ หรือกระตุ้นอย่างเป็นมิตร สุภาพ)",
    "transaction_to_add": null หรือ {
       "title": "ชื่อรายการสั้นๆ เช่น ข้าวผัดกะเพรา, ซื้อหูฟัง, เงินเดือนเข้า",
       "amount": ตัวเลขทศนิยมจำนวนเงิน (ในสกุลเงินหลักของผู้ใช้ที่กำลังแสดงผล ${store.settings.selectedCurrency}),
       "isIncome": boolean (true สำหรับรายรับ, false สำหรับรายจ่าย),
       "category": "หมวดหมู่ภาษาอังกฤษที่ถูกต้องตรงกับระบบ: Food, Transport, Shopping, Salary, Bills, Entertainment, Health, Investment, Gift, Travel, Education, Other"
    }
  }
  `;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        systemInstruction: {
          parts: [{
            text: `คุณคือ "Finny" (ฟินนี่) ผู้ช่วยอัจฉริยะด้านการเงินของแอป FinTrack
คุณมีความเชี่ยวชาญในการช่วยจัดการรายรับรายจ่าย วิเคราะห์และวางแผนการใช้เงิน
ตอบคำถามอย่างเป็นมิตร สุภาพ ให้กำลังใจ และใช้ภาษาไทยเป็นหลัก
หากผู้ใช้ต้องการบันทึกรายรับหรือรายจ่าย คุณต้องส่งข้อมูล JSON สำหรับบันทึกลงใน transaction_to_add ด้วย`
          }]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('Empty response from model');
    }

    // Clean JSON response block
    const cleanJson = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    return JSON.parse(cleanJson);

  } catch (error) {
    console.warn('API connection failed. Falling back to Mock parser:', error);
    return mockSmartResponse(userInput);
  }
}

// offline Mock / Rule-based Fallback Parser
function mockSmartResponse(input) {
  const lowerText = input.toLowerCase();
  const metrics = store.getFinanceMetrics();
  const symbol = store.getCurrencySymbol();

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
      advice = '⚠️ เดือนนี้ใช้จ่ายค่อนข้างตึงตัวนะคะ Finny แนะนำให้ลองตรวจสอบหมวดหมู่ที่จ่ายเยอะสุดดูค่ะ';
    } else {
      advice = '🚨 สัญญาณอันตราย! เดือนนี้ใช้จ่ายเกินรายรับแล้วค่ะ แนะนำให้งดการใช้จ่ายที่ไม่จำเป็นทันทีนะคะ';
    }

    return {
      response: `📊 สรุปและวิเคราะห์การเงินเดือนนี้ค่ะ

📥 รายรับ: ${symbol}${metrics.monthlyIncome.toFixed(2)}
📤 รายจ่าย: ${symbol}${metrics.monthlyExpense.toFixed(2)}
💰 คงเหลือ: ${symbol}${metrics.monthlyBalance.toFixed(2)}

💡 คำแนะนำจาก Finny:
${advice}`,
      transaction_to_add: null
    };
  }

  // Balance keywords
  if (lowerText.includes('ยอด') || lowerText.includes('เงินเหลือ') || lowerText.includes('คงเหลือ')) {
    return {
      response: `💰 ยอดเงินคงเหลือของคุณตอนนี้คือ ${symbol}${metrics.monthlyBalance.toFixed(2)} สำหรับเดือนนี้ค่ะ \nหากต้องการดูภาพรวมเพิ่มเติมพิมพ์ 'วิเคราะห์' ได้เลยนะคะ`,
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
        response: `รับทราบค่ะ! Finny ได้จดบันทึกประวัติรายการ "${cleanTitle}" จำนวน ${symbol}${amount.toFixed(2)} ในหมวดหมู่ ${category} เรียบร้อยแล้วนะคะ 📝 มีอะไรให้ช่วยเหลือเพิ่มบอกมาได้เลยค่ะ`,
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
      response: `สวัสดีค่ะ! 🎉 Finny พร้อมช่วยจัดการและวิเคราะห์การเงินให้คุณแล้ววันนี้\nอยากให้บันทึกรายจ่าย หรือวิเคราะห์ภาพรวมการเงิน บอกได้เลยค่ะ!`,
      transaction_to_add: null
    };
  }

  // Standard Fallback instructions
  return {
    response: `🤔 Finny ยังไม่เข้าใจคำถามนี้ค่ะ ลองบอกรายละเอียดให้ชัดเจนขึ้นดูนะคะ เช่น:
• 📥 บันทึกรายรับ: "ได้ค่าของ 800 บาท"
• 📤 บันทึกรายจ่าย: "จ่ายค่าเดินทาง 60"
• 📊 วิเคราะห์ภาพรวม: "วิเคราะห์" หรือ "สรุป"`,
    transaction_to_add: null
  };
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
