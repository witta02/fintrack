import {
  convert,
  convertToTHB,
  getSymbol,
  getCurrencyInfo,
} from "./currency.js";
import { supabase } from "./supabase.js";

// Simple pub/sub system for store updates
const listeners = new Set();

export const store = {
  user: null,
  transactions: [],
  recurringRules: [],
  settings: {
    selectedCurrency: "THB",
    isDarkMode: true,
    isPremium: true,
    language: "th",
    hasCompletedOnboarding: false,
    taxDeduction: 60000,
    taxPersonalDeduction: 60000,
    taxSocialSecurity: 9000,
    taxProvidentFund: 0,
    taxMutualFunds: 0,
    taxOtherDeductions: 0,
    dataVersion: 4,
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
        console.error("Error in store listener:", e);
      }
    }
  },

  async init() {
    // Load from LocalStorage
    const savedTransactions = localStorage.getItem("fintrack_transactions");
    const savedRules = localStorage.getItem("fintrack_recurring_rules");
    const savedSettings = localStorage.getItem("fintrack_settings");
    const savedNetWorth = localStorage.getItem("fintrack_net_worth");

    if (savedSettings) {
      this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
    }

    if (savedNetWorth) {
      this.netWorth = JSON.parse(savedNetWorth);
    } else {
      this.netWorth = {
        assets: { cash: 0, investments: 0, property: 0, other: 0 },
        liabilities: { creditCard: 0, loans: 0, other: 0 },
      };
    }

    if (savedTransactions) {
      this.transactions = JSON.parse(savedTransactions).map((t) => ({
        ...t,
        date: new Date(t.date),
        amount: parseFloat(t.amount),
      }));
    } else {
      this.transactions = [];
    }

    if (savedRules) {
      this.recurringRules = JSON.parse(savedRules).map((r) => ({
        ...r,
        amount: parseFloat(r.amount),
        nextDueDate: new Date(r.nextDueDate),
        createdAt: new Date(r.createdAt),
      }));
    } else {
      this.recurringRules = [];
    }

    this.removeLegacyDemoData();

    // Check active session
    const { data: { session } } = await supabase.auth.getSession();
    this.user = session ? session.user : null;

    if (this.user) {
      // Sync cloud data
      await this.handleLoginSync(this.user);
    }

    // Process recurring rules immediately
    this.processRecurringPayments();

    // Set initial theme
    document.documentElement.setAttribute(
      "data-theme",
      this.settings.isDarkMode ? "dark" : "light",
    );
    document.documentElement.lang =
      this.settings.language === "en" ? "en" : "th";
  },

  removeLegacyDemoData() {
    if (this.settings.dataVersion >= 4) return;

    const demoTransactionIds = new Set([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "101",
      "102",
      "103",
      "104",
    ]);
    const demoRuleIds = new Set(["r1", "r2"]);

    const beforeTransactions = this.transactions.length;
    const beforeRules = this.recurringRules.length;

    this.transactions = this.transactions.filter(
      (t) => !demoTransactionIds.has(String(t.id)),
    );
    this.recurringRules = this.recurringRules.filter(
      (r) => !demoRuleIds.has(String(r.id)),
    );

    if (this.settings.taxPersonalDeduction === undefined) {
      this.settings.taxPersonalDeduction = this.settings.taxDeduction || 60000;
      this.settings.taxSocialSecurity = 9000;
      this.settings.taxProvidentFund = 0;
      this.settings.taxMutualFunds = 0;
      this.settings.taxOtherDeductions = 0;
    }

    this.settings.dataVersion = 4;

    if (
      beforeTransactions !== this.transactions.length ||
      beforeRules !== this.recurringRules.length
    ) {
      this.save();
    } else {
      localStorage.setItem("fintrack_settings", JSON.stringify(this.settings));
    }
  },

  save() {
    localStorage.setItem(
      "fintrack_transactions",
      JSON.stringify(this.transactions),
    );
    localStorage.setItem(
      "fintrack_recurring_rules",
      JSON.stringify(this.recurringRules),
    );
    localStorage.setItem("fintrack_settings", JSON.stringify(this.settings));
    this.notify();
  },

  async handleLoginSync(user) {
    if (!user) return;
    this.user = user;

    try {
      // Fetch settings from Supabase
      const { data: dbSettings, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsError) throw settingsError;

      // Fetch transactions
      const { data: dbTransactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id);

      if (txError) throw txError;

      // Fetch recurring rules
      const { data: dbRules, error: rulesError } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('user_id', user.id);

      if (rulesError) throw rulesError;

      const hasCloudData = (dbTransactions && dbTransactions.length > 0) || dbSettings || (dbRules && dbRules.length > 0);

      if (!hasCloudData) {
        // LocalStorage -> Supabase Migration (First login sync)
        console.log('Migrating local storage data to Supabase cloud...');

        // Migrate Settings
        const settingsPayload = {
          user_id: user.id,
          selected_currency: this.settings.selectedCurrency || 'THB',
          is_dark_mode: this.settings.isDarkMode !== undefined ? this.settings.isDarkMode : true,
          language: this.settings.language || 'th',
          tax_personal_deduction: this.settings.taxPersonalDeduction !== undefined ? this.settings.taxPersonalDeduction : 60000,
          tax_social_security: this.settings.taxSocialSecurity !== undefined ? this.settings.taxSocialSecurity : 9000,
          tax_provident_fund: this.settings.taxProvidentFund || 0,
          tax_mutual_funds: this.settings.taxMutualFunds || 0,
          tax_other_deductions: this.settings.taxOtherDeductions || 0
        };
        await supabase.from('settings').upsert(settingsPayload);

        // Migrate Transactions
        if (this.transactions.length > 0) {
          const txsToInsert = this.transactions.map(t => ({
            id: t.id,
            user_id: user.id,
            title: t.title,
            amount: t.amount,
            is_income: t.isIncome,
            category: t.category,
            date: t.date instanceof Date ? t.date.toISOString() : new Date(t.date).toISOString(),
            recurring_id: t.recurringId || null
          }));
          await supabase.from('transactions').insert(txsToInsert);
        }

        // Migrate Recurring Rules
        if (this.recurringRules.length > 0) {
          const rulesToInsert = this.recurringRules.map(r => ({
            id: r.id,
            user_id: user.id,
            title: r.title,
            amount: r.amount,
            is_income: r.isIncome,
            category: r.category,
            type: r.type,
            custom_days: r.customDays,
            next_due_date: r.nextDueDate instanceof Date ? r.nextDueDate.toISOString() : new Date(r.nextDueDate).toISOString(),
            is_active: r.isActive,
            created_at: r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString()
          }));
          await supabase.from('recurring_rules').insert(rulesToInsert);
        }
      } else {
        // Supabase -> LocalStorage (Standard pull sync)
        if (dbSettings) {
          this.settings = {
            ...this.settings,
            selectedCurrency: dbSettings.selected_currency,
            isDarkMode: dbSettings.is_dark_mode,
            language: dbSettings.language,
            taxPersonalDeduction: parseFloat(dbSettings.tax_personal_deduction),
            taxSocialSecurity: parseFloat(dbSettings.tax_social_security),
            taxProvidentFund: parseFloat(dbSettings.tax_provident_fund),
            taxMutualFunds: parseFloat(dbSettings.tax_mutual_funds),
            taxOtherDeductions: parseFloat(dbSettings.tax_other_deductions)
          };
        }

        if (dbTransactions) {
          this.transactions = dbTransactions.map(t => ({
            id: t.id,
            title: t.title,
            amount: parseFloat(t.amount),
            isIncome: t.is_income,
            category: t.category,
            date: new Date(t.date),
            recurringId: t.recurring_id
          }));
        }

        if (dbRules) {
          this.recurringRules = dbRules.map(r => ({
            id: r.id,
            title: r.title,
            amount: parseFloat(r.amount),
            isIncome: r.is_income,
            category: r.category,
            type: r.type,
            customDays: r.custom_days,
            nextDueDate: new Date(r.next_due_date),
            isActive: r.is_active,
            createdAt: new Date(r.created_at)
          }));
        }
      }

      // Update LocalStorage cache
      localStorage.setItem("fintrack_transactions", JSON.stringify(this.transactions));
      localStorage.setItem("fintrack_recurring_rules", JSON.stringify(this.recurringRules));
      localStorage.setItem("fintrack_settings", JSON.stringify(this.settings));
    } catch (err) {
      console.warn("Supabase sync failed (tables might not exist yet), falling back to LocalStorage:", err);
    }
  },

  async saveSettingsToCloud() {
    if (this.user) {
      const payload = {
        user_id: this.user.id,
        selected_currency: this.settings.selectedCurrency,
        is_dark_mode: this.settings.isDarkMode,
        language: this.settings.language,
        tax_personal_deduction: this.settings.taxPersonalDeduction,
        tax_social_security: this.settings.taxSocialSecurity,
        tax_provident_fund: this.settings.taxProvidentFund,
        tax_mutual_funds: this.settings.taxMutualFunds,
        tax_other_deductions: this.settings.taxOtherDeductions
      };
      await supabase.from('settings').upsert(payload);
    }
  },

  clearUserData() {
    this.user = null;
    this.transactions = [];
    this.recurringRules = [];
    this.settings = {
      selectedCurrency: "THB",
      isDarkMode: true,
      isPremium: true,
      language: "th",
      hasCompletedOnboarding: false,
      taxDeduction: 60000,
      taxPersonalDeduction: 60000,
      taxSocialSecurity: 9000,
      taxProvidentFund: 0,
      taxMutualFunds: 0,
      taxOtherDeductions: 0,
      dataVersion: 4
    };
    localStorage.removeItem("fintrack_transactions");
    localStorage.removeItem("fintrack_recurring_rules");
    localStorage.removeItem("fintrack_settings");
    localStorage.removeItem("fintrack_net_worth");
  },

  saveNetWorth(assets, liabilities) {
    this.netWorth = { assets, liabilities };
    localStorage.setItem("fintrack_net_worth", JSON.stringify(this.netWorth));
    this.notify();
  },

  getTotalAssets() {
    if (!this.netWorth || !this.netWorth.assets) return 0;
    return Object.values(this.netWorth.assets).reduce(
      (a, b) => a + (parseFloat(b) || 0),
      0,
    );
  },

  getTotalLiabilities() {
    if (!this.netWorth || !this.netWorth.liabilities) return 0;
    return Object.values(this.netWorth.liabilities).reduce(
      (a, b) => a + (parseFloat(b) || 0),
      0,
    );
  },

  getNetWorth() {
    return this.getTotalAssets() - this.getTotalLiabilities();
  },

  // Seed standard Thai/Eng descriptions & categories
  seedMockData() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const mock = [
      {
        id: "1",
        title: "เงินเดือน / Salary",
        amount: 45000,
        isIncome: true,
        category: "Salary",
        date: new Date(currentYear, currentMonth, 1),
      },
      {
        id: "2",
        title: "อาหารกลางวันออฟฟิศ",
        amount: 150,
        isIncome: false,
        category: "Food",
        date: new Date(currentYear, currentMonth, 2),
      },
      {
        id: "3",
        title: "ค่ารถไฟฟ้า BTS",
        amount: 84,
        isIncome: false,
        category: "Transport",
        date: new Date(currentYear, currentMonth, 2),
      },
      {
        id: "4",
        title: "ช้อปปิ้งเสื้อผ้าแบรนด์ดัง",
        amount: 1200,
        isIncome: false,
        category: "Shopping",
        date: new Date(currentYear, currentMonth, 4),
      },
      {
        id: "5",
        title: "สตรีมมิ่ง Netflix / Spotify",
        amount: 419,
        isIncome: false,
        category: "Bills",
        date: new Date(currentYear, currentMonth, 5),
      },
      {
        id: "6",
        title: "ปันผลหุ้นกู้ / Dividends",
        amount: 3500,
        isIncome: true,
        category: "Investment",
        date: new Date(currentYear, currentMonth, 7),
      },
      {
        id: "7",
        title: "ดินเนอร์หรูวันศุกร์",
        amount: 2400,
        isIncome: false,
        category: "Entertainment",
        date: new Date(currentYear, currentMonth, 8),
      },
      {
        id: "8",
        title: "ค่ายาและโรงพยาบาล",
        amount: 950,
        isIncome: false,
        category: "Health",
        date: new Date(currentYear, currentMonth, 10),
      },
      {
        id: "9",
        title: "ค่าไฟเดือนนี้",
        amount: 1850,
        isIncome: false,
        category: "Bills",
        date: new Date(currentYear, currentMonth, 12),
      },
      {
        id: "10",
        title: "ซื้อของขวัญวันเกิดเพื่อน",
        amount: 800,
        isIncome: false,
        category: "Gift",
        date: new Date(currentYear, currentMonth, 14),
      },
      {
        id: "11",
        title: "ทริปพัทยาสุดสัปดาห์",
        amount: 4500,
        isIncome: false,
        category: "Travel",
        date: new Date(currentYear, currentMonth, 15),
      },
      {
        id: "12",
        title: "หนังสือพัฒนาตนเอง",
        amount: 350,
        isIncome: false,
        category: "Education",
        date: new Date(currentYear, currentMonth, 18),
      },
      {
        id: "13",
        title: "ค่าน้ำประปา",
        amount: 150,
        isIncome: false,
        category: "Bills",
        date: new Date(currentYear, currentMonth, 20),
      },
    ];

    // Add some random historical records for previous month
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    mock.push(
      {
        id: "101",
        title: "เงินเดือนเดือนที่แล้ว",
        amount: 45000,
        isIncome: true,
        category: "Salary",
        date: new Date(prevYear, prevMonth, 1),
      },
      {
        id: "102",
        title: "ค่าเช่าอพาร์ทเมนท์",
        amount: 6500,
        isIncome: false,
        category: "Bills",
        date: new Date(prevYear, prevMonth, 1),
      },
      {
        id: "103",
        title: "ซื้อรองเท้าวิ่ง",
        amount: 3200,
        isIncome: false,
        category: "Shopping",
        date: new Date(prevYear, prevMonth, 5),
      },
      {
        id: "104",
        title: "ค่าเติมน้ำมันรถยนต์",
        amount: 1200,
        isIncome: false,
        category: "Transport",
        date: new Date(prevYear, prevMonth, 10),
      },
    );

    // Filter to only include transactions up to current date
    this.transactions = mock
      .filter((t) => t.date <= now)
      .sort((a, b) => b.date - a.date);
    this.save();
  },

  seedMockRules() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    this.recurringRules = [
      {
        id: "r1",
        title: "ค่าสมาชิก Premium App",
        amount: 149,
        isIncome: false,
        category: "Bills",
        type: "monthly",
        customDays: 30,
        nextDueDate: new Date(currentYear, currentMonth + 1, 1),
        createdAt: new Date(),
        isActive: true,
      },
      {
        id: "r2",
        title: "เงินสมทบกองทุนเลี้ยงชีพ",
        amount: 2500,
        isIncome: true,
        category: "Investment",
        type: "monthly",
        customDays: 30,
        nextDueDate: new Date(currentYear, currentMonth + 1, 28),
        createdAt: new Date(),
        isActive: true,
      },
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
      title: t.title || "ไม่มีชื่อรายการ",
      amount: parseFloat(t.amount) || 0,
      isIncome: !!t.isIncome,
      category: t.category || "Other",
      date: t.date ? new Date(t.date) : new Date(),
      recurringId: t.recurringId || null,
    };
    this.transactions.push(transaction);
    this.save();

    if (this.user) {
      supabase.from('transactions').insert({
        id: transaction.id,
        user_id: this.user.id,
        title: transaction.title,
        amount: transaction.amount,
        is_income: transaction.isIncome,
        category: transaction.category,
        date: transaction.date.toISOString(),
        recurring_id: transaction.recurringId
      }).then(({ error }) => { if (error) console.error('Supabase addTransaction error:', error); });
    }

    // Trigger browser notifications if enabled/allowed
    this.triggerNotification(
      transaction.isIncome ? "บันทึกรายรับแล้ว" : "บันทึกรายจ่ายแล้ว",
      `${transaction.title}: ${this.getCurrencySymbol()}${this.toDisplay(transaction.amount).toFixed(2)}`,
    );
  },

  updateTransaction(updated) {
    const idx = this.transactions.findIndex((t) => t.id === updated.id);
    if (idx !== -1) {
      this.transactions[idx] = {
        ...updated,
        amount: parseFloat(updated.amount),
        date: new Date(updated.date),
      };
      this.save();

      if (this.user) {
        supabase.from('transactions').upsert({
          id: updated.id,
          user_id: this.user.id,
          title: updated.title,
          amount: parseFloat(updated.amount),
          is_income: !!updated.isIncome,
          category: updated.category,
          date: new Date(updated.date).toISOString(),
          recurring_id: updated.recurringId || null
        }).then(({ error }) => { if (error) console.error('Supabase updateTransaction error:', error); });
      }
    }
  },

  deleteTransaction(id) {
    this.transactions = this.transactions.filter((t) => t.id !== id);
    this.save();

    if (this.user) {
      supabase.from('transactions').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Supabase deleteTransaction error:', error);
      });
    }
  },

  // --- Recurring Rules API ---
  getAllRecurringRules() {
    return [...this.recurringRules].sort(
      (a, b) => a.nextDueDate - b.nextDueDate,
    );
  },

  addRecurringRule(rule) {
    const newRule = {
      id: Math.random().toString(36).substring(2, 11),
      title: rule.title || "ไม่มีชื่อรายการประจำ",
      amount: parseFloat(rule.amount) || 0,
      isIncome: !!rule.isIncome,
      category: rule.category || "Other",
      type: rule.type || "monthly", // 'monthly', 'yearly', 'custom'
      customDays: parseInt(rule.customDays) || 30,
      nextDueDate: rule.nextDueDate ? new Date(rule.nextDueDate) : new Date(),
      createdAt: new Date(),
      isActive: true,
    };
    this.recurringRules.push(newRule);
    this.save();

    if (this.user) {
      supabase.from('recurring_rules').insert({
        id: newRule.id,
        user_id: this.user.id,
        title: newRule.title,
        amount: newRule.amount,
        is_income: newRule.isIncome,
        category: newRule.category,
        type: newRule.type,
        custom_days: newRule.customDays,
        next_due_date: newRule.nextDueDate.toISOString(),
        is_active: newRule.isActive,
        created_at: newRule.createdAt.toISOString()
      }).then(({ error }) => { if (error) console.error('Supabase addRecurringRule error:', error); });
    }

    this.triggerNotification(
      "ตั้งค่ารายการประจำแล้ว",
      `เราจะช่วยบันทึกเมื่อถึงกำหนด: ${newRule.title}`,
    );
  },

  updateRecurringRule(rule) {
    const idx = this.recurringRules.findIndex((r) => r.id === rule.id);
    if (idx !== -1) {
      this.recurringRules[idx] = {
        ...rule,
        amount: parseFloat(rule.amount),
        nextDueDate: new Date(rule.nextDueDate),
        createdAt: new Date(rule.createdAt),
      };
      this.save();

      if (this.user) {
        supabase.from('recurring_rules').upsert({
          id: rule.id,
          user_id: this.user.id,
          title: rule.title,
          amount: parseFloat(rule.amount),
          is_income: !!rule.isIncome,
          category: rule.category,
          type: rule.type,
          custom_days: parseInt(rule.customDays) || 30,
          next_due_date: new Date(rule.nextDueDate).toISOString(),
          is_active: !!rule.isActive,
          created_at: new Date(rule.createdAt).toISOString()
        }).then(({ error }) => { if (error) console.error('Supabase updateRecurringRule error:', error); });
      }
    }
  },

  deleteRecurringRule(id) {
    this.recurringRules = this.recurringRules.filter((r) => r.id !== id);
    this.save();

    if (this.user) {
      supabase.from('recurring_rules').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('Supabase deleteRecurringRule error:', error);
      });
    }
  },

  toggleRecurringRule(id) {
    const idx = this.recurringRules.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.recurringRules[idx].isActive = !this.recurringRules[idx].isActive;
      this.save();

      if (this.user) {
        supabase.from('recurring_rules').update({
          is_active: this.recurringRules[idx].isActive
        }).eq('id', id).then(({ error }) => {
          if (error) console.error('Supabase toggleRecurringRule error:', error);
        });
      }
    }
  },

  // Process recurring rules to generate auto transactions when due
  processRecurringPayments() {
    const now = new Date();
    // Zero out hours/minutes/seconds of 'now' for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let addedCount = 0;

    this.recurringRules.forEach((rule) => {
      if (!rule.isActive) return;

      let nextDue = new Date(rule.nextDueDate);
      nextDue = new Date(
        nextDue.getFullYear(),
        nextDue.getMonth(),
        nextDue.getDate(),
      );

      while (nextDue <= today) {
        // Create transaction
        const transaction = {
          id: Math.random().toString(36).substring(2, 11),
          title: rule.title,
          amount: rule.amount,
          isIncome: rule.isIncome,
          category: rule.category,
          date: new Date(nextDue),
          recurringId: rule.id,
        };
        this.transactions.push(transaction);
        addedCount++;

        // Advance next due date
        if (rule.type === "monthly") {
          nextDue.setMonth(nextDue.getMonth() + 1);
        } else if (rule.type === "yearly") {
          nextDue.setFullYear(nextDue.getFullYear() + 1);
        } else if (rule.type === "custom") {
          nextDue.setDate(nextDue.getDate() + (rule.customDays || 30));
        }
      }

      rule.nextDueDate = nextDue;
    });

    if (addedCount > 0) {
      this.save();
      this.triggerNotification(
        "มีการชำระเงินอัตโนมัติ",
        `บันทึกรายการประจำเสร็จสิ้นจำนวน ${addedCount} รายการ`,
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
    await this.saveSettingsToCloud();
  },

  toggleTheme() {
    this.settings.isDarkMode = !this.settings.isDarkMode;
    document.documentElement.setAttribute(
      "data-theme",
      this.settings.isDarkMode ? "dark" : "light",
    );
    this.save();
    this.saveSettingsToCloud();
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
    this.settings.language = language === "en" ? "en" : "th";
    document.documentElement.lang =
      this.settings.language === "en" ? "en" : "th";
    this.save();
    this.saveSettingsToCloud();
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

    let weeklyIncome = 0;
    let weeklyExpense = 0;
    let weeklyBalance = 0;

    // Current Week (Monday to Sunday)
    const startOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    this.transactions.forEach((t) => {
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

      // Weekly
      if (tDate >= startOfWeek && tDate < endOfWeek) {
        if (isInc) {
          weeklyIncome += amt;
          weeklyBalance += amt;
        } else {
          weeklyExpense += amt;
          weeklyBalance -= amt;
        }
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
      yearlyBalance: this.toDisplay(yearlyBalance),
      weeklyIncome: this.toDisplay(weeklyIncome),
      weeklyExpense: this.toDisplay(weeklyExpense),
      weeklyBalance: this.toDisplay(weeklyBalance),
    };
  },

  // Daily totals for current month, keyed by day of month
  getDailyExpensesForMonth() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const daily = {};

    this.transactions.forEach((t) => {
      if (
        !t.isIncome &&
        t.date.getFullYear() === currentYear &&
        t.date.getMonth() === currentMonth
      ) {
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

    this.transactions.forEach((t) => {
      if (
        t.isIncome &&
        t.date.getFullYear() === currentYear &&
        t.date.getMonth() === currentMonth
      ) {
        const day = t.date.getDate();
        daily[day] = (daily[day] || 0) + this.toDisplay(t.amount);
      }
    });

    return daily;
  },

  getCategorySpending(period = "monthly", month = null, year = null) {
    const now = new Date();
    const currentYear = year || now.getFullYear();
    const currentMonth = month !== null ? month : now.getMonth();
    const categories = {};

    this.transactions.forEach((t) => {
      if (t.isIncome) return;

      const tDate = t.date;
      let match = false;

      if (period === "monthly") {
        match =
          tDate.getFullYear() === currentYear &&
          tDate.getMonth() === currentMonth;
      } else if (period === "yearly") {
        match = tDate.getFullYear() === currentYear;
      } else if (period === "all") {
        match = true;
      }

      if (match) {
        const cat = t.category || "Other";
        categories[cat] = (categories[cat] || 0) + this.toDisplay(t.amount);
      }
    });

    return categories;
  },

  // Thai tax calculation based on 2026 personal income tax rates
  calculateThaiTax(annualIncome) {
    const standardExpenseDeduction = Math.min(annualIncome * 0.5, 100000);
    const personal =
      this.settings.taxPersonalDeduction !== undefined
        ? this.settings.taxPersonalDeduction
        : this.settings.taxDeduction || 60000;
    const ssf = this.settings.taxSocialSecurity || 0;
    const pvd = this.settings.taxProvidentFund || 0;
    const mf = this.settings.taxMutualFunds || 0;
    const other = this.settings.taxOtherDeductions || 0;

    const totalDeductions =
      standardExpenseDeduction + personal + ssf + pvd + mf + other;
    const netIncome = Math.max(0, annualIncome - totalDeductions);

    const taxBrackets = [
      { min: 0, max: 150000, rate: 0 },
      { min: 150001, max: 300000, rate: 0.05 },
      { min: 300001, max: 500000, rate: 0.1 },
      { min: 500001, max: 750000, rate: 0.15 },
      { min: 750001, max: 1000000, rate: 0.2 },
      { min: 1000001, max: 2000000, rate: 0.25 },
      { min: 2000001, max: 5000000, rate: 0.3 },
      { min: 5000001, max: Infinity, rate: 0.35 },
    ];

    let calculatedTax = 0;
    taxBrackets.forEach((bracket) => {
      if (netIncome > bracket.min) {
        const taxableInBracket =
          Math.min(netIncome, bracket.max) -
          (bracket.min === 0 ? 0 : bracket.min - 1);
        if (taxableInBracket > 0) {
          calculatedTax += taxableInBracket * bracket.rate;
        }
      }
    });
    return calculatedTax;
  },

  updateTaxDeduction(personal, ssf, pvd, mf, other) {
    this.settings.taxPersonalDeduction = parseFloat(personal) || 0;
    this.settings.taxSocialSecurity = parseFloat(ssf) || 0;
    this.settings.taxProvidentFund = parseFloat(pvd) || 0;
    this.settings.taxMutualFunds = parseFloat(mf) || 0;
    this.settings.taxOtherDeductions = parseFloat(other) || 0;
    this.settings.taxDeduction = this.settings.taxPersonalDeduction;
    this.save();
    this.saveSettingsToCloud();
  },

  // --- Browser Notification wrapper ---
  triggerNotification(title, body) {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body, icon: "/favicon.ico" });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification(title, { body, icon: "/favicon.ico" });
          }
        });
      }
    }
  },
};
