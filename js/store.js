import {
  convert,
  convertToTHB,
  getSymbol,
  getCurrencyInfo,
} from "./currency.js";
import { supabase } from "./supabase.js";
import { t as i18n } from "./i18n.js";

// Simple pub/sub system for store updates
const listeners = new Set();

export const store = {
  user: null,
  transactions: [],
  recurringRules: [],
  downPayments: [],
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
    xp: 0,
    level: 1,
    customCategories: [],
    coins: 0,
    claimedAchievements: [],
    unlockedThemes: ["light", "dark"],
    forgivenTransactions: [],
    collectibles: [],
    questsState: { date: null, firstIncome: false, stayClean: true, checkIn: false, claimed: [] },
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

  init() {
    // Load from LocalStorage (synchronous — no network calls here)
    const savedTransactions = localStorage.getItem("fintrack_transactions");
    const savedRules = localStorage.getItem("fintrack_recurring_rules");
    const savedDownPayments = localStorage.getItem("fintrack_down_payments");
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

    this.downPayments = savedDownPayments
      ? JSON.parse(savedDownPayments).map((plan) => ({
          ...plan,
          totalAmount: parseFloat(plan.totalAmount) || 0,
          paidAmount: parseFloat(plan.paidAmount) || 0,
          dueDate: plan.dueDate ? new Date(plan.dueDate) : null,
        }))
      : [];

    this.removeLegacyDemoData();

    // Process recurring rules immediately
    this.processRecurringPayments();

    if (!this.settings.theme) {
      this.settings.theme = this.settings.isDarkMode ? "dark" : "light";
    }

    // Set initial theme
    document.documentElement.setAttribute(
      "data-theme",
      this.settings.theme,
    );
    document.documentElement.lang =
      this.settings.language === "en" ? "en" : "th";
    
    this.checkQuests();
    this.isInitialized = true;
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
    this.recalculateXP();
    localStorage.setItem(
      "fintrack_transactions",
      JSON.stringify(this.transactions),
    );
    localStorage.setItem(
      "fintrack_recurring_rules",
      JSON.stringify(this.recurringRules),
    );
    localStorage.setItem("fintrack_down_payments", JSON.stringify(this.downPayments));
    localStorage.setItem("fintrack_settings", JSON.stringify(this.settings));
    this.notify();
  },

  getActiveBoosts() {
    let xpMulti = 1.0;
    let coinMulti = 1.0;
    const collectibles = this.settings.collectibles || [];
    
    collectibles.forEach(id => {
      if (id === 'skateboard' || id === 'cat' || id === 'dog') xpMulti += 0.02;
      if (id === 'watch') coinMulti += 0.05;
      if (id === 'car' || id === 'dragon') xpMulti += 0.05;
      if (id === 'rocket') xpMulti += 0.10;
      if (id === 'island') xpMulti += 0.15;
      if (id === 'crown') coinMulti += 0.50;
      if (id === 'diamond') xpMulti += 0.20;
    });

    return { xpMulti, coinMulti };
  },

  checkQuests() {
    const today = new Date().toISOString().split('T')[0];
    if (!this.settings.questsState || this.settings.questsState.date !== today) {
      // Reset daily quests
      this.settings.questsState = {
        date: today,
        checkIn: false,
        firstIncome: false,
        stayClean: true,
        claimed: []
      };
    }

    // 1. Daily Check-in
    this.settings.questsState.checkIn = true;

    // 2. First Income
    const todayTxs = this.transactions.filter(t => new Date(t.date).toISOString().split('T')[0] === today);
    if (todayTxs.some(t => t.isIncome)) {
      this.settings.questsState.firstIncome = true;
    }

    // 3. Stay Clean
    const badHabits = ["junk", "gambling", "alcohol", "อาหารขยะ", "พนัน", "แอลกอฮอล์", "หวย", "lottery", "เหล้า", "เบียร์", "beer", "liquor", "สลาก"];
    const hasBadHabit = todayTxs.some(t => {
      if (t.isIncome) return false;
      const isForgiven = (this.settings.forgivenTransactions || []).includes(t.id);
      if (isForgiven) return false;
      const cat = (t.category || "").toLowerCase();
      return badHabits.some(bad => cat.includes(bad));
    });
    this.settings.questsState.stayClean = !hasBadHabit;
  },

  recalculateXP() {
    const badHabits = ["junk", "gambling", "alcohol", "อาหารขยะ", "พนัน", "แอลกอฮอล์", "หวย", "lottery", "เหล้า", "เบียร์", "beer", "liquor", "สลาก"];
    const boosts = this.getActiveBoosts();
    
    let totalXpGained = 0;
    
    this.transactions.forEach(tx => {
      const amtXp = (tx.amount || 0) / 100;
      if (tx.isIncome) {
        totalXpGained += (amtXp * boosts.xpMulti);
      } else {
        const isForgiven = (this.settings.forgivenTransactions || []).includes(tx.id);
        const cat = (tx.category || "").toLowerCase();
        const isBad = badHabits.some(bad => cat.includes(bad));
        if (isBad && !isForgiven) {
          totalXpGained -= amtXp; // Penalty!
        } else {
          totalXpGained += amtXp; // Good habit to track normal expenses
        }
      }
    });

    let uniqueDays = new Set(this.transactions.map(t => new Date(t.date).toDateString())).size;
    let baseTotalXp = Math.floor((uniqueDays * 100) + totalXpGained);
    
    if (baseTotalXp < 0) baseTotalXp = 0; // Bankruptcy floor

    let oldLevel = this.settings.level || 1;
    let oldXp = this.settings.xp || 0;
    
    let calculatedLevel = 1;
    let requiredXp = 100;
    
    while (baseTotalXp >= requiredXp) {
      baseTotalXp -= requiredXp;
      calculatedLevel++;
      requiredXp = calculatedLevel * 100;
    }
    
    this.settings.xp = baseTotalXp;
    this.settings.level = calculatedLevel;

    if (calculatedLevel > oldLevel && this.isInitialized) {
      window.dispatchEvent(new CustomEvent('levelup', { 
        detail: { level: calculatedLevel } 
      }));
    }
    
    if (this.user && (oldXp !== this.settings.xp || oldLevel !== this.settings.level)) {
      this.saveSettingsToCloud();
    }
  },

  async handleLoginSync(user) {
    if (!user) return;
    this.user = user;

    try {
      // 1. Fetch settings from Supabase
      const { data: dbSettings, error: settingsError } = await supabase
        .from('user')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsError) throw settingsError;

      // 2. Fetch transactions
      const { data: dbTransactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id);

      if (txError) throw txError;

      // 3. Fetch recurring rules
      const { data: dbRules, error: rulesError } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('user_id', user.id);

      if (rulesError) throw rulesError;

      // --- SETTINGS SYNC ---
      if (dbSettings) {
        // Use cloud settings, merging into local
        this.settings = {
          ...this.settings,
          selectedCurrency: dbSettings.selected_currency,
          isDarkMode: dbSettings.is_dark_mode,
          language: dbSettings.language,
          taxPersonalDeduction: parseFloat(dbSettings.tax_personal_deduction),
          taxSocialSecurity: parseFloat(dbSettings.tax_social_security),
          taxProvidentFund: parseFloat(dbSettings.tax_provident_fund),
          taxMutualFunds: parseFloat(dbSettings.tax_mutual_funds),
          taxOtherDeductions: parseFloat(dbSettings.tax_other_deductions),
          xp: Math.max(dbSettings.xp || 0, this.settings.xp || 0),
          level: Math.max(dbSettings.level || 1, this.settings.level || 1),
          // Merge custom categories from both cloud and local (no duplicates)
          customCategories: (() => {
            const cloud = dbSettings.custom_categories || [];
            const local = this.settings.customCategories || [];
            const merged = [...cloud];
            for (const cat of local) {
              if (!merged.some(c => c === cat || (c && cat && c.name === cat.name))) {
                merged.push(cat);
              }
            }
            return merged;
          })(),
          coins: dbSettings.coins || this.settings.coins || 0,
          claimedAchievements: dbSettings.claimed_achievements || this.settings.claimedAchievements || [],
          unlockedThemes: dbSettings.unlocked_themes || this.settings.unlockedThemes || ["light", "dark"],
          forgivenTransactions: dbSettings.forgiven_transactions || this.settings.forgivenTransactions || [],
          collectibles: dbSettings.collectibles || this.settings.collectibles || [],
          questsState: dbSettings.quests_state || this.settings.questsState || { date: null, firstIncome: false, stayClean: true, checkIn: false, claimed: [] },
        };
      } else {
        // No cloud settings, upload local settings
        const settingsPayload = {
          user_id: user.id,
          selected_currency: this.settings.selectedCurrency || 'THB',
          is_dark_mode: this.settings.isDarkMode !== undefined ? this.settings.isDarkMode : true,
          language: this.settings.language || 'th',
          tax_personal_deduction: this.settings.taxPersonalDeduction !== undefined ? this.settings.taxPersonalDeduction : 60000,
          tax_social_security: this.settings.taxSocialSecurity !== undefined ? this.settings.taxSocialSecurity : 9000,
          tax_provident_fund: this.settings.taxProvidentFund || 0,
          tax_mutual_funds: this.settings.taxMutualFunds || 0,
          tax_other_deductions: this.settings.taxOtherDeductions || 0,
          xp: this.settings.xp || 0,
          level: this.settings.level || 1,
          custom_categories: this.settings.customCategories || [],
          coins: this.settings.coins || 0,
          claimed_achievements: this.settings.claimedAchievements || [],
          unlocked_themes: this.settings.unlockedThemes || ["light", "dark"],
          forgiven_transactions: this.settings.forgivenTransactions || [],
          collectibles: this.settings.collectibles || [],
          quests_state: this.settings.questsState || { date: null, firstIncome: false, stayClean: true, checkIn: false, claimed: [] },
        };
        await supabase.from('user').upsert(settingsPayload);
      }

      // --- TRANSACTIONS SYNC (Two-Way Merge) ---
      const localTxsMap = new Map(this.transactions.map(t => [t.id, t]));
      const cloudTxsMap = new Map((dbTransactions || []).map(t => [t.id, t]));

      const txsToUpload = [];
      
      // Check which local transactions need to be uploaded
      for (const [id, localTx] of localTxsMap) {
        if (!cloudTxsMap.has(id)) {
          txsToUpload.push({
            id: localTx.id,
            user_id: user.id,
            title: localTx.title,
            amount: localTx.amount,
            is_income: localTx.isIncome,
            category: localTx.category,
            date: localTx.date instanceof Date ? localTx.date.toISOString() : new Date(localTx.date).toISOString(),
            recurring_id: localTx.recurringId || null
          });
        }
      }

      // Add cloud transactions that do not exist locally
      for (const [id, cloudTx] of cloudTxsMap) {
        if (!localTxsMap.has(id)) {
          this.transactions.push({
            id: cloudTx.id,
            title: cloudTx.title,
            amount: parseFloat(cloudTx.amount),
            isIncome: cloudTx.is_income,
            category: cloudTx.category,
            date: new Date(cloudTx.date),
            recurringId: cloudTx.recurring_id
          });
        }
      }

      // Upload new local transactions to Supabase
      if (txsToUpload.length > 0) {
        const { error: uploadError } = await supabase.from('transactions').insert(txsToUpload);
        if (uploadError) console.error("Error uploading transactions:", uploadError);
      }

      // --- RECURRING RULES SYNC (Two-Way Merge) ---
      const localRulesMap = new Map(this.recurringRules.map(r => [r.id, r]));
      const cloudRulesMap = new Map((dbRules || []).map(r => [r.id, r]));

      const rulesToUpload = [];

      // Check which local rules need to be uploaded
      for (const [id, localRule] of localRulesMap) {
        if (!cloudRulesMap.has(id)) {
          rulesToUpload.push({
            id: localRule.id,
            user_id: user.id,
            title: localRule.title,
            amount: localRule.amount,
            is_income: localRule.isIncome,
            category: localRule.category,
            type: localRule.type,
            custom_days: localRule.customDays,
            next_due_date: localRule.nextDueDate instanceof Date ? localRule.nextDueDate.toISOString() : new Date(localRule.nextDueDate).toISOString(),
            is_active: localRule.isActive,
            created_at: localRule.createdAt instanceof Date ? localRule.createdAt.toISOString() : new Date(localRule.createdAt).toISOString()
          });
        }
      }

      // Add cloud rules that do not exist locally
      for (const [id, cloudRule] of cloudRulesMap) {
        if (!localRulesMap.has(id)) {
          this.recurringRules.push({
            id: cloudRule.id,
            title: cloudRule.title,
            amount: parseFloat(cloudRule.amount),
            isIncome: cloudRule.is_income,
            category: cloudRule.category,
            type: cloudRule.type,
            customDays: cloudRule.custom_days,
            nextDueDate: new Date(cloudRule.next_due_date),
            isActive: cloudRule.is_active,
            createdAt: new Date(cloudRule.created_at)
          });
        }
      }

      // Upload new local rules to Supabase
      if (rulesToUpload.length > 0) {
        const { error: uploadRulesError } = await supabase.from('recurring_rules').insert(rulesToUpload);
        if (uploadRulesError) console.error("Error uploading recurring rules:", uploadRulesError);
      }

      // --- PROCESS RECURRING PAYMENTS with cloud rules now merged ---
      // Run again so any cloud-only recurring rules generate transactions if overdue
      this.processRecurringPayments();

      // --- DYNAMIC XP CALCULATION ---
      this.recalculateXP();

      // Save merged data to LocalStorage
      localStorage.setItem("fintrack_transactions", JSON.stringify(this.transactions));
      localStorage.setItem("fintrack_recurring_rules", JSON.stringify(this.recurringRules));
      localStorage.setItem("fintrack_settings", JSON.stringify(this.settings));

      // --- NOTIFY UI to re-render with synced data ---
      this.notify();
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
        tax_other_deductions: this.settings.taxOtherDeductions,
        xp: this.settings.xp,
        level: this.settings.level,
        custom_categories: this.settings.customCategories || [],
        coins: this.settings.coins || 0,
        claimed_achievements: this.settings.claimedAchievements || [],
        unlocked_themes: this.settings.unlockedThemes || ["light", "dark"],
        forgiven_transactions: this.settings.forgivenTransactions || [],
        collectibles: this.settings.collectibles || [],
        quests_state: this.settings.questsState || { date: null, firstIncome: false, stayClean: true, checkIn: false, claimed: [] },
      };
      await supabase.from('user').upsert(payload);
    }
  },

  clearUserData() {
    this.user = null;
    this.transactions = [];
    this.recurringRules = [];
    this.downPayments = [];
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
      dataVersion: 4,
      customCategories: [],
      coins: 0,
      claimedAchievements: [],
      unlockedThemes: ["light", "dark"],
      forgivenTransactions: [],
      collectibles: [],
      questsState: { date: null, firstIncome: false, stayClean: true, checkIn: false, claimed: [] },
    };
    localStorage.removeItem("fintrack_transactions");
    localStorage.removeItem("fintrack_recurring_rules");
    localStorage.removeItem("fintrack_settings");
    localStorage.removeItem("fintrack_net_worth");
    localStorage.removeItem("fintrack_down_payments");
  },

  async deleteCloudData() {
    if (!this.user) return;
    try {
      const userId = this.user.id;
      await supabase.from('transactions').delete().eq('user_id', userId);
      await supabase.from('recurring_rules').delete().eq('user_id', userId);
      await supabase.from('user').delete().eq('user_id', userId);
      
      // Clear local data as well
      this.transactions = [];
      this.recurringRules = [];
      localStorage.removeItem("fintrack_transactions");
      localStorage.removeItem("fintrack_recurring_rules");
      
      console.log('Cloud and local data deleted successfully for user:', userId);
      this.notify();
    } catch (err) {
      console.error('Error deleting cloud data:', err);
      throw err;
    }
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
      title: t.title || i18n("untitledTransaction"),
      amount: parseFloat(t.amount) || 0,
      isIncome: !!t.isIncome,
      category: t.category || "Other",
      date: t.date ? new Date(t.date) : new Date(),
      recurringId: t.recurringId || null,
    };
    this.transactions.push(transaction);
    this.checkQuests();
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
      transaction.isIncome ? i18n("notiSavedIncome") : i18n("notiSavedExpense"),
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

  // --- Down payment plans API ---
  getDownPayments() {
    return [...this.downPayments].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate - b.dueDate;
    });
  },

  addDownPayment(plan) {
    const totalAmount = parseFloat(plan.totalAmount) || 0;
    const paidAmount = Math.min(parseFloat(plan.paidAmount) || 0, totalAmount);
    this.downPayments.push({
      id: Math.random().toString(36).substring(2, 11),
      title: plan.title?.trim() || i18n("untitledDownPayment"),
      totalAmount,
      paidAmount,
      dueDate: plan.dueDate ? new Date(`${plan.dueDate}T12:00:00`) : null,
      createdAt: new Date(),
    });
    this.save();
  },

  recordDownPayment(id, amount) {
    const plan = this.downPayments.find((item) => item.id === id);
    if (!plan) return;
    plan.paidAmount = Math.min(plan.totalAmount, plan.paidAmount + (parseFloat(amount) || 0));
    this.save();
  },

  deleteDownPayment(id) {
    this.downPayments = this.downPayments.filter((plan) => plan.id !== id);
    this.save();
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
      title: rule.title || i18n("untitledRecurring"),
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
      i18n("notiRecurringSetTitle"),
      i18n("notiRecurringSetBody", { title: newRule.title }),
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
        i18n("notiAutoPayTitle"),
        i18n("notiAutoPayBody", { count: addedCount }),
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
    const level = this.settings.level || 1;
    const availableThemes = ["light", "dark"];
    if (level >= 5) availableThemes.push("midnight");
    if (level >= 10) availableThemes.push("cyberpunk");
    if (level >= 15) availableThemes.push("gold");

    const currentTheme = this.settings.theme || (this.settings.isDarkMode ? "dark" : "light");
    let nextIndex = availableThemes.indexOf(currentTheme) + 1;
    if (nextIndex >= availableThemes.length) nextIndex = 0;

    this.settings.theme = availableThemes[nextIndex];
    this.settings.isDarkMode = this.settings.theme !== "light"; // for backward compatibility
    
    document.documentElement.setAttribute("data-theme", this.settings.theme);
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
