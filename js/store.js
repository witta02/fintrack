import { convert, convertToTHB, getSymbol, getCurrencyInfo } from './currency.js';

// Simple pub/sub system for store updates
const listeners = new Set();

export const store = {
  transactions: [],
  recurringRules: [],
  settings: {
    selectedCurrency: 'THB',
    isDarkMode: true,
    isPremium: true,
    language: 'th',
    hasCompletedOnboarding: false,
    taxDeduction: 60000,
    dataVersion: 2
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  notify() {
    for (const listener of listeners) {
      try {
        listener();
      } catch (e) {
        console.error('Error in store listener:', e);
      }
    }
  },

  init() {
    // Load from LocalStorage
    const savedTransactions = localStorage.getItem('fintrack_transactions');
    const savedRules = localStorage.getItem('fintrack_recurring_rules');
    const savedSettings = localStorage.getItem('fintrack_settings');

    if (savedSettings) {
      this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
    }

    if (savedTransactions) {
      this.transactions = JSON.parse(savedTransactions).map(t => ({
        ...t,
        date: new Date(t.date),
        amount: parseFloat(t.amount)
      }));
    } else {
      this.transactions = [];
    }

    if (savedRules) {
      this.recurringRules = JSON.parse(savedRules).map(r => ({
        ...r,
        amount: parseFloat(r.amount),
        nextDueDate: new Date(r.nextDueDate),
        createdAt: new Date(r.createdAt)
      }));
    } else {
      this.recurringRules = [];
    }

    this.removeLegacyDemoData();

    // Process recurring rules immediately
    this.processRecurringPayments();

    // Set initial theme
    document.documentElement.setAttribute('data-theme', this.settings.isDarkMode ? 'dark' : 'light');
    document.documentElement.lang = this.settings.language === 'en' ? 'en' : 'th';
  },

  removeLegacyDemoData() {
    if (this.settings.dataVersion >= 3) return;

    const demoTransactionIds = new Set([
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13',
      '101', '102', '103', '104'
    ]);
    const demoRuleIds = new Set(['r1', 'r2']);

    const beforeTransactions = this.transactions.length;
    const beforeRules = this.recurringRules.length;

    this.transactions = this.transactions.filter(t => !demoTransactionIds.has(String(t.id)));
    this.recurringRules = this.recurringRules.filter(r => !demoRuleIds.has(String(r.id)));
    this.settings.dataVersion = 3;

    if (beforeTransactions !== this.transactions.length || beforeRules !== this.recurringRules.length) {
      this.save();
    } else {
      localStorage.setItem('fintrack_settings', JSON.stringify(this.settings));
    }
  },

  save() {
    localStorage.setItem('fintrack_transactions', JSON.stringify(this.transactions));
    localStorage.setItem('fintrack_recurring_rules', JSON.stringify(this.recurringRules));
    localStorage.setItem('fintrack_settings', JSON.stringify(this.settings));
    this.notify();
  },

  // Seed standard Thai/Eng descriptions & categories
  seedMockData() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const mock = [
      { id: '1', title: 'เงินเดือน / Salary', amount: 45000, isIncome: true, category: 'Salary', date: new Date(currentYear, currentMonth, 1) },
      { id: '2', title: 'อาหารกลางวันออฟฟิศ', amount: 150, isIncome: false, category: 'Food', date: new Date(currentYear, currentMonth, 2) },
      { id: '3', title: 'ค่ารถไฟฟ้า BTS', amount: 84, isIncome: false, category: 'Transport', date: new Date(currentYear, currentMonth, 2) },
      { id: '4', title: 'ช้อปปิ้งเสื้อผ้าแบรนด์ดัง', amount: 1200, isIncome: false, category: 'Shopping', date: new Date(currentYear, currentMonth, 4) },
      { id: '5', title: 'สตรีมมิ่ง Netflix / Spotify', amount: 419, isIncome: false, category: 'Bills', date: new Date(currentYear, currentMonth, 5) },
      { id: '6', title: 'ปันผลหุ้นกู้ / Dividends', amount: 3500, isIncome: true, category: 'Investment', date: new Date(currentYear, currentMonth, 7) },
      { id: '7', title: 'ดินเนอร์หรูวันศุกร์', amount: 2400, isIncome: false, category: 'Entertainment', date: new Date(currentYear, currentMonth, 8) },
      { id: '8', title: 'ค่ายาและโรงพยาบาล', amount: 950, isIncome: false, category: 'Health', date: new Date(currentYear, currentMonth, 10) },
      { id: '9', title: 'ค่าไฟเดือนนี้', amount: 1850, isIncome: false, category: 'Bills', date: new Date(currentYear, currentMonth, 12) },
      { id: '10', title: 'ซื้อของขวัญวันเกิดเพื่อน', amount: 800, isIncome: false, category: 'Gift', date: new Date(currentYear, currentMonth, 14) },
      { id: '11', title: 'ทริปพัทยาสุดสัปดาห์', amount: 4500, isIncome: false, category: 'Travel', date: new Date(currentYear, currentMonth, 15) },
      { id: '12', title: 'หนังสือพัฒนาตนเอง', amount: 350, isIncome: false, category: 'Education', date: new Date(currentYear, currentMonth, 18) },
      { id: '13', title: 'ค่าน้ำประปา', amount: 150, isIncome: false, category: 'Bills', date: new Date(currentYear, currentMonth, 20) }
    ];

    // Add some random historical records for previous month
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    mock.push(
      { id: '101', title: 'เงินเดือนเดือนที่แล้ว', amount: 45000, isIncome: true, category: 'Salary', date: new Date(prevYear, prevMonth, 1) },
      { id: '102', title: 'ค่าเช่าอพาร์ทเมนท์', amount: 6500, isIncome: false, category: 'Bills', date: new Date(prevYear, prevMonth, 1) },
      { id: '103', title: 'ซื้อรองเท้าวิ่ง', amount: 3200, isIncome: false, category: 'Shopping', date: new Date(prevYear, prevMonth, 5) },
      { id: '104', title: 'ค่าเติมน้ำมันรถยนต์', amount: 1200, isIncome: false, category: 'Transport', date: new Date(prevYear, prevMonth, 10) }
    );

    // Filter to only include transactions up to current date
    this.transactions = mock.filter(t => t.date <= now).sort((a, b) => b.date - a.date);
    this.save();
  },

  seedMockRules() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    this.recurringRules = [
      {
        id: 'r1',
        title: 'ค่าสมาชิก Premium App',
        amount: 149,
        isIncome: false,
        category: 'Bills',
        type: 'monthly',
        customDays: 30,
        nextDueDate: new Date(currentYear, currentMonth + 1, 1),
        createdAt: new Date(),
        isActive: true
      },
      {
        id: 'r2',
        title: 'เงินสมทบกองทุนเลี้ยงชีพ',
        amount: 2500,
        isIncome: true,
        category: 'Investment',
        type: 'monthly',
        customDays: 30,
        nextDueDate: new Date(currentYear, currentMonth + 1, 28),
        createdAt: new Date(),
        isActive: true
      }
    ];
    this.save();
  },

  // --- Transactions API ---
  getAllTransactions() {
    return [...this.transactions].sort((a, b) => b.date - a.date);
  },

  addTransaction(t) {
    const transaction = {
      id: t.id || Math.random().toString(36).substring(2, 11),
      title: t.title || 'ไม่มีชื่อรายการ',
      amount: parseFloat(t.amount) || 0,
      isIncome: !!t.isIncome,
      category: t.category || 'Other',
      date: t.date ? new Date(t.date) : new Date(),
      recurringId: t.recurringId || null
    };
    this.transactions.push(transaction);
    this.save();

    // Trigger browser notifications if enabled/allowed
    this.triggerNotification(
      transaction.isIncome ? 'บันทึกรายรับแล้ว' : 'บันทึกรายจ่ายแล้ว',
      `${transaction.title}: ${this.getCurrencySymbol()}${this.toDisplay(transaction.amount).toFixed(2)}`
    );
  },

  updateTransaction(updated) {
    const idx = this.transactions.findIndex(t => t.id === updated.id);
    if (idx !== -1) {
      this.transactions[idx] = {
        ...updated,
        amount: parseFloat(updated.amount),
        date: new Date(updated.date)
      };
      this.save();
    }
  },

  deleteTransaction(id) {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.save();
  },

  // --- Recurring Rules API ---
  getAllRecurringRules() {
    return [...this.recurringRules].sort((a, b) => a.nextDueDate - b.nextDueDate);
  },

  addRecurringRule(rule) {
    const newRule = {
      id: Math.random().toString(36).substring(2, 11),
      title: rule.title || 'ไม่มีชื่อรายการประจำ',
      amount: parseFloat(rule.amount) || 0,
      isIncome: !!rule.isIncome,
      category: rule.category || 'Other',
      type: rule.type || 'monthly', // 'monthly', 'yearly', 'custom'
      customDays: parseInt(rule.customDays) || 30,
      nextDueDate: rule.nextDueDate ? new Date(rule.nextDueDate) : new Date(),
      createdAt: new Date(),
      isActive: true
    };
    this.recurringRules.push(newRule);
    this.save();
    this.triggerNotification('ตั้งค่ารายการประจำแล้ว', `เราจะช่วยบันทึกเมื่อถึงกำหนด: ${newRule.title}`);
  },

  updateRecurringRule(rule) {
    const idx = this.recurringRules.findIndex(r => r.id === rule.id);
    if (idx !== -1) {
      this.recurringRules[idx] = {
        ...rule,
        amount: parseFloat(rule.amount),
        nextDueDate: new Date(rule.nextDueDate),
        createdAt: new Date(rule.createdAt)
      };
      this.save();
    }
  },

  deleteRecurringRule(id) {
    this.recurringRules = this.recurringRules.filter(r => r.id !== id);
    this.save();
  },

  toggleRecurringRule(id) {
    const idx = this.recurringRules.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.recurringRules[idx].isActive = !this.recurringRules[idx].isActive;
      this.save();
    }
  },

  // Process recurring rules to generate auto transactions when due
  processRecurringPayments() {
    const now = new Date();
    // Zero out hours/minutes/seconds of 'now' for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let addedCount = 0;

    this.recurringRules.forEach(rule => {
      if (!rule.isActive) return;

      let nextDue = new Date(rule.nextDueDate);
      nextDue = new Date(nextDue.getFullYear(), nextDue.getMonth(), nextDue.getDate());

      while (nextDue <= today) {
        // Create transaction
        const transaction = {
          id: Math.random().toString(36).substring(2, 11),
          title: rule.title,
          amount: rule.amount,
          isIncome: rule.isIncome,
          category: rule.category,
          date: new Date(nextDue),
          recurringId: rule.id
        };
        this.transactions.push(transaction);
        addedCount++;

        // Advance next due date
        if (rule.type === 'monthly') {
          nextDue.setMonth(nextDue.getMonth() + 1);
        } else if (rule.type === 'yearly') {
          nextDue.setFullYear(nextDue.getFullYear() + 1);
        } else if (rule.type === 'custom') {
          nextDue.setDate(nextDue.getDate() + (rule.customDays || 30));
        }
      }

      rule.nextDueDate = nextDue;
    });

    if (addedCount > 0) {
      this.save();
      this.triggerNotification(
        'มีการชำระเงินอัตโนมัติ',
        `บันทึกรายการประจำเสร็จสิ้นจำนวน ${addedCount} รายการ`
      );
    }
  },

  // --- Setting Getters / Setters ---
  getSelectedCurrency() {
    return this.settings.selectedCurrency;
  },

  getCurrencySymbol() {
    return getSymbol(this.settings.selectedCurrency);
  },

  async setCurrency(code) {
    this.settings.selectedCurrency = code;
    this.save();
  },

  toggleTheme() {
    this.settings.isDarkMode = !this.settings.isDarkMode;
    document.documentElement.setAttribute('data-theme', this.settings.isDarkMode ? 'dark' : 'light');
    this.save();
  },

  setPremium(val) {
    this.settings.isPremium = !!val;
    this.save();
  },

  completeOnboarding() {
    this.settings.hasCompletedOnboarding = true;
    this.save();
  },

  setLanguage(language) {
    this.settings.language = language === 'en' ? 'en' : 'th';
    document.documentElement.lang = this.settings.language === 'en' ? 'en' : 'th';
    this.save();
  },

  // --- Currency Display Convert helpers ---
  toDisplay(amountInTHB) {
    return convert(amountInTHB, this.settings.selectedCurrency);
  },

  // --- Computed Finance metrics ---
  getFinanceMetrics() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    let totalBalance = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    let monthlyIncome = 0;
    let monthlyExpense = 0;
    let monthlyBalance = 0;

    let dailyIncome = 0;
    let dailyExpense = 0;
    let dailyBalance = 0;

    let yearlyIncome = 0;
    let yearlyExpense = 0;
    let yearlyBalance = 0;

    this.transactions.forEach(t => {
      const amt = t.amount; // amount is stored in base currency (THB)
      const tDate = t.date;
      const isInc = t.isIncome;

      // All-Time
      if (isInc) {
        totalIncome += amt;
        totalBalance += amt;
      } else {
        totalExpense += amt;
        totalBalance -= amt;
      }

      // Year-to-date
      if (tDate.getFullYear() === currentYear) {
        if (isInc) {
          yearlyIncome += amt;
          yearlyBalance += amt;
        } else {
          yearlyExpense += amt;
          yearlyBalance -= amt;
        }

        // Monthly
        if (tDate.getMonth() === currentMonth) {
          if (isInc) {
            monthlyIncome += amt;
            monthlyBalance += amt;
          } else {
            monthlyExpense += amt;
            monthlyBalance -= amt;
          }

          // Daily
          if (tDate.getDate() === currentDate) {
            if (isInc) {
              dailyIncome += amt;
              dailyBalance += amt;
            } else {
              dailyExpense += amt;
              dailyBalance -= amt;
            }
          }
        }
      }
    });

    return {
      totalBalance: this.toDisplay(totalBalance),
      totalIncome: this.toDisplay(totalIncome),
      totalExpense: this.toDisplay(totalExpense),
      monthlyIncome: this.toDisplay(monthlyIncome),
      monthlyExpense: this.toDisplay(monthlyExpense),
      monthlyBalance: this.toDisplay(monthlyBalance),
      dailyIncome: this.toDisplay(dailyIncome),
      dailyExpense: this.toDisplay(dailyExpense),
      dailyBalance: this.toDisplay(dailyBalance),
      yearlyIncome: this.toDisplay(yearlyIncome),
      yearlyExpense: this.toDisplay(yearlyExpense),
      yearlyBalance: this.toDisplay(yearlyBalance)
    };
  },

  // Daily totals for current month, keyed by day of month
  getDailyExpensesForMonth() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daily = {};

    this.transactions.forEach(t => {
      if (!t.isIncome && t.date.getFullYear() === currentYear && t.date.getMonth() === currentMonth) {
        const day = t.date.getDate();
        daily[day] = (daily[day] || 0) + this.toDisplay(t.amount);
      }
    });

    return daily;
  },

  getDailyIncomeForMonth() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daily = {};

    this.transactions.forEach(t => {
      if (t.isIncome && t.date.getFullYear() === currentYear && t.date.getMonth() === currentMonth) {
        const day = t.date.getDate();
        daily[day] = (daily[day] || 0) + this.toDisplay(t.amount);
      }
    });

    return daily;
  },

  getCategorySpending(period = 'monthly', month = null, year = null) {
    const now = new Date();
    const currentYear = year || now.getFullYear();
    const currentMonth = month !== null ? month : now.getMonth();
    const categories = {};

    this.transactions.forEach(t => {
      if (t.isIncome) return;

      const tDate = t.date;
      let match = false;

      if (period === 'monthly') {
        match = tDate.getFullYear() === currentYear && tDate.getMonth() === currentMonth;
      } else if (period === 'yearly') {
        match = tDate.getFullYear() === currentYear;
      } else if (period === 'all') {
        match = true;
      }

      if (match) {
        const cat = t.category || 'Other';
        categories[cat] = (categories[cat] || 0) + this.toDisplay(t.amount);
      }
    });

    return categories;
  },

  // Thai tax calculation based on 2026 personal income tax rates
  calculateThaiTax(annualIncome) {
    const netIncome = Math.max(0, annualIncome - (this.settings.taxDeduction || 60000));
    const taxBrackets = [
      { min: 0, max: 150000, rate: 0 },
      { min: 150001, max: 300000, rate: 0.05 },
      { min: 300001, max: 500000, rate: 0.1 },
      { min: 500001, max: 750000, rate: 0.15 },
      { min: 750001, max: 1000000, rate: 0.2 },
      { min: 1000001, max: 2000000, rate: 0.25 },
      { min: 2000001, max: 5000000, rate: 0.3 },
      { min: 5000001, max: Infinity, rate: 0.35 }
    ];

    let calculatedTax = 0;
    taxBrackets.forEach(bracket => {
      if (netIncome > bracket.min) {
        const taxableInBracket = Math.min(netIncome, bracket.max) - (bracket.min === 0 ? 0 : bracket.min - 1);
        if (taxableInBracket > 0) {
          calculatedTax += taxableInBracket * bracket.rate;
        }
      }
    });
    return calculatedTax;
  },

  updateTaxDeduction(amount) {
    this.settings.taxDeduction = parseFloat(amount) || 0;
    this.save();
  },

  // --- Browser Notification wrapper ---
  triggerNotification(title, body) {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, { body, icon: '/favicon.ico' });
          }
        });
      }
    }
  }
};
